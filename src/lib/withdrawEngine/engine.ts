import type { RealizedGainEvent } from "@/lib/tax/types";
import { computeMarginalTaxBRL, currentPeriodResult, resolveWithdrawTaxTrack } from "./simulateSaleTax";
import type {
  WithdrawAllocation,
  WithdrawResult,
  WithdrawResultState,
  WithdrawStrategy,
  WithdrawStrategyContext,
  WithdrawTaxTrack,
} from "./types";

/** Same Hare-Niemeyer method askEngine uses, kept local since Withdraw sums proceeds (native
 * currency converted to BRL), not a single-currency budget like runAsk. */
function calculatePercentages(amountsBRL: number[], totalBRL: number): number[] {
  if (amountsBRL.length === 0 || totalBRL <= 0) return [];
  const targetTotalPercent = Math.min(
    100,
    Math.round((amountsBRL.reduce((s, a) => s + a, 0) / totalBRL) * 100),
  );
  const floors: number[] = [];
  const remainders: { index: number; remainder: number }[] = [];
  let sumFloors = 0;
  for (let i = 0; i < amountsBRL.length; i++) {
    const exact = (amountsBRL[i] / totalBRL) * 100;
    const floor = Math.floor(exact);
    floors.push(floor);
    sumFloors += floor;
    remainders.push({ index: i, remainder: exact - floor });
  }
  const remainderCount = targetTotalPercent - sumFloors;
  if (remainderCount > 0) {
    remainders.sort((a, b) => b.remainder - a.remainder);
    for (let k = 0; k < remainderCount && k < remainders.length; k++) {
      floors[remainders[k].index] += 1;
    }
  }
  return floors;
}

/**
 * Executes a sell-order decision strategy in a pure, deterministic pipeline — the sell-side
 * counterpart of askEngine's `runAsk`. Sizing is capped by shares OWNED (not budget/price like a
 * buy), and every accepted lot's tax is the real marginal SSOT-computed tax at its position in
 * the sell order, never a flat estimate.
 */
export function runWithdraw(ctx: WithdrawStrategyContext, strategy: WithdrawStrategy): WithdrawResult {
  const { eligiblePositions = [], neededAmountBRL = 0, taxState, asOf } = ctx || {};

  if (!Number.isFinite(neededAmountBRL) || neededAmountBRL <= 0) {
    return {
      state: "no_eligible_assets",
      allocations: [],
      leftoverBRL: 0,
      totalTaxBRL: 0,
      totalIncomeLostAnnualBRL: 0,
      lossCarryforwardUsedBRL: 0,
    };
  }

  if (eligiblePositions.length === 0) {
    return {
      state: "no_eligible_assets",
      allocations: [],
      leftoverBRL: neededAmountBRL,
      totalTaxBRL: 0,
      totalIncomeLostAnnualBRL: 0,
      lossCarryforwardUsedBRL: 0,
    };
  }

  const candidates = strategy.run(ctx);
  const positionMap = new Map(eligiblePositions.map((p) => [p.ticker, p]));
  const asOfMs = Date.parse(asOf) || Date.now();

  const allocationsRaw: Array<Omit<WithdrawAllocation, "percentOfTotal">> = [];
  const acceptedEventsByTrack = new Map<WithdrawTaxTrack, RealizedGainEvent[]>();
  let remainingNeededBRL = neededAmountBRL;

  for (const candidate of candidates) {
    if (remainingNeededBRL <= 0) break;
    const pos = positionMap.get(candidate.ticker);
    if (!pos) continue;

    const livePrice = pos.livePrice ?? pos.currentPrice ?? 0;
    const ownedQty = Math.max(0, Math.floor(pos.quantity || 0));
    if (livePrice <= 0 || ownedQty <= 0) continue;

    const track = resolveWithdrawTaxTrack(pos.type, pos.currency);
    if (!track) continue;

    const priceBRL = pos.currency === "USD" ? livePrice * taxState.fxRate : livePrice;
    if (priceBRL <= 0) continue;

    const maxQtyForNeed = Math.max(1, Math.ceil(remainingNeededBRL / priceBRL));
    const qty = Math.min(ownedQty, maxQtyForNeed);
    if (qty <= 0) continue;

    const avgPrice = typeof pos.averagePrice === "number" ? pos.averagePrice : 0;
    const proceeds = qty * livePrice;
    const costBasis = avgPrice * qty;
    const candidateEvent: RealizedGainEvent = {
      ticker: pos.ticker,
      saleDate: asOfMs,
      quantity: qty,
      salePrice: livePrice,
      proceeds,
      costBasis,
      gain: proceeds - costBasis,
      assetType: pos.type,
    };

    const acceptedSoFar = acceptedEventsByTrack.get(track) || [];
    const taxBRL = computeMarginalTaxBRL(track, candidateEvent, acceptedSoFar, taxState);
    acceptedEventsByTrack.set(track, [...acceptedSoFar, candidateEvent]);

    const amountNative = qty * livePrice;
    const amountBRL = pos.currency === "USD" ? amountNative * taxState.fxRate : amountNative;
    const annualDividendPerShare = pos.annualDividend ?? 0;
    const incomeLostNative = qty * annualDividendPerShare;
    const incomeLostAnnualBRL =
      pos.currency === "USD" ? incomeLostNative * taxState.fxRate : incomeLostNative;

    allocationsRaw.push({
      ticker: pos.ticker,
      quantity: qty,
      amountNative,
      currency: pos.currency,
      taxBRL,
      incomeLostAnnualBRL: Number(incomeLostAnnualBRL.toFixed(2)),
      reasonKey: candidate.reasonKey,
      reasonParams: candidate.reasonParams,
    });

    remainingNeededBRL = Number((remainingNeededBRL - amountBRL).toFixed(2));
  }

  const leftoverBRL = Math.max(0, remainingNeededBRL);
  let state: WithdrawResultState = "success";
  if (allocationsRaw.length === 0) {
    state = "no_eligible_assets";
  } else if (leftoverBRL > 0.01) {
    state = "insufficient_position";
  }

  const totalProceedsBRL = allocationsRaw.reduce(
    (sum, a) => sum + (a.currency === "USD" ? a.amountNative * taxState.fxRate : a.amountNative),
    0,
  );
  const percentages = calculatePercentages(
    allocationsRaw.map((a) => (a.currency === "USD" ? a.amountNative * taxState.fxRate : a.amountNative)),
    totalProceedsBRL,
  );
  const allocations: WithdrawAllocation[] = allocationsRaw.map((a, idx) => ({
    ...a,
    percentOfTotal: percentages[idx] || 0,
  }));

  const totalTaxBRL = Number(allocations.reduce((s, a) => s + a.taxBRL, 0).toFixed(2));
  const totalIncomeLostAnnualBRL = Number(
    allocations.reduce((s, a) => s + a.incomeLostAnnualBRL, 0).toFixed(2),
  );

  let lossCarryforwardUsedBRL = 0;
  for (const [track, events] of acceptedEventsByTrack.entries()) {
    if (events.length === 0) continue;
    const summary = currentPeriodResult(
      track,
      [...taxState.realizedGainEvents, ...events],
      taxState.assetTypeByTicker,
      taxState.currencyByTicker,
    );
    lossCarryforwardUsedBRL += summary.lossCarryforwardUsed;
  }
  lossCarryforwardUsedBRL = Number(lossCarryforwardUsedBRL.toFixed(2));

  return {
    state,
    allocations,
    leftoverBRL,
    totalTaxBRL,
    totalIncomeLostAnnualBRL,
    lossCarryforwardUsedBRL,
  };
}
