import { getAdminFirestore } from "../../integrations/firebase/admin";
import { reportIngestionStatus } from "./ingestionLog.server";
import { CVM_DIVIDENDS_CACHE_TTL_MS } from "./cacheConfig.server";
import cvmLocalEvents from "./data/cvm_agenda_events.json";
import type { RawAgendaEvent } from "../dividendRadarLogic";

interface CacheState {
  events: RawAgendaEvent[];
  timestamp: number;
}

let memoryCache: CacheState | null = null;

export function _resetCvmDividendsMemoryCache(): void {
  memoryCache = null;
}

/**
 * Server-side reader for CVM Dividend Announcements & Agenda Events.
 * Reads from Firestore collection 'agendaDividendEvents' via Firebase Admin SDK with graceful fallback
 * to bundled local CVM cache (cvm_agenda_events.json), with full observability via ingestionLog.
 */
export async function fetchCvmDividendEvents(
  month?: number,
  year: number = 2026,
): Promise<RawAgendaEvent[]> {
  const now = Date.now();

  // 1. Check in-memory cache
  if (memoryCache && now - memoryCache.timestamp < CVM_DIVIDENDS_CACHE_TTL_MS) {
    const list = memoryCache.events;
    return filterByMonth(list, month);
  }

  let events: RawAgendaEvent[] = [];
  let sourceOrigin: "firestore" | "local" = "local";

  // 2. Try Firestore via Admin SDK
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const snapshot = await adminDb.collection("agendaDividendEvents").get();
      if (!snapshot.empty) {
        const firestoreEvents: RawAgendaEvent[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as RawAgendaEvent;
          if (data && data.ticker && data.dateKey && data.eventType) {
            firestoreEvents.push({
              id: data.id || doc.id,
              market: data.market || (data.currency === "USD" ? "US" : "BR"),
              dateKey: data.dateKey,
              month: typeof data.month === "number" ? data.month : parseMonthFromDateKey(data.dateKey),
              isToday: Boolean(data.isToday),
              ticker: data.ticker.toUpperCase(),
              name: data.name || data.ticker,
              type: data.type || "STOCK_BR",
              currency: data.currency || "BRL",
              eventType: data.eventType,
              taxType: data.taxType || "dividendo",
              declaredAmount: Number(data.declaredAmount) || 0,
              reciprocalDate: data.reciprocalDate || "",
              isTrap: Boolean(data.isTrap),
            });
          }
        });

        if (firestoreEvents.length > 0) {
          events = firestoreEvents;
          sourceOrigin = "firestore";
          reportIngestionStatus("cvm_dividends", "PASSED", undefined, `${firestoreEvents.length} events from firestore`);
        }
      }
    }
  } catch (error) {
    console.warn("[CVM Dividends Server] Firestore read failed, falling back to local JSON cache:", error);
    reportIngestionStatus(
      "cvm_dividends",
      "WARNING",
      `Firestore read error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // 3. Fallback to bundled local JSON cache
  if (events.length === 0) {
    events = (cvmLocalEvents as RawAgendaEvent[]).map((e) => ({
      ...e,
      month: typeof e.month === "number" ? e.month : parseMonthFromDateKey(e.dateKey),
    }));
    sourceOrigin = "local";
    reportIngestionStatus("cvm_dividends", "PASSED", undefined, `${events.length} events from local cache`);
  }

  // Deduplicate by ID
  const dedupedMap = new Map<string, RawAgendaEvent>();
  for (const ev of events) {
    dedupedMap.set(ev.id, ev);
  }
  const finalized = Array.from(dedupedMap.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey) || a.ticker.localeCompare(b.ticker)
  );

  memoryCache = {
    events: finalized,
    timestamp: now,
  };

  return filterByMonth(finalized, month);
}

function parseMonthFromDateKey(dateKey: string): number {
  try {
    const parts = dateKey.split("-");
    if (parts.length >= 2) {
      return parseInt(parts[1], 10);
    }
  } catch {
    // fallback
  }
  return 10;
}

function filterByMonth(events: RawAgendaEvent[], month?: number): RawAgendaEvent[] {
  if (typeof month !== "number" || month < 1 || month > 12) {
    return events;
  }
  return events.filter((e) => e.month === month);
}
