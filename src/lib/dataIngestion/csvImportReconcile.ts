import {
  getCanonicalAnnualDividend,
  getAssetValuation,
} from "@/lib/calculations";
import { makeId, type WatchlistItem } from "@/lib/watchlist";
import type { ParsedTransaction } from "@/lib/dynamicCsvParser";
import {
  recalculateHoldingFromTransactions,
  recalculateInvestingSinceFromTransactions,
  type Transaction,
} from "@/lib/transactions";

/**
 * Consolidates parsed CSV/XLSX transactions into WatchlistItem upserts, one per ticker —
 * mirrors the pattern already used by consolidateTradesToWatchlistItems (broker-note PDF
 * import): existing customizations (targetYield, payoutRatio, customTaxRate,
 * targetMonthlyIncome, sector, broker) are always looked up and preserved, never reset to a
 * default. This is the correct reconciliation logic that useWatchlistCsvImport.ts's "Simple
 * Watchlist Format" path already had — extracted here as a pure, reusable function so the
 * consolidated DynamicImportModal flow doesn't duplicate it, and so any future import pipeline
 * gets the same guarantee instead of reinventing it (and risking the same reset-to-null bug
 * that PDF import had before it was fixed).
 */
export function reconcileParsedTransactionsToWatchlistItems(
  parsedTxs: ParsedTransaction[],
  existingTransactions: Transaction[],
  newlyCreatedTransactions: Transaction[],
  assetDataMap: Record<string, any>,
  existingWatchlistItems: WatchlistItem[],
  terminalGrowthRate: number,
): WatchlistItem[] {
  const existingById = new Map(existingWatchlistItems.map((i) => [i.id, i]));
  const workingTransactions = [...existingTransactions, ...newlyCreatedTransactions];
  const tickers = Array.from(new Set(parsedTxs.map((tx) => tx.ticker.toUpperCase())));
  const items: WatchlistItem[] = [];

  for (const ticker of tickers) {
    const asset = assetDataMap[ticker];
    if (!asset) continue; // asset lookup failed for this ticker — skip rather than fabricate a WatchlistItem with no market data

    const type = asset.type;
    const id = makeId(ticker, type);
    const existing = existingById.get(id);
    const annual = getCanonicalAnnualDividend(asset, 3);
    const target = existing?.targetYield ?? 6;
    const val = getAssetValuation({
      targetYield: target,
      currentPrice: asset.currentPrice,
      avgDividend: annual,
      eps: asset.epsCurrent ?? asset.metrics?.eps ?? null,
      bvps: asset.metrics?.bvps ?? null,
      dividendCagr: asset.metrics?.dividendCagr5y ?? null,
      terminalGrowthRate,
      currency: asset.currency,
      type,
    });

    const finalTxs = workingTransactions.filter((t) => t.ticker.toUpperCase() === ticker);
    const finalHolding = recalculateHoldingFromTransactions(finalTxs);

    items.push({
      id,
      ticker: asset.ticker,
      name: asset.name,
      type,
      currency: asset.currency,
      currentPrice: asset.currentPrice,
      annualDividend: annual,
      targetYield: target,
      ceilingPrice: val.activeCeiling,
      safetyMargin: val.margin,
      quantity: finalHolding.quantity,
      averagePrice: finalHolding.averagePrice,
      payoutRatio: existing?.payoutRatio ?? null,
      customTaxRate: existing?.customTaxRate ?? null,
      sector: existing?.sector ?? null,
      targetMonthlyIncome: existing?.targetMonthlyIncome ?? null,
      paymentMonths: Array.isArray(asset.paymentMonths) ? asset.paymentMonths : [],
      addedAt: existing?.addedAt ?? Date.now(),
      investingSince:
        recalculateInvestingSinceFromTransactions(finalTxs) ??
        (existing?.investingSince && !isNaN(existing.investingSince) ? existing.investingSince : Date.now()),
      broker: existing?.broker ?? null,
    } as WatchlistItem);
  }

  return items;
}
