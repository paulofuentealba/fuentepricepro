import type { ApiAsset } from "./types";

/**
 * Named constant for server-side asset cache TTL.
 * Default: 5 minutes (300,000 ms), balancing market freshness with API rate limit conservation.
 */
export const ASSET_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  asset: ApiAsset;
  cachedAt: number;
}

/** In-memory fast layer cache (per Cloud Run instance / server process) */
const memoryCache = new Map<string, CacheEntry>();

/**
 * Retrieves an asset from memory cache if present and fresh (age < ASSET_CACHE_TTL_MS).
 */
export function getAssetFromMemoryCache(ticker: string, now: number = Date.now()): ApiAsset | null {
  const normalizedTicker = ticker.trim().toUpperCase();
  const entry = memoryCache.get(normalizedTicker);
  if (!entry) return null;

  const isExpired = now - entry.cachedAt > ASSET_CACHE_TTL_MS;
  if (isExpired) {
    memoryCache.delete(normalizedTicker);
    return null;
  }

  return entry.asset;
}

/**
 * Saves an asset to the memory cache.
 */
export function saveAssetToMemoryCache(
  ticker: string,
  asset: ApiAsset,
  now: number = Date.now(),
): void {
  const normalizedTicker = ticker.trim().toUpperCase();
  memoryCache.set(normalizedTicker, {
    asset,
    cachedAt: now,
  });
}

/**
 * Clears the in-memory cache (primarily for tests).
 */
export function clearAssetMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Reads asset from server cache layer (memory + Firestore fallback if available).
 */
export async function getCachedAsset(ticker: string): Promise<ApiAsset | null> {
  const memAsset = getAssetFromMemoryCache(ticker);
  if (memAsset) return memAsset;
  return null;
}

/**
 * Writes asset to server cache layer.
 */
export async function setCachedAsset(ticker: string, asset: ApiAsset): Promise<void> {
  saveAssetToMemoryCache(ticker, asset);
}
