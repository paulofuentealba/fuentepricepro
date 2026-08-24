import { dedupeInFlight, fetchWithRetry } from "./http.server";
import { reportIngestionStatus } from "./ingestionLog.server";
import type { AssetType } from "../domain";

/**
 * Fetches dividend payment dates from Nasdaq Public API for a US stock or ETF.
 * Returns a Map of `exDate (YYYY-MM-DD)` -> `paymentDate (YYYY-MM-DD)`.
 * If ticker is NYSE-listed or fails, returns an empty Map gracefully without throwing.
 */
export async function fetchNasdaqDividends(
  ticker: string,
  assetType?: AssetType,
): Promise<Map<string, string>> {
  const clean = ticker.toUpperCase().trim();
  const assetClass = assetType === "ETF" ? "etf" : "stocks";
  return dedupeInFlight(`nasdaq:dividends:${clean}:${assetClass}`, async () => {
    const map = new Map<string, string>();
    try {
      const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(clean)}/dividends?assetclass=${assetClass}`;
      const res = await fetchWithRetry(url, "nasdaq", {
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
      if (!Array.isArray(rows)) {
        reportIngestionStatus("nasdaq", "INVALID", "missing dividends.rows array", clean);
        return map;
      }

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
