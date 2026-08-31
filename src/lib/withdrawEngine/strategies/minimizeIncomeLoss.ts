import type { WithdrawCandidate, WithdrawStrategy, WithdrawStrategyContext } from "../types";
import { resolveWithdrawTaxTrack } from "../simulateSaleTax";

/**
 * Orders sell candidates to preserve future passive income: sells the lowest dividend-yield-on-
 * cost position first, so the highest-yielding positions (the ones doing the most work toward
 * the user's income goal) are the last to be touched.
 */
export const minimizeIncomeLossStrategy: WithdrawStrategy = {
  id: "minimizeIncomeLoss",
  labelKey: "askScreen.withdrawStrategyMinimizeIncomeLoss",
  run(ctx: WithdrawStrategyContext): WithdrawCandidate[] {
    const { eligiblePositions } = ctx;

    const ranked = eligiblePositions
      .filter((pos) => resolveWithdrawTaxTrack(pos.type, pos.currency) !== null)
      .map((pos) => {
        const avgPrice = typeof pos.averagePrice === "number" && pos.averagePrice > 0 ? pos.averagePrice : pos.livePrice ?? pos.currentPrice ?? 0;
        const dyOnCost = avgPrice > 0 ? (pos.annualDividend ?? 0) / avgPrice : 0;
        return { pos, dyOnCost };
      })
      .sort((a, b) => a.dyOnCost - b.dyOnCost);

    return ranked.map(({ pos }) => ({
      ticker: pos.ticker,
      reasonKey: "withdrawEngine.reasons.lowestYieldOnCost",
    }));
  },
};
