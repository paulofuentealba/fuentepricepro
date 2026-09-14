import type { CorporateEventType } from "../corporateEvents";

export interface RawCorporateEvent {
  source: "yahoo" | "brapi";
  type: CorporateEventType;
  ratio: number;
  date: number; // ms timestamp
  rawDateStr?: string;
}

export interface ReconciledCorporateEvent {
  eventId: string;
  ticker: string;
  type: CorporateEventType;
  ratio: number;
  date: number;
  effectiveDate: string; // YYYY-MM-DD
  confidence: "confirmed" | "single_source" | "divergent";
  sources: Array<"yahoo" | "brapi">;
  rawDetails?: {
    yahoo?: { ratio: number; date: number };
    brapi?: { ratio: number; date: number };
  };
}

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const RATIO_TOLERANCE = 0.001;

function formatDateIso(timestampMs: number): string {
  const d = new Date(timestampMs);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export function generateEventId(ticker: string, dateMs: number, type: string, ratio: number): string {
  const dateStr = formatDateIso(dateMs).replace(/-/g, "");
  const cleanRatio = ratio.toFixed(4).replace(/\.?0+$/, "");
  return `${ticker.toLowerCase()}_${dateStr}_${type}_${cleanRatio}`;
}

/**
 * Reconciles corporate events across multiple data sources (Yahoo Finance, Brapi).
 *
 * Consensus rules:
 * - If 2 sources match on type and ratio within a ±5 day window: CONFIRMED (Fast-Path).
 * - If 2 sources report an event in the same window but diverge in ratio or type: DIVERGENT (Slow-Path).
 * - If only 1 source reports the event: SINGLE_SOURCE (Slow-Path).
 */
export function reconcileCorporateEvents(
  ticker: string,
  yahooEvents: RawCorporateEvent[],
  brapiEvents: RawCorporateEvent[],
): ReconciledCorporateEvent[] {
  const normalizedTicker = ticker.trim().toUpperCase();
  const reconciled: ReconciledCorporateEvent[] = [];
  const usedBrapiIndices = new Set<number>();

  for (const yEvent of yahooEvents) {
    let matchedBrapiIdx = -1;

    for (let i = 0; i < brapiEvents.length; i++) {
      if (usedBrapiIndices.has(i)) continue;
      const bEvent = brapiEvents[i];
      const timeDiff = Math.abs(yEvent.date - bEvent.date);

      if (timeDiff <= FIVE_DAYS_MS) {
        matchedBrapiIdx = i;
        break;
      }
    }

    if (matchedBrapiIdx !== -1) {
      usedBrapiIndices.add(matchedBrapiIdx);
      const bEvent = brapiEvents[matchedBrapiIdx];

      const typeMatches = yEvent.type === bEvent.type;
      const ratioMatches = Math.abs(yEvent.ratio - bEvent.ratio) < RATIO_TOLERANCE;

      if (typeMatches && ratioMatches) {
        reconciled.push({
          eventId: generateEventId(normalizedTicker, yEvent.date, yEvent.type, yEvent.ratio),
          ticker: normalizedTicker,
          type: yEvent.type,
          ratio: yEvent.ratio,
          date: Math.max(yEvent.date, bEvent.date),
          effectiveDate: formatDateIso(Math.max(yEvent.date, bEvent.date)),
          confidence: "confirmed",
          sources: ["yahoo", "brapi"],
          rawDetails: {
            yahoo: { ratio: yEvent.ratio, date: yEvent.date },
            brapi: { ratio: bEvent.ratio, date: bEvent.date },
          },
        });
      } else {
        reconciled.push({
          eventId: generateEventId(normalizedTicker, yEvent.date, yEvent.type, yEvent.ratio),
          ticker: normalizedTicker,
          type: yEvent.type,
          ratio: yEvent.ratio,
          date: yEvent.date,
          effectiveDate: formatDateIso(yEvent.date),
          confidence: "divergent",
          sources: ["yahoo", "brapi"],
          rawDetails: {
            yahoo: { ratio: yEvent.ratio, date: yEvent.date },
            brapi: { ratio: bEvent.ratio, date: bEvent.date },
          },
        });
      }
    } else {
      reconciled.push({
        eventId: generateEventId(normalizedTicker, yEvent.date, yEvent.type, yEvent.ratio),
        ticker: normalizedTicker,
        type: yEvent.type,
        ratio: yEvent.ratio,
        date: yEvent.date,
        effectiveDate: formatDateIso(yEvent.date),
        confidence: "single_source",
        sources: ["yahoo"],
        rawDetails: {
          yahoo: { ratio: yEvent.ratio, date: yEvent.date },
        },
      });
    }
  }

  // Add remaining Brapi events that had no Yahoo match
  for (let i = 0; i < brapiEvents.length; i++) {
    if (usedBrapiIndices.has(i)) continue;
    const bEvent = brapiEvents[i];
    reconciled.push({
      eventId: generateEventId(normalizedTicker, bEvent.date, bEvent.type, bEvent.ratio),
      ticker: normalizedTicker,
      type: bEvent.type,
      ratio: bEvent.ratio,
      date: bEvent.date,
      effectiveDate: formatDateIso(bEvent.date),
      confidence: "single_source",
      sources: ["brapi"],
      rawDetails: {
        brapi: { ratio: bEvent.ratio, date: bEvent.date },
      },
    });
  }

  // Sort descending by date
  return reconciled.sort((a, b) => b.date - a.date);
}
