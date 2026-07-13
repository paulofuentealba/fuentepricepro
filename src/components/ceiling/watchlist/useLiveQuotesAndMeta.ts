import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { assetQueryOptions, quoteQueryOptions } from "@/lib/queryOptions";
import type { LiveQuote } from "@/lib/apiService.functions";
import type { WatchlistItem } from "@/lib/watchlist";
import type { AssetMeta } from "./utils";

/**
 * Fans out live quote + tactical metadata requests per unique ticker via
 * TanStack Query. Caching, deduplication, and stale-time policy are owned
 * by `queryOptions.ts`. Each query is isolated so a single failure never
 * blanks the UI.
 */
export function useLiveQuotesAndMeta(items: WatchlistItem[]) {
  const tickers = useMemo(
    () => Array.from(new Set(items.map((i) => i.ticker))).sort(),
    [items],
  );

  const quoteResults = useQueries({
    queries: tickers.map((ticker) => quoteQueryOptions(ticker)),
  });
  const assetResults = useQueries({
    queries: tickers.map((ticker) => assetQueryOptions(ticker)),
  });

  const quotes = useMemo(() => {
    const out: Record<string, LiveQuote> = {};
    tickers.forEach((ticker, i) => {
      const q = quoteResults[i]?.data;
      if (q) out[ticker] = q;
    });
    return out;
  }, [tickers, quoteResults]);

  const meta = useMemo(() => {
    const out: Record<string, AssetMeta> = {};
    tickers.forEach((ticker, i) => {
      const asset = assetResults[i]?.data;
      if (asset) {
        out[ticker] = {
          exDividendDate: asset.exDividendDate ?? null,
          dividendCagr5y: asset.metrics?.dividendCagr5y ?? null,
        };
      }
    });
    return out;
  }, [tickers, assetResults]);

  return { quotes, meta };
}
