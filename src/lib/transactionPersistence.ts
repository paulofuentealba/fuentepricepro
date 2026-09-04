import { makeId, type WatchlistItem } from "./watchlist";
import {
  type Transaction,
  recalculateHoldingFromTransactions,
  recalculateInvestingSinceFromTransactions,
} from "./transactions";
import type { ParsedTransaction } from "./dynamicCsvParser";
import { classifyBr } from "./classify";
import { getCanonicalAnnualDividend, getAssetValuation } from "./calculations";
import type { Asset } from "./domain";

/**
 * `fetchAssetData` callers (e.g. tests, and some lighter-weight lookups) may
 * pass a partial asset-like object carrying a simple `annualDividend` total
 * instead of the full `dividendHistory`/`dividends3y` arrays `Asset` expects
 * — `getCanonicalAnnualDividend` needs the latter, so `annualDividend` is
 * kept as an explicit fallback below rather than assumed dead.
 */
type FetchedAssetLike = Partial<Asset> & {
  ticker: string;
  type: Asset["type"];
  annualDividend?: number;
};

export interface BatchPersistenceProgress {
  total: number;
  current: number;
  succeeded: number;
  failed: number;
}

export interface BatchPersistenceResult {
  persistedCount: number;
  persistedTransactions: Transaction[];
  failedTransactions: {
    tx: ParsedTransaction;
    error: string;
    lineIndex: number;
  }[];
  affectedTickers: string[];
}

/**
 * Persists a batch of parsed transactions, recalculates holdings per ticker atomically,
 * and tracks individual transaction successes and failures for resilient error reporting.
 */
