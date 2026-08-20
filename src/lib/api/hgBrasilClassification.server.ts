import type { AssetType } from "../domain";
import { dedupeInFlight, fetchWithTimeout, UA } from "./http.server";
import { reportIngestionStatus } from "./ingestionLog.server";
import { getAdminFirestore } from "../../integrations/firebase/admin";

export const ASSET_CLASSIFICATION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface HgBrasilTickerItem {
  ticker: string;
  kind: string;
  symbol: string;
  name: string;
  full_name: string;
  tax_id?: string | null;
  classification?: {
    sector?: string | null;
    subsector?: string | null;
    segment?: string | null;
  } | null;
}

export interface HgBrasilTickersResponse {
  metadata?: {
    key_status?: string;
    cached?: boolean;
    response_time_ms?: number;
    language?: string;
  };
  results?: HgBrasilTickerItem[];
}

export interface CachedClassificationEntry {
  type: AssetType;
  kind: string;
  cachedAt: number;
}

const memoryClassificationCache = new Map<string, CachedClassificationEntry>();

/**
 * Clears the in-memory classification cache (primarily for unit tests).
 */
export function clearClassificationMemoryCache(): void {
  memoryClassificationCache.clear();
}

/**
 * Resolves a raw HG Brasil ticker item into a canonical AssetType.
 */
export function mapHgItemToAssetType(item: HgBrasilTickerItem, cleanTicker: string): AssetType | null {
  const kind = (item.kind || "").toLowerCase().trim();

  if (kind === "fiagro") {
    return "FIAGRO";
  }

  if (kind === "etf") {
    return "ETF";
  }

  if (kind === "stock") {
    return "STOCK_BR";
  }

  if (kind === "bdr") {
    return "STOCK_US";
  }

  if (kind === "fund" || kind === "fii") {
    const text = `${item.name ?? ""} ${item.full_name ?? ""} ${item.classification?.sector ?? ""}`.toLowerCase();
    if (text.includes("infra")) {
      return "FII_INFRA";
    }
    if (kind === "fii") {
      return "FII";
    }

    // Telemetry: report warning when generic fund falls back to FII without infra keyword
    reportIngestionStatus("hgBrasil", "WARNING", "Fund kind fell back to FII without infra keyword", cleanTicker);
    return "FII";
  }

  return null;
}

/**
 * Fetches canonical asset classification from HG Brasil (/v2/finance/tickers).
 * Follows 3-layer architecture: Memory -> Firestore (Admin SDK, 30-day TTL) -> HG Brasil API.
 */
export async function fetchHgBrasilClassification(
  ticker: string,
  apiKey?: string,
): Promise<AssetType | null> {
  const clean = ticker.trim().toUpperCase().replace(/\.SA$/, "");
  if (!clean) return null;

  return dedupeInFlight(`hgBrasil:classification:${clean}`, async () => {
    const now = Date.now();

    // 1. Layer 1: Memory Cache
    const mem = memoryClassificationCache.get(clean);
    if (mem && now - mem.cachedAt < ASSET_CLASSIFICATION_CACHE_TTL_MS) {
      return mem.type;
    }

    // 2. Layer 2: Firestore Server-Side Cache (Admin SDK)
    const adminDb = getAdminFirestore();
    if (adminDb) {
      try {
        const docSnap = await adminDb.collection("tickerClassificationCache").doc(clean).get();
        if (docSnap.exists) {
          const data = docSnap.data();
          if (data && typeof data.cachedAt === "number" && typeof data.type === "string") {
            if (now - data.cachedAt < ASSET_CLASSIFICATION_CACHE_TTL_MS) {
              memoryClassificationCache.set(clean, {
                type: data.type as AssetType,
                kind: data.kind || "",
                cachedAt: data.cachedAt,
              });
              return data.type as AssetType;
            }
          }
        }
      } catch (err) {
        console.error(`[fetchHgBrasilClassification] Firestore cache read error for ${clean}:`, err);
      }
    }

    // 3. Layer 3: Remote Fetch from HG Brasil API
    const key = apiKey || (typeof process !== "undefined" ? process.env?.HGBRASIL_API_KEY : undefined);
    if (!key) {
      reportIngestionStatus("hgBrasil", "SKIPPED", "No HGBRASIL_API_KEY configured", clean);
      return null;
    }

    const url = `https://api.hgbrasil.com/v2/finance/tickers?query=${encodeURIComponent(clean)}&sources=B3&key=${encodeURIComponent(key)}`;

    try {
      const res = await fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent": UA,
            Accept: "application/json",
          },
        },
        4000,
      );

      if (!res.ok) {
        reportIngestionStatus("hgBrasil", "FAILED", `HTTP ${res.status} on tickers endpoint`, clean);
        return null;
      }

      const json = (await res.json()) as HgBrasilTickersResponse;
      const items = json?.results ?? [];
      if (!items || items.length === 0) {
        reportIngestionStatus("hgBrasil", "INVALID", "No tickers returned from HG Brasil", clean);
        return null;
      }

      // Match exact ticker symbol
      const matched =
        items.find(
          (i) =>
            i.symbol?.toUpperCase() === clean ||
            i.ticker?.toUpperCase() === `B3:${clean}` ||
            i.ticker?.toUpperCase() === clean,
        ) || items[0];

      const mappedType = mapHgItemToAssetType(matched, clean);
      if (!mappedType) {
        reportIngestionStatus("hgBrasil", "INVALID", `Unmapped kind: ${matched.kind}`, clean);
        return null;
      }

      // Populate Memory Cache
      memoryClassificationCache.set(clean, {
        type: mappedType,
        kind: matched.kind,
        cachedAt: now,
      });

      // Populate Firestore Cache (Admin SDK)
      if (adminDb) {
        try {
          await adminDb.collection("tickerClassificationCache").doc(clean).set(
            {
              ticker: clean,
              type: mappedType,
              kind: matched.kind,
              sector: matched.classification?.sector ?? null,
              name: matched.name ?? null,
              fullName: matched.full_name ?? null,
              taxId: matched.tax_id ?? null,
              cachedAt: now,
              expiresAt: now + ASSET_CLASSIFICATION_CACHE_TTL_MS,
            },
            { merge: true },
          );
        } catch (dbErr) {
          console.error(`[fetchHgBrasilClassification] Firestore cache write error for ${clean}:`, dbErr);
        }
      }

      reportIngestionStatus("hgBrasil", "PASSED", undefined, clean);
      return mappedType;
    } catch (err: any) {
      reportIngestionStatus("hgBrasil", "ERROR", err?.message || String(err), clean);
      return null;
    }
  });
}
