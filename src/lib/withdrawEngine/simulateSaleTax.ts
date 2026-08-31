import { calculateMonthlyCapitalGainsTax } from "@/lib/tax/br/monthlyExemption";
import { calculateFiiCapitalGainsTax } from "@/lib/tax/br/fiiCapitalGains";
import { calculateEtfCapitalGainsTax } from "@/lib/tax/br/etfCapitalGains";
import { simulateForeignCapitalGainsTax } from "@/lib/tax/exterior/foreignCapitalGains";
import type { AssetType, Currency } from "@/lib/domain";
import type { RealizedGainEvent } from "@/lib/tax/types";
import type { WithdrawTaxState, WithdrawTaxTrack } from "./types";

/**
 * Resolves which SSOT capital-gains module a lot sale belongs to. Never assumes a type when the
 * ticker's assetType/currency can't be resolved — the caller is responsible for excluding those
 * candidates upstream (mirrors the "unclassifiedTickers" discipline of the tax modules).
 */
export function resolveWithdrawTaxTrack(
  assetType: AssetType | undefined,
  currency: Currency | undefined,
): WithdrawTaxTrack | null {
  switch (assetType) {
    case "STOCK_BR":
      return "STOCK_BR";
    case "FII":
    case "FIAGRO":
      return "FII";
    case "FII_INFRA":
      return "FII_INFRA";
    case "ETF":
      return currency === "USD" ? "FOREIGN" : "ETF_BR";
    case "STOCK_US":
    case "REIT":
      return "FOREIGN";
    default:
      // FIXED_INCOME and unresolvable types are out of scope for this engine (see plan notes) —
      // they never reach a sale simulation.
      return null;
  }
}

export interface WithdrawPeriodSummary {
  taxDue: number;
  /** Only meaningful for STOCK_BR/FII/ETF_BR (each has its own dedicated carryforward track in
   * the SSOT modules). FOREIGN nets losses within the same year with no persisted carryforward
   * field, so it always reports 0 here — its within-year offsetting is already reflected in
   * `taxDue` itself (taxableGain = max(0, totalGain)). */
  lossCarryforwardUsed: number;
}

/**
 * Full result for the CURRENT period (month for STOCK_BR/FII/ETF_BR tracks, year for FOREIGN)
 * given a track's full event list (real history + any already-accepted simulated sales). Reads
 * off the LAST period in the SSOT function's chronological output, since `events` is always
 * sorted/replayed from the start of history — carryforward progression up to "now" is handled
 * entirely inside the SSOT function, never recomputed here.
 */
export function currentPeriodResult(
  track: WithdrawTaxTrack,
  events: RealizedGainEvent[],
  assetTypeByTicker: Map<string, AssetType>,
  currencyByTicker: Map<string, Currency>,
): WithdrawPeriodSummary {
  if (track === "FII_INFRA") return { taxDue: 0, lossCarryforwardUsed: 0 }; // Always exempt (Lei 12.431/2011 art. 3º).

  switch (track) {
    case "STOCK_BR": {
      const results = calculateMonthlyCapitalGainsTax(events, 0, assetTypeByTicker);
      const last = results[results.length - 1];
      return { taxDue: last?.taxDue ?? 0, lossCarryforwardUsed: last?.lossCarryforwardUsed ?? 0 };
    }
    case "FII": {
      const results = calculateFiiCapitalGainsTax(events, 0, assetTypeByTicker);
      const last = results[results.length - 1];
      return { taxDue: last?.taxDue ?? 0, lossCarryforwardUsed: last?.lossCarryforwardUsed ?? 0 };
    }
    case "ETF_BR": {
      const results = calculateEtfCapitalGainsTax(events, 0, assetTypeByTicker);
      const last = results[results.length - 1];
      return { taxDue: last?.taxDue ?? 0, lossCarryforwardUsed: last?.lossCarryforwardUsed ?? 0 };
    }
    case "FOREIGN": {
      const results = simulateForeignCapitalGainsTax(events, assetTypeByTicker, currencyByTicker);
      const last = results[results.length - 1];
      return { taxDue: last?.taxDue ?? 0, lossCarryforwardUsed: 0 };
    }
  }
}

/**
 * Marginal tax (in BRL) that adding `candidateEvent` on top of `acceptedEventsSoFar` (within its
 * own track) generates — i.e. taxDue(real + accepted + candidate) - taxDue(real + accepted).
 * This is what makes sell ORDER matter: the same lot can be free or taxed depending on what else
 * was already sold this period (monthly exemption, loss carryforward).
 */
export function computeMarginalTaxBRL(
  track: WithdrawTaxTrack,
  candidateEvent: RealizedGainEvent,
  acceptedEventsSoFarForTrack: RealizedGainEvent[],
  taxState: WithdrawTaxState,
): number {
  if (track === "FII_INFRA") return 0;

  const { realizedGainEvents, assetTypeByTicker, currencyByTicker, fxRate } = taxState;

  const before = currentPeriodResult(
    track,
    [...realizedGainEvents, ...acceptedEventsSoFarForTrack],
    assetTypeByTicker,
    currencyByTicker,
  ).taxDue;
  const after = currentPeriodResult(
    track,
    [...realizedGainEvents, ...acceptedEventsSoFarForTrack, candidateEvent],
    assetTypeByTicker,
    currencyByTicker,
  ).taxDue;

  const deltaNative = Math.max(0, after - before);
  // Only the FOREIGN track is denominated in a non-BRL native currency (USD) — BR tracks already
  // compute taxDue in BRL.
  const deltaBRL = track === "FOREIGN" ? deltaNative * fxRate : deltaNative;
  return Math.round(deltaBRL * 100) / 100;
}