export async function persistTransactionsBatch(
  parsedList: ParsedTransaction[],
  existingWatchlistItems: WatchlistItem[],
  existingTransactions: Transaction[],
  upsertTransaction: (tx: Transaction) => Promise<unknown> | void,
  upsertWatchlistItem: (item: WatchlistItem) => Promise<unknown> | void,
  fetchAssetData?: (ticker: string) => Promise<FetchedAssetLike | null> | FetchedAssetLike | null,
  onProgress?: (progress: BatchPersistenceProgress) => void,
): Promise<BatchPersistenceResult> {
  const persistedTransactions: Transaction[] = [];
  const failedTransactions: {
    tx: ParsedTransaction;
    error: string;
    lineIndex: number;
  }[] = [];

  const total = parsedList.length;
  let current = 0;

  // 1. Group parsed transactions by ticker
  const parsedByTicker = new Map<string, ParsedTransaction[]>();
  for (const parsed of parsedList) {
    const ticker = parsed.ticker.toUpperCase().trim();
    const list = parsedByTicker.get(ticker) || [];
    list.push(parsed);
    parsedByTicker.set(ticker, list);
  }

  const affectedTickers: string[] = [];

  // 2. Persist transactions ticker by ticker
  for (const [ticker, tickerParsedList] of parsedByTicker.entries()) {
    const currentTickerTxs = existingTransactions.filter(
      (t) => t.ticker.toUpperCase() === ticker,
    );
    const successfullyAddedTxs: Transaction[] = [];

    const existingItem = existingWatchlistItems.find(
      (it) => it.ticker.toUpperCase() === ticker,
    );

    let assetData: FetchedAssetLike | null = null;
    let valuationUnavailableReason: string | null = null;
    if (fetchAssetData) {
      try {
        assetData = await fetchAssetData(ticker);
      } catch {
        valuationUnavailableReason = "FETCH_ASSET_DATA_FAILED";
      }
    }

    const type = existingItem?.type || assetData?.type || classifyBr(ticker);
    const currency =
      existingItem?.currency ||
      assetData?.currency ||
      (["STOCK_US", "REIT"].includes(type) ? "USD" : "BRL");
    const annualDiv = assetData
      ? getCanonicalAnnualDividend(assetData as Asset, 3) || assetData.annualDividend || 0
      : existingItem?.annualDividend ?? 0;
    const target = existingItem?.targetYield ?? 6;

    let baseValuation: ReturnType<typeof getAssetValuation> | null = null;
    try {
      baseValuation = getAssetValuation({
        targetYield: target,
        currentPrice: assetData?.currentPrice || existingItem?.currentPrice || 1,
        avgDividend: annualDiv,
        eps: assetData?.epsCurrent ?? assetData?.metrics?.eps ?? null,
        bvps: assetData?.metrics?.bvps ?? null,
        dividendCagr: assetData?.metrics?.dividendCagr5y ?? null,
        currency,
        type,
      });
    } catch {
      valuationUnavailableReason = "VALUATION_CALCULATION_FAILED";
    }

    const payoutRatio = existingItem?.payoutRatio ?? assetData?.metrics?.payoutRatio ?? null;
    const dividendCagr5y = assetData?.metrics?.dividendCagr5y ?? null;
    // Piotroski F-Score is not carried on Asset/AssetMetrics — always null here
    // (neither prior fallback source ever populated it either).
    const piotroskiScore: number | null = null;

    for (const parsed of tickerParsedList) {
      current++;
      const txId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      let thesisSnapshot = null;
      if (parsed.type !== "SELL") {
        const purchasePrice = parsed.price;
        const consensusPrice = baseValuation?.fuenteConsensus ?? null;
        const safetyMarginVsConsensus =
          consensusPrice != null && purchasePrice > 0
            ? ((consensusPrice - purchasePrice) / purchasePrice) * 100
            : null;
        const dy =
          purchasePrice > 0 && annualDiv > 0
            ? (annualDiv / purchasePrice) * 100
            : (baseValuation?.dividendYield ?? null);

        thesisSnapshot = {
          consensusPrice,
          bazinPrice: baseValuation?.methods?.bazin ?? null,
          grahamPrice: baseValuation?.methods?.graham ?? baseValuation?.methods?.lynch ?? null,
          gordonPrice: baseValuation?.methods?.gordon ?? null,
          purchasePrice,
          safetyMarginVsConsensus,
          payoutRatio,
          dividendYield: dy,
          dividendCagr5y,
          piotroskiScore,
          isYieldTrap: baseValuation?.yieldTrapWarning ? true : false,
          valuationVersion: "fuente-v1",
          capturedAt: Date.now(),
          unavailableReason:
            consensusPrice == null
              ? (valuationUnavailableReason || "FUNDAMENTALS_UNAVAILABLE")
              : null,
        };
      }

      const tx: Transaction = {
        id: txId,
        ticker,
        type: parsed.type === "SELL" ? "sell" : "buy",
        date: parsed.date.getTime(),
        quantity: parsed.quantity,
        pricePerShare: parsed.price,
        fees: parsed.costs || 0,
        notes: parsed.notes || null,
        thesisSnapshot,
      };

      try {
        await upsertTransaction(tx);
        successfullyAddedTxs.push(tx);
        persistedTransactions.push(tx);
      } catch (err: unknown) {
        failedTransactions.push({
          tx: parsed,
          error:
            err instanceof Error
              ? err.message
              : "Erro desconhecido ao gravar transação",
          lineIndex: parsed.lineIndex,
        });
      }

      onProgress?.({
        total,
        current,
        succeeded: persistedTransactions.length,
        failed: failedTransactions.length,
      });
    }

    // If at least one transaction was successfully persisted for this ticker, update the holding
    if (successfullyAddedTxs.length > 0) {
      affectedTickers.push(ticker);
      const allTickerTxs = [...currentTickerTxs, ...successfullyAddedTxs];
      const holding = recalculateHoldingFromTransactions(allTickerTxs);

      const currentPrice =
        assetData?.currentPrice ||
        existingItem?.currentPrice ||
        holding.averagePrice ||
        0;

      const val = getAssetValuation({
        targetYield: target,
        currentPrice: holding.averagePrice || currentPrice,
        avgDividend: annualDiv,
        eps: assetData?.epsCurrent ?? assetData?.metrics?.eps ?? null,
        bvps: assetData?.metrics?.bvps ?? null,
        dividendCagr: assetData?.metrics?.dividendCagr5y ?? null,
        currency,
        type,
      });

      const updatedItem: WatchlistItem = {
        id: existingItem?.id || makeId(ticker, type),
        ticker,
        name: existingItem?.name || assetData?.name || ticker,
        type,
        currency,
        currentPrice,
        annualDividend: annualDiv,
        targetYield: target,
        ceilingPrice: val.activeCeiling,
        safetyMargin: val.margin,
        quantity: holding.quantity,
        averagePrice: holding.averagePrice,
        paymentMonths: existingItem?.paymentMonths || [],
        payoutRatio: existingItem?.payoutRatio ?? null,
        customTaxRate: existingItem?.customTaxRate ?? null,
        sector: existingItem?.sector || assetData?.sector || null,
        addedAt: existingItem?.addedAt || Date.now(),
        investingSince:
          recalculateInvestingSinceFromTransactions(allTickerTxs) ??
          existingItem?.investingSince ??
          Date.now(),
      };

      try {
        await upsertWatchlistItem(updatedItem);
      } catch (err: unknown) {
        console.error(
          `[transactionPersistence] failed to update holding for ${ticker}`,
          err,
        );
      }
    }
  }

  return {
    persistedCount: persistedTransactions.length,
    persistedTransactions,
    failedTransactions,
    affectedTickers,
  };
}
