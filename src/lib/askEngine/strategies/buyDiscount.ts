import type { AskStrategyContext, Strategy, StrategyCandidate } from "../types";

/**
 * Strategy: Buy Discount (Comprar Desconto)
 *
 * Pure strategy that prioritizes eligible positions with the largest safety
 * margin (biggest discount to the active ceiling price), allocating available
 * capital starting with the deepest discount.
 *
 * Reuses the exact live margin precedence already established in
 * `applyExclusions.ts` (`pos.valuation?.margin ?? pos.safetyMargin ?? 0`) —
 * no new margin formula is introduced here.
 */
export function runBuyDiscount(ctx: AskStrategyContext): StrategyCandidate[] {
  const { eligiblePositions, availableAmount } = ctx;

  if (!eligiblePositions || eligiblePositions.length === 0 || availableAmount <= 0) {
    return [];
  }

  // 1. Rank eligible positions strictly by safety margin descending
  // Deterministic tie-breaker by ticker alphabetically
  const sorted = [...eligiblePositions].sort((a, b) => {
    const marginA = a.valuation?.margin ?? a.safetyMargin ?? 0;
    const marginB = b.valuation?.margin ?? b.safetyMargin ?? 0;
    const diff = marginB - marginA;
    if (Math.abs(diff) > 1e-4) return diff;
    return a.ticker.localeCompare(b.ticker);
  });

  const candidates: StrategyCandidate[] = [];
  let remainingBudget = availableAmount;

  // 2. Allocate integer shares starting with the deepest discount
  for (const pos of sorted) {
    if (remainingBudget <= 0) break;
    const price = pos.livePrice ?? pos.currentPrice ?? 0;
    if (price <= 0 || price > remainingBudget) continue;

    const qty = Math.floor(remainingBudget / price);
    if (qty <= 0) continue;

    const spent = qty * price;
    remainingBudget -= spent;

    const margin = pos.valuation?.margin ?? pos.safetyMargin ?? 0;

    candidates.push({
      ticker: pos.ticker,
      suggestedQuantity: qty,
      reasonKey: "askEngine.reasons.positiveSafetyMargin",
      reasonParams: {
        margin: Number(margin.toFixed(2)),
      },
    });
  }

  return candidates;
}

export const buyDiscountStrategy: Strategy = {
  id: "buyDiscount",
  labelKey: "askEngine.strategies.buyDiscount",
  requiresTargets: false,
  run: runBuyDiscount,
};
