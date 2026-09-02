import type { Transaction } from "@/lib/transactions";
import type { WatchlistItem } from "@/lib/watchlist";
import type { AssetType, Currency } from "@/lib/domain";
import { calculateRealizedGains } from "@/lib/tax/br/capitalGains";
import { computeMarginalTaxBRL, resolveWithdrawTaxTrack } from "@/lib/withdrawEngine";
import type { WithdrawTaxTrack } from "@/lib/withdrawEngine";
import type { DecisionLogEntry, DecisionLogSummary, DecisionVerdict } from "./types";

const GREAT_ENTRY_MARGIN_THRESHOLD = 10; // % — matches the prototype's BBAS3/TAEE11 examples

/**
 * Exported (not just internal to the buy-decision log) so the Screener can reuse the exact same
 * verdict taxonomy prospectively — Regra 1: one verdict vocabulary, not a second one invented for
 * "would this be a good buy right now" vs. "was this a good buy historically".
 */
export function resolveBuyVerdict(marginAtDecision: number | null, yieldTrapAtDecision: boolean): DecisionVerdict {
  if (marginAtDecision == null) return "no_data";
  if (yieldTrapAtDecision) return "yield_trap";
  if (marginAtDecision < 0) return "above_ceiling";
  if (marginAtDecision >= GREAT_ENTRY_MARGIN_THRESHOLD) return "great_entry";
  return "fair_entry";
}

function resolveSellVerdict(gain: number | null): DecisionVerdict {
  if (gain == null || Math.abs(gain) < 0.005) return "neutral";
  return gain > 0 ? "realized_gain" : "realized_loss";
}

/** BRL per entry, used only for the aggregate summary (which must sum across mixed currencies)
 * — never stored on the entry itself, so per-row display always stays in native currency. */
function toBRL(nativeValue: number, currency: Currency, fxRate: number): number {
  return currency === "USD" ? nativeValue * fxRate : nativeValue;
}

/**
 * Pure function building the full Decision Log from real transaction history — no separate
 * write path. Buys reuse the ThesisSnapshot already frozen at confirmation time (by
 * TransactionsPanel.tsx / transactionPersistence.ts); sells reconstruct their exact marginal
 * capital-gains tax by replaying the whole history chronologically per tax track, reusing
 * `computeMarginalTaxBRL` from the Withdraw Engine (Regra 1 — never a second tax implementation).
 *
 * Currency convention (matches AskScreen): every PER-ROW amount (price, fee, tax, total, effect)
 * stays in the position's own currency — a USD position never gets its row converted to BRL.
 * Only the top summary (which must add BRL and USD positions together) converts, and only there.
 *
 * FX caveat: historical exchange rates at each transaction's own date aren't tracked anywhere in
 * this app, so the conversion used for the aggregate summary is the CURRENT rate, matching the
 * same simplification already used elsewhere (buildTaxContext.totalNetUsBrl).
 */
