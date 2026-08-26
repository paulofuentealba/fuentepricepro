import type { AskStrategyContext, Strategy, StrategyCandidate } from "../types";

/**
 * Strategy: Reinforce Payer (Reforçar Quem Pagou)
 *
 * Pure strategy for reinvesting dividends directly into the asset that paid them.
 *
 * Behavioral rules:
 * 1. If `sourceTicker` is absent -> returns [] (empty candidates).
 * 2. If `sourceTicker` was excluded by user criteria (above ceiling, yield trap)
 *    or not found in eligible positions -> returns [] without silent fallback.
 * 3. If eligible -> allocates maximum whole shares within availableAmount.
 */
export function runReinforcePayer(ctx: AskStrategyContext): StrategyCandidate[] {
  const { eligiblePositions, availableAmount, sourceTicker } = ctx;

  if (!sourceTicker || !eligiblePositions || eligiblePositions.length === 0 || availableAmount <= 0) {
    return [];
  }

  const cleanSourceTicker = sourceTicker.trim().toUpperCase();
  const payer = eligiblePositions.find(
    (p) => p.ticker?.trim().toUpperCase() === cleanSourceTicker,
  );

  // If the payer was excluded by criteria or not present in the portfolio,
  // do NOT fall back to another asset.
  if (!payer) {
    return [];
  }

  const price = payer.livePrice ?? payer.currentPrice ?? 0;
  if (price <= 0 || price > availableAmount) {
    return [];
  }

  const qty = Math.floor(availableAmount / price);
  if (qty <= 0) {
    return [];
  }

  return [
    {
      ticker: payer.ticker,
      suggestedQuantity: qty,
      reasonKey: "askEngine.reasons.reinforcePayer",
      reasonParams: {
        ticker: payer.ticker,
      },
    },
  ];
}

export const reinforcePayerStrategy: Strategy = {
  id: "reinforcePayer",
  labelKey: "askEngine.strategies.reinforcePayer",
  requiresTargets: false,
  run: runReinforcePayer,
};
