import type { Asset } from "@/lib/domain";
import { getCanonicalAnnualDividend, getAssetValuation } from "@/lib/calculations";
import type { WatchlistItem } from "@/lib/watchlist";

export interface BuildWatchlistItemOptions {
  targetYield: number;
  quantity: number;
  averagePrice?: number | null;
  targetMonthlyIncome?: number | null;
  existing?: WatchlistItem | null;
}

/**
 * Builds a `WatchlistItem` from a resolved `Asset`, computing the ceiling
 * price / safety margin the same way the "Add to watchlist" dialog does.
 *
 * Single source of truth for "create/update a watchlist item from an
 * Asset" — consumed by `AddToWatchlistDialog.tsx` (Screener) and
 * `NewContributionDialog.tsx` (Horizonte home) so the logic isn't
 * duplicated across both entry points.
 */
export function buildWatchlistItem(asset: Asset, opts: BuildWatchlistItemOptions): WatchlistItem {
  const { targetYield, quantity, averagePrice = null, targetMonthlyIncome = null, existing = null } = opts;
  const id = `${asset.type.toLowerCase()}:${asset.ticker}`;
  const annual = getCanonicalAnnualDividend(asset, 3);
  const val = getAssetValuation({
    targetYield,
    currentPrice: asset.currentPrice,
    avgDividend: annual,
    eps: asset.epsCurrent ?? asset.metrics?.eps ?? null,
    bvps: asset.metrics?.bvps ?? null,
    dividendCagr: asset.metrics?.dividendCagr5y ?? null,
    currency: asset.currency,
    type: asset.type,
  });

  return {
    id,
    ticker: asset.ticker,
    name: asset.name,
    type: asset.type,
    currency: asset.currency,
    currentPrice: asset.currentPrice,
    annualDividend: annual,
    targetYield,
    ceilingPrice: val.activeCeiling,
    safetyMargin: val.margin,
    quantity,
    averagePrice: averagePrice != null && Number.isFinite(averagePrice) ? averagePrice : null,
    paymentMonths: Array.isArray(asset.paymentMonths) ? asset.paymentMonths : [],
    targetMonthlyIncome:
      targetMonthlyIncome != null && Number.isFinite(targetMonthlyIncome) && targetMonthlyIncome > 0
        ? targetMonthlyIncome
        : null,
    payoutRatio: asset.metrics?.payoutRatio ?? null,
    addedAt: existing?.addedAt ?? Date.now(),
    investingSince: existing?.investingSince ?? Date.now(),
  };
}