export function buildDecisionLog(
  transactions: Transaction[],
  watchlistItems: WatchlistItem[],
  fxRate: number,
): DecisionLogSummary {
  const assetTypeByTicker = new Map<string, AssetType>();
  const currencyByTicker = new Map<string, Currency>();
  const nameByTicker = new Map<string, string>();
  const annualDividendByTicker = new Map<string, number>();
  for (const item of watchlistItems) {
    const ticker = item.ticker.toUpperCase();
    assetTypeByTicker.set(ticker, item.type);
    currencyByTicker.set(ticker, item.currency);
    nameByTicker.set(ticker, item.name);
    annualDividendByTicker.set(ticker, item.annualDividend || 0);
  }

  const sortedTxs = [...transactions]
    .filter((tx) => tx.type === "buy" || tx.type === "sell")
    .sort((a, b) => a.date - b.date);

  // calculateRealizedGains iterates transactions in this exact sorted order and pushes exactly
  // one RealizedGainEvent per "sell" tx, in order — safe to zip 1:1 with the sorted sell txs.
  const realizedEvents = calculateRealizedGains(sortedTxs);
  const sellTxs = sortedTxs.filter((tx) => tx.type === "sell");

  const eventsByTrack = new Map<WithdrawTaxTrack, typeof realizedEvents>();
  const entries: DecisionLogEntry[] = [];

  for (let i = 0; i < sellTxs.length; i++) {
    const tx = sellTxs[i];
    const event = realizedEvents[i];
    if (!event) continue;

    const ticker = tx.ticker.toUpperCase();
    const assetType = assetTypeByTicker.get(ticker);
    const currency = currencyByTicker.get(ticker) ?? "BRL";
    const track = resolveWithdrawTaxTrack(assetType, currency);

    // computeMarginalTaxBRL always returns BRL (it's the shared engine's internal unit) —
    // convert back to the position's native currency immediately so this row never shows a
    // BRL-converted number for a USD asset.
    let taxNative = 0;
    if (track) {
      const priorEventsInTrack = eventsByTrack.get(track) || [];
      const marginalTaxBRL = computeMarginalTaxBRL(track, { ...event, assetType }, priorEventsInTrack, {
        realizedGainEvents: [],
        assetTypeByTicker,
        currencyByTicker,
        fxRate,
      });
      taxNative = currency === "USD" ? marginalTaxBRL / fxRate : marginalTaxBRL;
      eventsByTrack.set(track, [...priorEventsInTrack, { ...event, assetType }]);
    }

    const feesNative = tx.fees ?? 0;
    const amountNative = tx.pricePerShare * tx.quantity;

    entries.push({
      id: tx.id,
      ticker,
      name: nameByTicker.get(ticker) || ticker,
      assetType: assetType || "STOCK_BR",
      currency,
      kind: "sell",
      date: tx.date,
      quantity: tx.quantity,
      pricePerShare: tx.pricePerShare,
      consensusAtDecision: null,
      marginAtDecision: null,
      yieldTrapAtDecision: false,
      realizedGainNative: event.gain,
      verdict: resolveSellVerdict(event.gain),
      effectNative: event.gain,
      feesNative,
      taxNative: Number(taxNative.toFixed(2)),
      totalNative: Number((amountNative - feesNative - taxNative).toFixed(2)),
    });
  }

  for (const tx of sortedTxs) {
    if (tx.type !== "buy") continue;
    const ticker = tx.ticker.toUpperCase();
    const assetType = assetTypeByTicker.get(ticker);
    const currency = currencyByTicker.get(ticker) ?? "BRL";
    const snapshot = tx.thesisSnapshot;
    const consensusAtDecision = snapshot?.consensusPrice ?? null;
    const marginAtDecision = snapshot?.safetyMarginVsConsensus ?? null;
    const yieldTrapAtDecision = snapshot?.isYieldTrap === true;

    const effectNative =
      consensusAtDecision != null ? (consensusAtDecision - tx.pricePerShare) * tx.quantity : 0;

    const feesNative = tx.fees ?? 0;
    const amountNative = tx.pricePerShare * tx.quantity;

    entries.push({
      id: tx.id,
      ticker,
      name: nameByTicker.get(ticker) || ticker,
      assetType: assetType || "STOCK_BR",
      currency,
      kind: "buy",
      date: tx.date,
      quantity: tx.quantity,
      pricePerShare: tx.pricePerShare,
      consensusAtDecision,
      marginAtDecision,
      yieldTrapAtDecision,
      realizedGainNative: null,
      verdict: resolveBuyVerdict(marginAtDecision, yieldTrapAtDecision),
      effectNative,
      feesNative,
      taxNative: 0,
      totalNative: Number((amountNative + feesNative).toFixed(2)),
    });
  }

  entries.sort((a, b) => b.date - a.date);

  const overpaid = entries.filter(
    (e) => e.kind === "buy" && (e.verdict === "above_ceiling" || e.verdict === "yield_trap"),
  );
  const overpaidTotalBRL = Number(
    overpaid
      .reduce((sum, e) => sum + Math.max(0, -toBRL(e.effectNative, e.currency, fxRate)), 0)
      .toFixed(2),
  );

  // "Se tivesse esperado o preço voltar à zona de compra, teria N cotas a mais pelo mesmo
  // dinheiro" — same money (quantity * pricePaid) buys (quantity * pricePaid / consensus) shares
  // at the consensus price instead; the difference is only positive when price actually exceeded
  // consensus (a yield-trap entry paid AT/below consensus contributes 0, not a negative number).
  let overpaidExtraShares = 0;
  let overpaidExtraMonthlyIncomeBRL = 0;
  for (const e of overpaid) {
    if (!e.consensusAtDecision || e.consensusAtDecision <= 0 || e.pricePerShare <= e.consensusAtDecision) {
      continue;
    }
    const extraShares = e.quantity * (e.pricePerShare / e.consensusAtDecision - 1);
    overpaidExtraShares += extraShares;
    const annualDividendPerShare = annualDividendByTicker.get(e.ticker) || 0;
    const extraMonthlyIncomeNative = (extraShares * annualDividendPerShare) / 12;
    overpaidExtraMonthlyIncomeBRL += toBRL(extraMonthlyIncomeNative, e.currency, fxRate);
  }
  overpaidExtraShares = Number(overpaidExtraShares.toFixed(2));
  overpaidExtraMonthlyIncomeBRL = Number(overpaidExtraMonthlyIncomeBRL.toFixed(2));

  const totalFeesBRL = Number(
    entries.reduce((sum, e) => sum + toBRL(e.feesNative, e.currency, fxRate), 0).toFixed(2),
  );
  const totalTaxBRL = Number(
    entries.reduce((sum, e) => sum + toBRL(e.taxNative, e.currency, fxRate), 0).toFixed(2),
  );
  const totalBoughtBRL = Number(
    entries
      .filter((e) => e.kind === "buy")
      .reduce((sum, e) => sum + toBRL(e.totalNative, e.currency, fxRate), 0)
      .toFixed(2),
  );
  const totalSoldNetBRL = Number(
    entries
      .filter((e) => e.kind === "sell")
      .reduce((sum, e) => sum + toBRL(e.totalNative, e.currency, fxRate), 0)
      .toFixed(2),
  );

  return {
    entries,
    overpaidCount: overpaid.length,
    overpaidTotalBRL,
    overpaidExtraShares,
    overpaidExtraMonthlyIncomeBRL,
    totalFeesBRL,
    totalTaxBRL,
    totalBoughtBRL,
    totalSoldNetBRL,
  };
}
