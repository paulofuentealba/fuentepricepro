import type { AssetType, Currency } from "@/lib/domain";

export type DecisionKind = "buy" | "sell";

export type DecisionVerdict =
  | "above_ceiling"
  | "yield_trap"
  | "great_entry"
  | "fair_entry"
  | "no_data"
  | "realized_gain"
  | "realized_loss"
  | "neutral";

export interface DecisionLogEntry {
  /** = the originating Transaction.id — never a separate document identity. */
  id: string;
  ticker: string;
  name: string;
  assetType: AssetType;
  currency: Currency;
  kind: DecisionKind;
  date: number; // ms timestamp, = Transaction.date
  quantity: number;
  pricePerShare: number;
  /** Fuente Consensus at the moment of purchase, frozen in Transaction.thesisSnapshot at
   * confirmation time. Null when the transaction predates thesisSnapshot capture or valuation
   * was unavailable that day — never backfilled with today's consensus (Regra 4: a frozen
   * number must stay frozen, not be silently "corrected" to a live one). Always null for sells. */
  consensusAtDecision: number | null;
  marginAtDecision: number | null;
  yieldTrapAtDecision: boolean;
  /** Only meaningful for kind === "sell" — proceeds minus cost basis for this specific lot,
   * from calculateRealizedGains (the SSOT). Null for buys. */
  realizedGainNative: number | null;
  verdict: DecisionVerdict;
  /** (consensusAtDecision - price) * quantity for buys; realizedGainNative for sells. Always in
   * the position's native currency. */
  effectNative: number;
  feesNative: number;
  /** Marginal capital-gains tax attributable to this specific sale (BRL), computed via the same
   * SSOT engine as the Withdraw screen replayed across full transaction history. Always 0 for
   * buys — no capital-gains/purchase tax on BR equity/fund purchases (IOF de câmbio on USD buys
   * is out of scope for v1, see plan notes). */
  taxBRL: number;
  feesBRL: number;
  /** All-in total in BRL: cost desembolsado (buy) or líquido recebido (sell). */
  totalBRL: number;
}

export interface DecisionLogSummary {
  entries: DecisionLogEntry[];
  /** Buys with verdict "above_ceiling" or "yield_trap" — what paying above consensus cost. */
  overpaidCount: number;
  overpaidTotalBRL: number;
  totalFeesBRL: number;
  totalTaxBRL: number;
  totalBoughtBRL: number;
  totalSoldNetBRL: number;
}
