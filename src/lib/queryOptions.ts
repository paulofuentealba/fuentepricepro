import { queryOptions } from "@tanstack/react-query";
import {
  fetchAssetFn,
  fetchQuoteFn,
  searchAssetsFn,
  fetchExchangeRatesFn,
  fetchMacroRatesFn,
  fetchBenchmarkHistoryFn,
  fetchAssetPriceHistoryFn,
  fetchRadarFn,
  checkPendingSplitsFn,
  fetchPiotroskiScoreFn,
  fetchIpcaFiveYearAverageFn,
  type LiveQuote,
  type SearchHit,
  type BenchmarkPoint,
  type BenchmarkType,
  type PiotroskiScoreResponse,
} from "./apiService.functions";
import type { Asset } from "./domain";
import type { MacroRates } from "./macroDefaults";

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
    queryFn: ({ signal }): Promise<MacroRates> => fetchMacroRatesFn({ signal }),
    staleTime: 86_400_000, // 24 hours
    gcTime: 172_800_000, // 48 hours
  });
}

/**
 * IPCA médio dos últimos 5 anos (anualizado via média geométrica),
 * usado como taxa terminal dinâmica do Gordon 2-Estágios. `staleTime` de
 * 30 dias — o IPCA é divulgado mensalmente pelo IBGE/BCB, então não há
 * motivo pra recalcular a cada sessão.
 */
export function ipcaFiveYearAverageQueryOptions() {
  return queryOptions({
    queryKey: ["ipcaFiveYearAverage"] as const,
    queryFn: (): Promise<number | null> => fetchIpcaFiveYearAverageFn(),
    staleTime: 7 * 24 * 60 * 60_000, // 7 days (safe 32-bit integer duration)
    gcTime: 14 * 24 * 60 * 60_000, // 14 days
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

export function assetPriceHistoryQueryOptions(
  ticker: string,
  fromDate: string,
  toDate: string,
) {
  const key = (ticker || "").trim().toUpperCase();
  return queryOptions({
    queryKey: ["assetPriceHistory", key, fromDate, toDate] as const,
    queryFn: ({ signal }): Promise<BenchmarkPoint[]> =>
      fetchAssetPriceHistoryFn({ data: { ticker: key, fromDate, toDate }, signal }),
    staleTime: 86_400_000, // 24 hours
    gcTime: 172_800_000, // 48 hours
    enabled: Boolean(key && fromDate && toDate),
  });
}

export function dividendRadarQueryOptions() {
  return queryOptions({
    queryKey: ["dividend-radar"] as const,
    queryFn: () => fetchRadarFn(),
    staleTime: 15 * 60_000, // 15 mins
    gcTime: 30 * 60_000,
  });
}

export function piotroskiScoreQueryOptions(ticker: string) {
  const key = (ticker || "").trim().toUpperCase();
  return queryOptions({
    queryKey: ["piotroskiScore", key] as const,
    queryFn: ({ signal }): Promise<PiotroskiScoreResponse> =>
      fetchPiotroskiScoreFn({ data: { ticker: key }, signal }),
    staleTime: 7 * 24 * 60 * 60_000, // 7 days — annual fundamental data, doesn't change daily
    gcTime: 14 * 24 * 60 * 60_000,
    enabled: Boolean(key),
  });
}

export function corporateEventsQueryOptions(ticker?: string, sinceTimestamp?: number) {
  const key = (ticker || "").trim().toUpperCase();
  const timestamp = sinceTimestamp ?? 0;
  return queryOptions({
    queryKey: ["pendingSplits", key, timestamp] as const,
    queryFn: ({ signal }) =>
      key ? checkPendingSplitsFn({ data: { ticker: key, sinceTimestamp: timestamp }, signal }) : Promise.resolve([]),
    staleTime: 24 * 60 * 60_000, // 24 hours
    gcTime: 48 * 60 * 60_000,
  });
}
