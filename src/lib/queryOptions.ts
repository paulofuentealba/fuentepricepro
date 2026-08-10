import { queryOptions } from "@tanstack/react-query";
import {
  fetchAssetFn,
  fetchQuoteFn,
  searchAssetsFn,
  fetchExchangeRatesFn,
  fetchMacroRatesFn,
  fetchBenchmarkHistoryFn,
  type LiveQuote,
  type SearchHit,
  type BenchmarkPoint,
  type BenchmarkType,
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
    queryFn: ({ signal }): Promise<Asset> => fetchAssetFn({ data: { ticker: key }, signal }),
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

export function exchangeRateQueryOptions() {
  return queryOptions({
    queryKey: ["exchangeRate", "USDBRL"] as const,
    queryFn: ({ signal }): Promise<{ USDBRL: number }> => fetchExchangeRatesFn({ signal }),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function macroRatesQueryOptions() {
  return queryOptions({
    queryKey: ["macroRates"] as const,
    queryFn: ({ signal }): Promise<{ cdi: number; ipca: number }> => fetchMacroRatesFn({ signal }),
    staleTime: 86_400_000, // 24 hours
    gcTime: 172_800_000, // 48 hours
  });
}

export function benchmarkHistoryQueryOptions(
  benchmark: BenchmarkType,
  fromDate: string,
  toDate: string,
) {
  return queryOptions({
    queryKey: ["benchmarkHistory", benchmark, fromDate, toDate] as const,
    queryFn: ({ signal }): Promise<BenchmarkPoint[]> =>
      fetchBenchmarkHistoryFn({ data: { benchmark, fromDate, toDate }, signal }),
    staleTime: 86_400_000, // 24 hours
    gcTime: 172_800_000, // 48 hours
    enabled: Boolean(benchmark && fromDate && toDate),
  });
}
