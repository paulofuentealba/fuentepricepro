import { useMemo } from "react";
import { useWatchlist } from "./watchlist";

/**
 * Whether the current user's watchlist contains at least one USD-denominated
 * asset (STOCK_US, REIT, or a USD ETF — all captured by `currency === "USD"`,
 * which is already the single source of truth for an asset's currency).
 */
export function useHasUSDAssets(): { hasUSDAssets: boolean; loading: boolean } {
  const { items, isPending } = useWatchlist();

  const hasUSDAssets = useMemo(() => items.some((item) => item.currency === "USD"), [items]);

  return { hasUSDAssets, loading: isPending };
}
