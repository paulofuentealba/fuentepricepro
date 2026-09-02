import type { Asset } from "@/lib/domain";
import { getCanonicalAnnualDividend, getAssetValuation } from "@/lib/calculations";
import { makeId } from "@/lib/watchlist";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

/**
 * Builds a synthetic (not-yet-owned) ValuedWatchlistItem from a freshly-fetched Asset — for the
 * Screener's "search a ticker not in my watchlist yet" path. Reuses the exact same valuation
 * calls transactionPersistence.ts already makes when importing a never-before-seen ticker
 * (Regra 1/4 SSOT — never a second inline copy of the Bazin/Graham/Gordon dispatch).
 */
export function buildScreenerCandidate(asset: Asset, targetYield: number): ValuedWatchlistItem {
  const annualDividend = getCanonicalAnnualDividend(asset, 3) || 0;
  const valuation = getAssetValuation({
    targetYield,
    currentPrice: asset.currentPrice || 1,
    avgDividend: annualDividend,
    eps: asset.epsCurrent,
    bvps: asset.metrics?.bvps ?? null,
    dividendCagr: asset.metrics?.dividendCagr5y ?? null,
    currency: asset.currency,
    type: asset.type,
  });

  const now = Date.now();
  return {
    id: makeId(asset.ticker, asset.type),
    ticker: asset.ticker,
    name: asset.name,
    type: asset.type,
    currency: asset.currency,
    currentPrice: asset.currentPrice,
    livePrice: asset.currentPrice,
    annualDividend,
    targetYield,
    ceilingPrice: valuation.activeCeiling,
    safetyMargin: valuation.margin,
    quantity: 0,
    averagePrice: null,
    paymentMonths: asset.paymentMonths || [],
    payoutRatio: asset.metrics?.payoutRatio ?? null,
    sector: asset.sector || "",
    addedAt: now,
    investingSince: now,
    isClosedPosition: false,
    isBffMode: false,
    valuation,
  };
}
