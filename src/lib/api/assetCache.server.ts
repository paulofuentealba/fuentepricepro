import type { ApiAsset } from "./types";
import { ASSET_CACHE_TTL_MS } from "./cacheConfig.server";

export { ASSET_CACHE_TTL_MS };

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

import { getAdminFirestore } from "@/integrations/firebase/admin";

/**
 * Reads asset from server cache layer (memory + Firestore fallback if available).
 */
export async function getCachedAsset(ticker: string): Promise<ApiAsset | null> {
  const normalizedTicker = ticker.trim().toUpperCase();
  const memAsset = getAssetFromMemoryCache(normalizedTicker);
  if (memAsset) return memAsset;

  const adminDb = getAdminFirestore();
  if (!adminDb) return null;

  try {
    const docSnap = await adminDb.collection("assets").doc(normalizedTicker).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data && data.cachedAt) {
        const isExpired = Date.now() - data.cachedAt > ASSET_CACHE_TTL_MS;
        if (!isExpired && data.asset) {
          saveAssetToMemoryCache(normalizedTicker, data.asset as ApiAsset, data.cachedAt);
          return data.asset as ApiAsset;
        }
      }
    }
  } catch (err) {
    console.error(`[getCachedAsset] Error reading from Firestore for ${normalizedTicker}:`, err);
  }

  return null;
}

/**
 * Writes asset to server cache layer (Memory + Firestore).
 */
export async function setCachedAsset(ticker: string, asset: ApiAsset): Promise<void> {
  const normalizedTicker = ticker.trim().toUpperCase();
  const now = Date.now();
  saveAssetToMemoryCache(normalizedTicker, asset, now);

  const adminDb = getAdminFirestore();
  if (!adminDb) return;

  try {
    await adminDb.collection("assets").doc(normalizedTicker).set(
      {
        asset,
        cachedAt: now,
      },
      { merge: true },
    );
  } catch (err) {
    console.error(`[setCachedAsset] Error writing to Firestore for ${normalizedTicker}:`, err);
  }
}
