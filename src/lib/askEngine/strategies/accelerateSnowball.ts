import type { AskStrategyContext, Strategy, StrategyCandidate } from "../types";

/**
 * Strategy: Accelerate Snowball (Acelerar Bola de Neve)
 *
 * Pure strategy that maximizes passive income growth by allocating available capital
 * to the highest net dividend yield assets among eligible positions.
 *
 * Consumes `pos.valuation.dividendYield` directly from the SSOT (which is already
 * 100% net of applicable taxes for all BR/US assets).
 */
export function runAccelerateSnowball(ctx: AskStrategyContext): StrategyCandidate[] {
  const { eligiblePositions, availableAmount } = ctx;

  if (!eligiblePositions || eligiblePositions.length === 0 || availableAmount <= 0) {
    return [];
  }

  // 1. Rank eligible positions strictly by net dividendYield descending
  // Deterministic tie-breaker by ticker alphabetically
  const sorted = [...eligiblePositions].sort((a, b) => {
    const yieldA = a.valuation?.dividendYield ?? 0;
    const yieldB = b.valuation?.dividendYield ?? 0;
    const diff = yieldB - yieldA;
    if (Math.abs(diff) > 1e-4) return diff;
    return a.ticker.localeCompare(b.ticker);
  });

  const candidates: StrategyCandidate[] = [];
  let remainingBudget = availableAmount;

  // 2. Allocate integer shares starting with the highest net yield
  for (const pos of sorted) {
    if (remainingBudget <= 0) break;
    const price = pos.livePrice ?? pos.currentPrice ?? 0;
    if (price <= 0 || price > remainingBudget) continue;

    const qty = Math.floor(remainingBudget / price);
    if (qty <= 0) continue;

    const spent = qty * price;
    remainingBudget -= spent;

    const netYield = pos.valuation?.dividendYield ?? 0;

    candidates.push({
      ticker: pos.ticker,
      suggestedQuantity: qty,
      reasonKey: "askEngine.reasons.highestNetYield",
      reasonParams: {
        yield: Number(netYield.toFixed(2)),
      },
    });
  }

  return candidates;
}

export const accelerateSnowballStrategy: Strategy = {
  id: "accelerateSnowball",
  labelKey: "askEngine.strategies.accelerateSnowball",
  requiresTargets: false,
  run: runAccelerateSnowball,
};
