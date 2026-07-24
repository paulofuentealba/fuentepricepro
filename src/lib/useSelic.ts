import { useQuery } from "@tanstack/react-query";

export const SELIC_FALLBACK = 10.5;

/**
 * Fetches the current annualized target Selic rate (Meta Selic) from the Central Bank of Brazil (BCB).
 * SGS Series 432: Taxa de juros - Meta Selic definida pelo Copom
 */
export function useSelic() {
  return useQuery({
    queryKey: ["selic-rate"],
    queryFn: async () => {
      try {
        const res = await fetch(
          "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json",
        );
        if (!res.ok) throw new Error("Failed to fetch Selic");
        const data = await res.json();
        if (data && data.length > 0 && data[0].valor) {
          return parseFloat(data[0].valor);
        }
        return SELIC_FALLBACK;
      } catch (err) {
        console.error("Error fetching Selic from BCB, using fallback", err);
        return SELIC_FALLBACK;
      }
    },
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
