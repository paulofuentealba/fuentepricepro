import type { WithdrawCandidate, WithdrawStrategy, WithdrawStrategyContext } from "../types";
import { resolveWithdrawTaxTrack } from "../simulateSaleTax";

/**
 * Orders sell candidates to minimize the REAL marginal tax the engine will compute — this
 * strategy only decides ORDER, `runWithdraw` is what actually prices each lot via the SSOT tax
 * modules. Heuristic (not an exhaustive combinatorial search, which would be worse than a good
 * heuristic for a UI that must respond instantly):
 * 1. FII_INFRA lots first — always 0% tax (Lei 12.431/2011), free cash regardless of order.
 * 2. Loss-making lots next (biggest loss first) — realizing a loss never costs tax and builds
 *    carryforward that reduces the tax of gain lots processed afterward in this same run.
 * 3. STOCK_BR gain lots, smallest proceeds first — maximizes the chance the R$20k/month sales
 *    exemption (all-or-nothing on TOTAL proceeds, not profit) is never crossed.
 * 4. Remaining gain lots (FII/FIAGRO, ETF_BR, foreign), smallest gain first.
 */
export const minimizeTaxStrategy: WithdrawStrategy = {
  id: "minimizeTax",
  labelKey: "askScreen.withdrawStrategyMinimizeTax",
  run(ctx: WithdrawStrategyContext): WithdrawCandidate[] {
    const { eligiblePositions } = ctx;

    const fiiInfra: typeof eligiblePositions = [];
    const losses: typeof eligiblePositions = [];
    const stockGains: typeof eligiblePositions = [];
    const otherGains: typeof eligiblePositions = [];

    for (const pos of eligiblePositions) {
      const track = resolveWithdrawTaxTrack(pos.type, pos.currency);
      if (!track) continue;

      const avgPrice = typeof pos.averagePrice === "number" ? pos.averagePrice : 0;
      const livePrice = pos.livePrice ?? pos.currentPrice ?? 0;
      const estimatedGainPerShare = livePrice - avgPrice;

      if (track === "FII_INFRA") {
        fiiInfra.push(pos);
      } else if (estimatedGainPerShare < 0) {
        losses.push(pos);
      } else if (track === "STOCK_BR") {
        stockGains.push(pos);
      } else {
        otherGains.push(pos);
      }
    }

    const gainPerShare = (p: (typeof eligiblePositions)[number]) =>
      (p.livePrice ?? p.currentPrice ?? 0) - (typeof p.averagePrice === "number" ? p.averagePrice : 0);

    losses.sort((a, b) => gainPerShare(a) - gainPerShare(b)); // most negative (biggest loss) first
    stockGains.sort((a, b) => (a.livePrice ?? a.currentPrice ?? 0) - (b.livePrice ?? b.currentPrice ?? 0));
    otherGains.sort((a, b) => gainPerShare(a) - gainPerShare(b));

    const toCandidate = (
      pos: (typeof eligiblePositions)[number],
      reasonKey: string,
    ): WithdrawCandidate => ({ ticker: pos.ticker, reasonKey });

    return [
      ...fiiInfra.map((p) => toCandidate(p, "withdrawEngine.reasons.fiiInfraExempt")),
      ...losses.map((p) => toCandidate(p, "withdrawEngine.reasons.realizesLoss")),
      ...stockGains.map((p) => toCandidate(p, "withdrawEngine.reasons.stockWithinExemption")),
      ...otherGains.map((p) => toCandidate(p, "withdrawEngine.reasons.smallestTaxableGain")),
    ];
  },
};
