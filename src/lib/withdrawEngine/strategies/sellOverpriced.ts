import type { WithdrawCandidate, WithdrawStrategy, WithdrawStrategyContext } from "../types";
import { resolveWithdrawTaxTrack } from "../simulateSaleTax";

/**
 * Orders sell candidates by how far ABOVE the Fuente Consensus ceiling they trade — the most
 * overpriced position (most negative margin) first. Positions with no resolvable margin sort
 * last (no signal either way, not treated as "cheap").
 */
export const sellOverpricedStrategy: WithdrawStrategy = {
  id: "sellOverpriced",
  labelKey: "askScreen.withdrawStrategySellOverpriced",
  run(ctx: WithdrawStrategyContext): WithdrawCandidate[] {
    const { eligiblePositions } = ctx;

    const ranked = eligiblePositions
      .filter((pos) => resolveWithdrawTaxTrack(pos.type, pos.currency) !== null)
      .map((pos) => ({
        pos,
        margin: typeof pos.valuation?.margin === "number" ? pos.valuation.margin : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => a.margin - b.margin);

    return ranked.map(({ pos, margin }) => ({
      ticker: pos.ticker,
      reasonKey: "withdrawEngine.reasons.aboveCeiling",
      reasonParams: Number.isFinite(margin) ? { margin: Number(margin.toFixed(1)) } : undefined,
    }));
  },
};
