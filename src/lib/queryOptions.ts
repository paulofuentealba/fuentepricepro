import { queryOptions } from "@tanstack/react-query";
import {
  fetchAssetFn,
  fetchQuoteFn,
  searchAssetsFn,
  type LiveQuote,
  type SearchHit,
} from "./apiService.functions";
import type { Asset } from "./domain";

/**
 * Central TanStack Query options for every remote read in the app.
 * Consumers use these via `useQuery`, `useQueries`, `useMutation`
 * (queryFn), and `queryClient.ensureQueryData` / `setQueryData` — so
 * caching, dedup, and stale-time policy live in exactly one place.
 */

export function assetQueryOptions(ticker: string) {
  const key = ticker.toUpperCase();
  return queryOptions({
    queryKey: ["asset", key] as const,
    queryFn: ({ signal }): Promise<Asset> =>
      fetchAssetFn({ data: { ticker: key }, signal }),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function quoteQueryOptions(ticker: string) {
  const key = ticker.toUpperCase();
  return queryOptions({
    queryKey: ["quote", key] as const,
    queryFn: ({ signal }): Promise<LiveQuote | null> =>
      fetchQuoteFn({ data: { ticker: key }, signal }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function searchQueryOptions(query: string) {
  const normalized = query.trim();
  return queryOptions({
    queryKey: ["search", normalized.toUpperCase()] as const,
    queryFn: ({ signal }): Promise<SearchHit[]> =>
      searchAssetsFn({ data: { query: normalized }, signal }),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: normalized.length > 0,
  });
}
