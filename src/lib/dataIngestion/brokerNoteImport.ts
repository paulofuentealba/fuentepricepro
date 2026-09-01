import { getCanonicalAnnualDividend, getAssetValuation } from "@/lib/calculations";
import { classifyBr } from "@/lib/classify";
import { makeId, type WatchlistItem } from "@/lib/watchlist";
import {
  recalculateHoldingFromTransactions,
  recalculateInvestingSinceFromTransactions,
  type Transaction,
} from "@/lib/transactions";

/**
 * Pure helpers behind the broker-note PDF import flow (BrokerNoteImportPage). Moved out of the
 * old BrokerNoteUploader modal component (AGENTS.md Rule 1: consolidate, don't duplicate) so
 * they have a single home with no React dependency — parseB3BrokerNote itself already lives in
 * ./b3Parser.ts, this is the orchestration layer on top of its output.
 */

export function parseDdMmYyyyToTimestamp(dateStr?: string | null): number | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (
      !isNaN(day) &&
      !isNaN(month) &&
      !isNaN(year) &&
      year >= 1900 &&
      month >= 0 &&
      month <= 11 &&
      day >= 1 &&
      day <= 31
    ) {
      const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }

  const fallback = new Date(trimmed).getTime();
  return isNaN(fallback) ? null : fallback;
}

export function consolidateTradesToWatchlistItems(
  trades: { ticker: string; quantity: number; price: number; date: string }[],
  existingTransactions: Transaction[],
  newlyCreatedTransactions: Transaction[],
  assetDataMap: Record<string, any> = {},
): WatchlistItem[] {
  const tradesByTicker = new Map<string, typeof trades>();
  for (const trade of trades) {
    const ticker = trade.ticker.toUpperCase();
    const list = tradesByTicker.get(ticker) || [];
    list.push(trade);
    tradesByTicker.set(ticker, list);
  }

  const itemsToImport: WatchlistItem[] = [];

  for (const [ticker, tickerTrades] of tradesByTicker.entries()) {
    const lastTrade = tickerTrades[tickerTrades.length - 1];
    const assetData = assetDataMap[ticker] || null;

    const type = assetData?.type || classifyBr(ticker);
    const annualDiv = assetData ? getCanonicalAnnualDividend(assetData, 3) : 0;
    const target = 6;
    // Single inference used for BOTH the valuation call and the WatchlistItem written below —
    // previously the WatchlistItem hardcoded "BRL" regardless of this, silently mislabeling every
    // imported USD position (e.g. a Schwab confirmation for a NYSE ticker) as Brazilian Reais.
    const currency =
      assetData?.currency ||
      (ticker.endsWith("3") || ticker.endsWith("4") || ticker.endsWith("11") ? "BRL" : "USD");
    const val = getAssetValuation({
      targetYield: target,
      currentPrice: lastTrade.price,
      avgDividend: annualDiv,
      eps: assetData?.epsCurrent ?? assetData?.metrics?.eps ?? null,
      bvps: assetData?.metrics?.bvps ?? null,
      dividendCagr: assetData?.metrics?.dividendCagr5y ?? null,
      currency,
      type,
    });
    const ceil = val.activeCeiling;
    const margin = val.margin;

    const newlyCreatedIds = new Set(newlyCreatedTransactions.map((n) => n.id));
    const existingForTicker = existingTransactions.filter(
      (tx) => tx.ticker.toUpperCase() === ticker && !newlyCreatedIds.has(tx.id),
    );
    const newlyCreatedForTicker = newlyCreatedTransactions.filter(
      (tx) => tx.ticker.toUpperCase() === ticker,
    );

    const allTickerTransactions = [...existingForTicker, ...newlyCreatedForTicker];
    const { quantity, averagePrice } = recalculateHoldingFromTransactions(allTickerTransactions);

    itemsToImport.push({
      id: makeId(ticker, type),
      ticker: ticker,
      name: assetData?.name || ticker,
      type,
      currency,
      currentPrice: lastTrade.price,
      annualDividend: annualDiv,
      targetYield: target,
      ceilingPrice: ceil,
      safetyMargin: margin,
      quantity,
      averagePrice,
      paymentMonths: Array.isArray(assetData?.paymentMonths) ? assetData.paymentMonths : [],
      payoutRatio: null,
      targetMonthlyIncome: null,
      customTaxRate: null,
      sector: assetData?.sector || null,
      addedAt: Date.now(),
      investingSince: recalculateInvestingSinceFromTransactions(allTickerTransactions) ?? Date.now(),
    } as WatchlistItem);
  }

  return itemsToImport;
}
