import { useQuery } from "@tanstack/react-query";
import { macroRatesQueryOptions } from "./queryOptions";
import { SELIC_FALLBACK } from "./macroDefaults";

export { SELIC_FALLBACK };

/**
 * Hook to retrieve the current annualized target Selic rate (Meta Selic).
 * Powered by server function `fetchMacroRatesFn` with 24h TanStack Query caching.
 * Single Source of Truth: eliminates browser client-side direct calls to BCB SGS API.
 */
export function useSelic() {
  const query = useQuery(macroRatesQueryOptions());
  return {
    ...query,
    data: query.data?.selic ?? query.data?.cdi ?? SELIC_FALLBACK,
  };
}
