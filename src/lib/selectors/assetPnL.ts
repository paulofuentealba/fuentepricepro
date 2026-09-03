import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

export interface AssetPnL {
  pnlAbsolute: number;
  pnlPercent: number;
}

/**
 * Pure selector: derives absolute and percentual profit/loss for a single
 * position from `ValuedWatchlistItem` (as returned by `useValuedPortfolio()`
 * in `valuedItems`).
 *
 * `pnlAbsolute = (currentPrice - averagePrice) * quantity`
 * `pnlPercent = (currentPrice - averagePrice) / averagePrice`
 *
 * When `averagePrice` is `null` or `0` (synthetic/legacy position without an
 * average price), `pnlPercent` is returned as `0` instead of `Infinity`/`NaN`
 * — same guard pattern used elsewhere in `calculations.ts`.
 */
export function getAssetPnL(item: ValuedWatchlistItem): AssetPnL {
  const averagePrice = item.averagePrice ?? 0;
  const currentPrice = item.currentPrice;
  const quantity = item.quantity;

  const pnlAbsolute = (currentPrice - averagePrice) * quantity;
  const pnlPercent =
    !Number.isFinite(averagePrice) || averagePrice <= 0
      ? 0
      : (currentPrice - averagePrice) / averagePrice;

  return { pnlAbsolute, pnlPercent };
}
