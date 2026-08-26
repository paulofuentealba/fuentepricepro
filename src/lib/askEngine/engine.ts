import { applyExclusions } from "./applyExclusions";
import type {
  AskContext,
  AskResult,
  AskResultState,
  Allocation,
  Consequence,
  Strategy,
  StrategyCandidate,
} from "./types";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

/**
 * Calculates integer percentages deterministically using the Hare-Niemeyer (Largest Remainder) Method.
 * Guarantees that sum(percentOfTotal) exactly matches the allocated portion of the available budget.
 */
export function calculateAllocationPercentages(
  allocations: { ticker: string; amountBRL: number }[],
  availableAmount: number,
): number[] {
  if (allocations.length === 0 || availableAmount <= 0) {
    return [];
  }

  const totalSpent = allocations.reduce((sum, a) => sum + a.amountBRL, 0);
  const targetTotalPercent = Math.min(100, Math.round((totalSpent / availableAmount) * 100));

  const floors: number[] = [];
  const remainders: { index: number; ticker: string; remainder: number }[] = [];
  let sumFloors = 0;

  for (let i = 0; i < allocations.length; i++) {
    const exact = (allocations[i].amountBRL / availableAmount) * 100;
    const floor = Math.floor(exact);
    floors.push(floor);
    sumFloors += floor;
    remainders.push({
      index: i,
      ticker: allocations[i].ticker,
      remainder: exact - floor,
    });
  }

  const remainderCount = targetTotalPercent - sumFloors;
  if (remainderCount > 0) {
    remainders.sort((a, b) => {
      const diff = b.remainder - a.remainder;
      if (Math.abs(diff) > 1e-9) return diff;
      return a.ticker.localeCompare(b.ticker);
    });

    for (let k = 0; k < remainderCount && k < remainders.length; k++) {
      floors[remainders[k].index] += 1;
    }
  }

  return floors;
}

/**
 * Executes a decision strategy in a pure, deterministic pipeline.
 *
 * Pipeline:
 * 1. Checks prerequisites (budget > 0, smartAllocationTargets configured if required).
 * 2. Applies centralized exclusions (applyExclusions).
 * 3. Dispatches eligible positions to Strategy.run.
 * 4. Resolves integer share sizing, amountBRL, and leftover.
 * 5. Applies Largest Remainder Method to allocate exact integer percentages.
 * 6. Calculates consequences (e.g. annual dividend added).
 * 7. Formally verifies the core invariant: sum(allocations) + leftover === availableAmount.
 */
export function runAsk(ctx: AskContext, strategy: Strategy): AskResult {
  const { positions = [], availableAmount = 0, settings, asOf } = ctx || {};

  // 1. Budget Guard
  if (!Number.isFinite(availableAmount) || availableAmount <= 0) {
    return {
      state: "insufficient_funds",
      allocations: [],
      leftover: 0,
      excluded: [],
      consequences: [],
    };
  }

  // 2. Targets Configuration Guard
  const requiresTargets = strategy.requiresTargets !== false;
  if (requiresTargets) {
    const targets = settings?.smartAllocationTargets;
    const totalTargetWeight = targets
      ? Object.values(targets).reduce(
          (sum: number, w) => sum + (typeof w === "number" && w > 0 ? w : 0),
          0,
        )
      : 0;

    if (totalTargetWeight <= 0) {
      return {
        state: "targets_not_configured",
        allocations: [],
        leftover: availableAmount,
        excluded: [],
        consequences: [],
      };
    }
  }

  // 3. Centralized Exclusions Filter
  const { eligible, excluded } = applyExclusions(positions, settings || {});

  if (eligible.length === 0) {
    return {
      state: "no_eligible_assets",
      allocations: [],
      leftover: availableAmount,
      excluded,
      consequences: [],
    };
  }

  // 4. Run Strategy (pure intent & ranking)
  const candidates: StrategyCandidate[] = strategy.run({
    eligiblePositions: eligible,
    availableAmount,
    settings: settings || {},
    asOf: asOf || new Date().toISOString(),
    sourceTicker: ctx?.sourceTicker,
  });

  const positionMap = new Map<string, ValuedWatchlistItem>();
  for (const pos of eligible) {
    positionMap.set(pos.ticker, pos);
  }

  const rawAllocations: Array<Omit<Allocation, "percentOfTotal">> = [];
  let remainingBudget = availableAmount;

  // 5. Mechanical Sizing & Budget Enforcement
  for (const candidate of candidates) {
    if (!candidate || typeof candidate.ticker !== "string") continue;
    if (remainingBudget <= 0) break;

    const pos = positionMap.get(candidate.ticker);
    if (!pos) continue;

    const livePrice = pos.livePrice ?? pos.currentPrice ?? 0;
    if (livePrice <= 0 || livePrice > remainingBudget) continue;

    // Sizing Precedence Rule
    let qty = 0;
    if (typeof candidate.suggestedQuantity === "number" && candidate.suggestedQuantity > 0) {
      qty = Math.floor(candidate.suggestedQuantity);
    } else if (typeof candidate.allocatedAmount === "number" && candidate.allocatedAmount > 0) {
      qty = Math.floor(candidate.allocatedAmount / livePrice);
    }

    if (qty <= 0) continue;

    // Cap by remaining budget
    const maxQtyForBudget = Math.floor(remainingBudget / livePrice);
    const finalQty = Math.min(qty, maxQtyForBudget);
    if (finalQty <= 0) continue;

    const amountBRL = finalQty * livePrice;
    remainingBudget -= amountBRL;

    rawAllocations.push({
      ticker: pos.ticker,
      amountBRL: Number(amountBRL.toFixed(2)),
      quantity: finalQty,
      reasonKey: candidate.reasonKey,
      reasonParams: candidate.reasonParams,
    });
  }

  const totalSpent = rawAllocations.reduce((sum, a) => sum + a.amountBRL, 0);
  const leftover = Number((availableAmount - totalSpent).toFixed(2));

  // 6. State Determination
  let state: AskResultState = "success";
  if (rawAllocations.length === 0) {
    state = "insufficient_funds";
  }

  // 7. Calculate Percentages via Largest Remainder
  const percentages = calculateAllocationPercentages(rawAllocations, availableAmount);
  const allocations: Allocation[] = rawAllocations.map((a, idx) => ({
    ...a,
    percentOfTotal: percentages[idx] || 0,
  }));

  // 8. Consequences (e.g. Annual Income Added)
  const consequences: Consequence[] = [];
  let annualIncomeAdded = 0;

  for (const alloc of allocations) {
    const pos = positionMap.get(alloc.ticker);
    const annualDiv = pos?.annualDividend ?? 0;
    if (annualDiv > 0 && alloc.quantity > 0) {
      annualIncomeAdded += alloc.quantity * annualDiv;
    }
  }

  if (annualIncomeAdded > 0) {
    consequences.push({
      kind: "income",
      valueKey: "askEngine.consequences.annualIncomeAdded",
      value: Number(annualIncomeAdded.toFixed(2)),
    });
  }

  // 9. Invariant Assertion Check
  const invariantSum = totalSpent + leftover;
  const invariantDiscrepancy = Math.abs(invariantSum - availableAmount);
  if (invariantDiscrepancy > 0.05) {
    console.error(
      `[AskEngine] Invariant violation: totalSpent (${totalSpent}) + leftover (${leftover}) !== availableAmount (${availableAmount})`,
    );
  }

  return {
    state,
    allocations,
    leftover,
    excluded,
    consequences,
  };
}
