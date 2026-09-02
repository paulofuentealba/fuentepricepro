import type { AssetType } from "@/lib/domain";
import { getDisplayAssetType } from "@/lib/formatters";
import { computeClassAllocationState } from "@/lib/portfolioAllocationState";
import type { AskStrategyContext, Strategy, StrategyCandidate } from "../types";

/**
 * Strategy: Balance Targets (Reequilíbrio de Metas)
 *
 * Pure strategy that identifies asset classes furthest below the user's
 * configured `smartAllocationTargets`, ranking top assets in those classes
 * by safety margin.
 */
export function runBalanceTargets(ctx: AskStrategyContext): StrategyCandidate[] {
  const { eligiblePositions, availableAmount, settings } = ctx;

  if (!eligiblePositions || eligiblePositions.length === 0 || availableAmount <= 0) {
    return [];
  }

  // 1-2. Current allocation state per class + projected deficit (SSOT, shared with the Screener).
  const allocationState = computeClassAllocationState(
    eligiblePositions,
    settings.smartAllocationTargets,
  );
  if (allocationState.size === 0) {
    return [];
  }

  const projectedTotal = (allocationState.values().next().value?.totalCurrentValue ?? 0) + availableAmount;

  interface ClassDeficit {
    type: AssetType;
    targetPct: number;
    currentValue: number;
    targetValue: number;
    deficit: number;
  }

  const deficits: ClassDeficit[] = [];

  for (const state of allocationState.values()) {
    const targetValue = projectedTotal * state.targetPct;
    deficits.push({
      type: state.type,
      targetPct: state.targetPct,
      currentValue: state.currentValue,
      targetValue,
      deficit: targetValue - state.currentValue,
    });
  }

  // Sort classes by highest deficit first.
  // Deterministic tie-breaker by class name.
  deficits.sort((a, b) => {
    const diff = b.deficit - a.deficit;
    if (Math.abs(diff) > 1e-6) return diff;
    return a.type.localeCompare(b.type);
  });

  const candidates: StrategyCandidate[] = [];
  let remainingBudget = availableAmount;

  // 3. For each prioritized class, select top eligible assets
  for (const classDeficit of deficits) {
    if (remainingBudget <= 0) break;

    const classPositions = eligiblePositions.filter(
      (p) => getDisplayAssetType(p.type) === classDeficit.type,
    );
    if (classPositions.length === 0) continue;

    // Rank assets within the class by highest safety margin first, breaking ties by ticker alphabetically
    const sortedPositions = [...classPositions].sort((a, b) => {
      const marginA = a.valuation?.margin ?? a.safetyMargin ?? 0;
      const marginB = b.valuation?.margin ?? b.safetyMargin ?? 0;
      const diff = marginB - marginA;
      if (Math.abs(diff) > 1e-4) return diff;
      return a.ticker.localeCompare(b.ticker);
    });

    // Budget assigned to this class (up to its deficit or remaining budget)
    const classBudget = classDeficit.deficit > 0
      ? Math.min(classDeficit.deficit, remainingBudget)
      : remainingBudget;

    let classBudgetRemaining = classBudget;

    for (const pos of sortedPositions) {
      if (classBudgetRemaining <= 0 || remainingBudget <= 0) break;
      const price = pos.livePrice ?? pos.currentPrice ?? 0;
      if (price <= 0 || price > classBudgetRemaining) continue;

      const qty = Math.floor(classBudgetRemaining / price);
      if (qty <= 0) continue;

      const spent = qty * price;
      classBudgetRemaining -= spent;
      remainingBudget -= spent;

      const margin = pos.valuation?.margin ?? pos.safetyMargin ?? 0;

      candidates.push({
        ticker: pos.ticker,
        suggestedQuantity: qty,
        reasonKey: "askEngine.reasons.farthestBelowTarget",
        reasonParams: {
          classType: pos.type,
          margin: Number(margin.toFixed(1)),
        },
      });
    }
  }

  return candidates;
}

export const balanceTargetsStrategy: Strategy = {
  id: "balanceTargets",
  labelKey: "askEngine.strategies.balanceTargets",
  requiresTargets: true,
  run: runBalanceTargets,
};
