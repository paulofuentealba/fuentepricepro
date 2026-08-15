import { fetchWithTimeout } from "./http.server";

export const DEFAULT_US_TREASURY_10Y = 4.25; // 4.25% safe fallback

interface FredCacheEntry {
  value: number;
  timestamp: number;
}

let cachedTreasury10Y: FredCacheEntry | null = null;
const FRED_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches the US 10-Year Treasury Yield (DGS10) from the FRED API.
 * Features in-memory caching (24h TTL), timeout resiliency (3s), and deterministic 4.25% fallback.
 */
export async function fetchUsTreasury10Y(apiKey?: string): Promise<number> {
  const now = Date.now();
  if (cachedTreasury10Y && now - cachedTreasury10Y.timestamp < FRED_CACHE_TTL_MS) {
    return cachedTreasury10Y.value;
  }

  const key = apiKey || (typeof process !== "undefined" ? process.env?.FRED_API_KEY : undefined);
  if (!key) {
    return DEFAULT_US_TREASURY_10Y;
  }

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${key}&file_type=json&sort_order=desc&limit=5`;
    const res = await fetchWithTimeout(url, {}, 3000);
    if (!res.ok) {
      return DEFAULT_US_TREASURY_10Y;
    }

    const data = await res.json();
    const observations = data?.observations;
    if (Array.isArray(observations) && observations.length > 0) {
      for (const obs of observations) {
        const val = parseFloat(obs.value);
        if (Number.isFinite(val) && val > 0) {
          cachedTreasury10Y = { value: val, timestamp: now };
          return val;
        }
      }
    }
  } catch {
    // Graceful fallback on network timeout or failure
  }

  return DEFAULT_US_TREASURY_10Y;
}
