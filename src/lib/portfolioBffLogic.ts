import { getCachedAsset, setCachedAsset } from "./api/assetCache.server";
import { reconcileAllPositions } from "./api/positions.server";
import {
  getAssetValuation,
  getCanonicalAnnualDividend,
  yieldOnCost,
  resolveTargetYield,
  type ValuationResult,
} from "./calculations";
import { SELIC_FALLBACK, EXCHANGE_RATE_FALLBACK } from "./macroDefaults";
import { convertCurrency } from "./currency";
import type { WatchlistItem } from "./watchlist";
import type { Transaction } from "./transactionsLogic";
import type { Asset, AssetType } from "./domain";

export interface ValuedPortfolioResponse {
  items: Array<WatchlistItem & ValuationResult & {
    averagePrice: number;
    quantity: number;
    totalValue: number;
    totalCost: number;
    totalDividends: number;
    yieldOnCost: number;
  }>;
  summary: {
    totalInvested: number;
    currentValue: number;
    totalDividends: number;
    projectedAnnualIncome: number;
  };
  reconciledAt: number;
}

export interface FetchValuedPortfolioInput {
  uid: string;
  items: WatchlistItem[];
  transactions?: Transaction[];
  selicPct?: number;
  terminalGrowthRate?: number;
  exchangeRate?: number;
  classTargetYields?: Partial<Record<AssetType, number>>;
  targetYield?: number;
}

export const MAX_PORTFOLIO_BFF_ITEMS = 250;

/**
 * Pure function to compute portfolio valuation on the backend in 1 network round-trip.
 * Adheres strictly to ADR-001 (BFF consolidation) and ADR-002 (Valuation Dispatcher).
 */
export async function computeValuedPortfolioInternal(
  input: FetchValuedPortfolioInput,
  now: number = Date.now(),
  fetchAssetFn?: (ticker: string) => Promise<Asset | null>,
): Promise<ValuedPortfolioResponse> {
  const {
    items = [],
    transactions = [],
    selicPct = SELIC_FALLBACK,
    terminalGrowthRate = 0.045,
    exchangeRate = EXCHANGE_RATE_FALLBACK,
  } = input || {};

  const safeItems = Array.isArray(items) ? items.slice(0, MAX_PORTFOLIO_BFF_ITEMS) : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const positionsMap = reconcileAllPositions(safeTransactions, now);

  const validItems = safeItems.filter(
    (item): item is WatchlistItem => !!item && typeof item.ticker === "string" && item.ticker.trim() !== "",
  );

  // Fetch (cache-first, falling back to fetchAssetFn) in bounded-concurrency
  // batches instead of one ticker at a time — this loop was the dominant
  // latency source for large portfolios (up to MAX_PORTFOLIO_BFF_ITEMS).
  const BFF_FETCH_CONCURRENCY = 20;
  const assetByTicker = new Map<string, Asset | null>();
  for (let i = 0; i < validItems.length; i += BFF_FETCH_CONCURRENCY) {
    const batch = validItems.slice(i, i + BFF_FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (item) => {
        const ticker = item.ticker.trim().toUpperCase();
        let asset: Asset | null = (await getCachedAsset(ticker)) as unknown as Asset | null;
        if (!asset && fetchAssetFn) {
          try {
            asset = await fetchAssetFn(ticker);
            if (asset) {
              await setCachedAsset(ticker, asset as any);
            }
          } catch {
            asset = null;
          }
        }
        return [ticker, asset] as const;
      }),
    );
    for (const [ticker, asset] of results) assetByTicker.set(ticker, asset);
  }

  const valuedItems: ValuedPortfolioResponse["items"] = [];

  for (const item of validItems) {
    const ticker = item.ticker.trim().toUpperCase();
    const asset = assetByTicker.get(ticker) ?? null;

    const pos = positionsMap.get(ticker);
    const quantity = pos ? pos.quantity : item.quantity || 0;
    const averagePrice = pos && pos.quantity > 0 ? pos.averageCost : item.averagePrice || 0;

    const currentPrice = asset?.currentPrice ?? item.currentPrice ?? averagePrice;
    const annualDividend = asset ? getCanonicalAnnualDividend(asset, 3) : item.annualDividend ?? 0;

    const eps = asset?.epsCurrent ?? asset?.metrics?.eps ?? null;
    const bvps = asset?.metrics?.bvps ?? null;
    const dividendCagr = asset?.metrics?.dividendCagr5y ?? null;
    const dividendHistory = asset?.dividendHistory ?? [];

    const assetType = item.type || asset?.type || "STOCK_BR";
    const effectiveYield = resolveTargetYield(
      { type: assetType, targetYield: item.targetYield },
      { targetYield: input.targetYield, classTargetYields: input.classTargetYields },
    ).effectiveYield;

    const valuation = getAssetValuation({
      ticker,
      targetYield: effectiveYield,
      currentPrice,
      avgDividend: annualDividend,
      eps,
      bvps,
      dividendCagr,
      dividendHistory,
      selicPct,
      terminalGrowthRate,
      currency: item.currency || asset?.currency || "BRL",
      type: assetType,
    });

    const totalValue = quantity * currentPrice;
    const totalCost = quantity * averagePrice;
    const totalDividends = quantity * annualDividend;

    valuedItems.push({
      ...item,
      ...valuation,
      currentPrice,
      averagePrice,
      quantity,
      annualDividend,
      totalValue,
      totalCost,
      totalDividends,
      yieldOnCost: yieldOnCost(annualDividend, averagePrice) ?? 0,
    });
  }

  const totalInvested = valuedItems.reduce(
    (acc, it) => acc + convertCurrency(it.totalCost, it.currency || "BRL", "BRL", exchangeRate),
    0,
  );
  const currentValue = valuedItems.reduce(
    (acc, it) => acc + convertCurrency(it.totalValue, it.currency || "BRL", "BRL", exchangeRate),
    0,
  );
  const totalDividends = valuedItems.reduce(
    (acc, it) => acc + convertCurrency(it.totalDividends, it.currency || "BRL", "BRL", exchangeRate),
    0,
  );

  return {
    items: valuedItems,
    summary: {
      totalInvested,
      currentValue,
      totalDividends,
      projectedAnnualIncome: totalDividends,
    },
    reconciledAt: now,
  };
}
