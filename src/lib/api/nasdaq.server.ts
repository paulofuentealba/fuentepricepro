import { dedupeInFlight, fetchWithRetry } from "./http.server";

/**
 * Fetches dividend payment dates from Nasdaq Public API for a US stock.
 * Returns a Map of `exDate (YYYY-MM-DD)` -> `paymentDate (YYYY-MM-DD)`.
 * If ticker is NYSE-listed or fails, returns an empty Map gracefully without throwing.
 */
export async function fetchNasdaqDividends(ticker: string): Promise<Map<string, string>> {
  const clean = ticker.toUpperCase().trim();
  return dedupeInFlight(`nasdaq:dividends:${clean}`, async () => {
    const map = new Map<string, string>();
    try {
      const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(clean)}/dividends?assetclass=stocks`;
      const res = await fetchWithRetry(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          Origin: "https://www.nasdaq.com",
          Referer: "https://www.nasdaq.com/",
        },
      });

      if (!res.ok) return map;
      const json = await res.json();
      const rows = json?.data?.dividends?.rows;
      if (!Array.isArray(rows)) return map;

      for (const row of rows) {
        if (!row?.exOrEffDate || !row?.paymentDate || row.paymentDate === "N/A") continue;

        // Parse MM/DD/YYYY to YYYY-MM-DD
        const parseUsDate = (str: string): string | null => {
          const parts = str.split("/");
          if (parts.length !== 3) return null;
          const [m, d, y] = parts;
          if (!m || !d || !y) return null;
          return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        };

        const exIso = parseUsDate(row.exOrEffDate);
        const payIso = parseUsDate(row.paymentDate);

        if (exIso && payIso) {
          map.set(exIso, payIso);
        }
      }
    } catch {
      // Graceful fallback on any network/parse error
    }
    return map;
  });
}
