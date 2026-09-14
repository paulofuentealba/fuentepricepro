import { getAdminFirestore } from "../../integrations/firebase/admin";
import { dedupeInFlight, fetchWithRetry } from "./http.server";
import { reportIngestionStatus } from "./ingestionLog.server";
import { normalizeTicker } from "../ticker";
import {
  reconcileCorporateEvents,
  type RawCorporateEvent,
  type ReconciledCorporateEvent,
} from "./corporateEventsReconciler.server";
import type { CorporateEventType } from "../corporateEvents";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface CorporateEventsFirestoreDoc {
  ticker: string;
  events: ReconciledCorporateEvent[];
  updatedAt: number;
}

/**
 * Fetches raw split/grouping events from Yahoo Finance.
 */
export async function fetchYahooEvents(
  ticker: string,
  sinceTimestamp: number = 0,
): Promise<RawCorporateEvent[]> {
  const clean = normalizeTicker(ticker);
  const isBr = /^[A-Z]{4}\d{1,2}$/.test(clean);
  const yhTicker = isBr && !clean.endsWith(".SA") ? `${clean}.SA` : clean;

  try {
    const res = await fetchWithRetry(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yhTicker)}?events=split&interval=1d&range=5y`,
      "yahoo",
      { headers: { "User-Agent": UA } },
      { timeoutMs: 4000, retries: 1 },
    );
    if (!res.ok) return [];

    const json = await res.json();
    const splits = json?.chart?.result?.[0]?.events?.splits || {};
    const events: RawCorporateEvent[] = [];

    for (const key in splits) {
      const sp = splits[key];
      const dateMs = sp.date * 1000;
      if (dateMs > sinceTimestamp) {
        const factor = sp.numerator / sp.denominator;
        const type: CorporateEventType = factor > 1 ? "split" : "grouping";
        events.push({
          source: "yahoo",
          type,
          ratio: factor,
          date: dateMs,
        });
      }
    }
    return events;
  } catch (error) {
    console.warn(`[corporateEventsScan] Yahoo fetch failed for ${clean}:`, error);
    return [];
  }
}

/**
 * Fetches raw stockDividends (splits/groupings) from Brapi.
 */
export async function fetchBrapiEvents(
  ticker: string,
  sinceTimestamp: number = 0,
): Promise<RawCorporateEvent[]> {
  const clean = normalizeTicker(ticker);
  const isBr = /^[A-Z]{4}\d{1,2}$/.test(clean);
  if (!isBr) return []; // Brapi only covers B3

  const token = process.env.BRAPI_TOKEN;
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(clean)}?fundamental=true&dividends=true&range=5y&interval=1mo`;

  try {
    const res = await fetchWithRetry(
      url,
      "brapi",
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      { timeoutMs: 4000, retries: 1 },
    );
    if (!res.ok) return [];

    const json = await res.json();
    const stockDividends = json?.results?.[0]?.dividendsData?.stockDividends;
    if (!Array.isArray(stockDividends)) return [];

    const events: RawCorporateEvent[] = [];

    for (const item of stockDividends) {
      const label = (item.label || "").toUpperCase();
      const isSplit = label.includes("DESDOBRAMENTO") || item.factor > 1;
      const isGrouping = label.includes("GRUPAMENTO") || (item.factor > 0 && item.factor < 1);

      // We explicitly skip bonificacao (BONIFICACAO) per architectural decision
      if (!isSplit && !isGrouping) continue;

      const dateStr = item.lastDatePrior || item.approvedOn;
      if (!dateStr) continue;

      const dateMs = new Date(dateStr).getTime();
      if (isNaN(dateMs) || dateMs <= sinceTimestamp) continue;

      const type: CorporateEventType = isSplit ? "split" : "grouping";
      const factor = Number(item.factor);
      if (!Number.isFinite(factor) || factor <= 0) continue;

      events.push({
        source: "brapi",
        type,
        ratio: factor,
        date: dateMs,
        rawDateStr: dateStr,
      });
    }

    return events;
  } catch (error) {
    console.warn(`[corporateEventsScan] Brapi fetch failed for ${clean}:`, error);
    return [];
  }
}

/**
 * Reconciles corporate events for a single ticker across Yahoo and Brapi.
 */
export async function fetchReconciledCorporateEvents(
  ticker: string,
  sinceTimestamp: number = 0,
): Promise<ReconciledCorporateEvent[]> {
  const clean = normalizeTicker(ticker);
  return dedupeInFlight(`corporateEvents:${clean}:${sinceTimestamp}`, async () => {
    const isBr = /^[A-Z]{4}\d{1,2}$/.test(clean);

    const [yahooEvents, brapiEvents] = await Promise.all([
      fetchYahooEvents(clean, sinceTimestamp),
      isBr ? fetchBrapiEvents(clean, sinceTimestamp) : Promise.resolve([]),
    ]);

    return reconcileCorporateEvents(clean, yahooEvents, brapiEvents);
  });
}

/**
 * Persists reconciled corporate events to public collection `/corporateEvents/{ticker}`.
 * Only callable server-side via Admin SDK.
 */
export async function persistCorporateEventsToFirestore(
  ticker: string,
  events: ReconciledCorporateEvent[],
): Promise<boolean> {
  const clean = normalizeTicker(ticker);
  try {
    const adminDb = getAdminFirestore();
    if (!adminDb) {
      console.warn("[corporateEventsScan] Admin SDK not available to persist corporateEvents");
      return false;
    }

    const docRef = adminDb.collection("corporateEvents").doc(clean);
    await docRef.set(
      {
        ticker: clean,
        events,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    reportIngestionStatus("cvm", "PASSED", `persisted ${events.length} events`, clean);
    return true;
  } catch (error) {
    console.error(`[corporateEventsScan] Failed to persist events for ${clean}:`, error);
    return false;
  }
}

/**
 * Reads corporate events from Firestore public collection `/corporateEvents/{ticker}`.
 */
export async function getCorporateEventsFromFirestore(
  ticker: string,
): Promise<ReconciledCorporateEvent[] | null> {
  const clean = normalizeTicker(ticker);
  try {
    const adminDb = getAdminFirestore();
    if (!adminDb) return null;

    const docSnap = await adminDb.collection("corporateEvents").doc(clean).get();
    if (docSnap.exists) {
      const data = docSnap.data() as CorporateEventsFirestoreDoc;
      return Array.isArray(data.events) ? data.events : [];
    }
    return null;
  } catch (error) {
    console.warn(`[corporateEventsScan] Failed to read from Firestore for ${clean}:`, error);
    return null;
  }
}

/**
 * Central scan function: scans a list of tickers, reconciles dual-source and updates Firestore.
 */
export async function scanBatchCorporateEvents(
  tickers: string[],
  sinceTimestamp: number = 0,
): Promise<Record<string, ReconciledCorporateEvent[]>> {
  const uniqueTickers = Array.from(new Set(tickers.map(normalizeTicker).filter(Boolean)));
  const results: Record<string, ReconciledCorporateEvent[]> = {};

  for (const ticker of uniqueTickers) {
    try {
      const allEvents = await fetchReconciledCorporateEvents(ticker, 0);
      results[ticker] = sinceTimestamp > 0 ? allEvents.filter((e) => e.date > sinceTimestamp) : allEvents;
      if (allEvents.length > 0) {
        await persistCorporateEventsToFirestore(ticker, allEvents);
      }
    } catch (e) {
      console.warn(`[corporateEventsScan] Failed scanning ${ticker}:`, e);
      results[ticker] = [];
    }
  }

  return results;
}
