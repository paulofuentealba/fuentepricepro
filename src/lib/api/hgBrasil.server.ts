import { fetchWithTimeout, UA } from "./http.server";
import { reportIngestionStatus } from "./ingestionLog.server";

export interface HgBrasilDividendItem {
  type: "Dividendo" | "JCP" | "Rendimento" | string;
  amount: number;
  approvedDate?: string; // "Data Com" / Approval date (ISO YYYY-MM-DD)
  paymentDate: string | null; // Confirmed Payment Date (ISO YYYY-MM-DD)
  lastDatePrior?: string;
  rate?: number;
  relatedTo?: string;
}

export interface HgBrasilDividendsResult {
  ticker: string;
  dividends: HgBrasilDividendItem[];
}

interface CacheEntry {
  result: HgBrasilDividendsResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours in-memory cache to preserve quota

/**
 * Normalizes date strings from HG Brasil (e.g., "2024-05-15", "15/05/2024") into ISO "YYYY-MM-DD".
 */
export function normalizeHgDate(rawDate?: string | null): string | null {
  if (!rawDate || typeof rawDate !== "string") return null;
  const trimmed = rawDate.trim();
  if (!trimmed) return null;

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Format: DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m}-${d}`;
  }

  // ISO timestamp or other parseable date
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Formats Brazilian ticker to HG Brasil format (e.g., "PETR4.SA" -> "B3:PETR4", "VALE3" -> "B3:VALE3").
 */
export function formatHgTicker(ticker: string): string {
  const clean = ticker.trim().toUpperCase().replace(/\.SA$/, "");
  return `B3:${clean}`;
}

/**
 * Fetches dividend records and confirmed payment dates from HG Brasil API.
 * Follows the project's standard error taxonomy and observability.
 */
export async function fetchHgBrasilDividends(
  ticker: string,
  apiKey?: string,
): Promise<HgBrasilDividendsResult | null> {
  const cleanTicker = ticker.trim().toUpperCase().replace(/\.SA$/, "");
  if (!cleanTicker) return null;

  const now = Date.now();
  const cached = cache.get(cleanTicker);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const key = apiKey || (typeof process !== "undefined" ? process.env?.HGBRASIL_API_KEY : undefined);
  if (!key) {
    reportIngestionStatus("hgBrasil", "SKIPPED", "No HGBRASIL_API_KEY configured", cleanTicker);
    return null;
  }

  const hgSymbol = formatHgTicker(cleanTicker);
  const url = `https://api.hgbrasil.com/v2/finance/dividends?tickers=${encodeURIComponent(hgSymbol)}&key=${encodeURIComponent(key)}`;

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
      reportIngestionStatus("hgBrasil", "FAILED", `HTTP ${res.status}`, cleanTicker);
      return null;
    }

    const json = await res.json();

    if (json.errors && Array.isArray(json.errors) && json.errors.length > 0) {
      const firstError = json.errors[0];
      reportIngestionStatus(
        "hgBrasil",
        "WARNING",
        `API Error ${firstError.code || ""}: ${firstError.message || ""}`,
        cleanTicker,
      );
      return null;
    }

    const results = json.results;
    if (!results || !Array.isArray(results) || results.length === 0) {
      reportIngestionStatus("hgBrasil", "WARNING", "Empty results array", cleanTicker);
      return null;
    }

    const firstResult = results[0];
    const rawDividends: any[] =
      firstResult.dividends ||
      firstResult.dividends_history ||
      firstResult.items ||
      [];

    const dividends: HgBrasilDividendItem[] = [];

    for (const raw of rawDividends) {
      const rawAmount = typeof raw.amount === "number" ? raw.amount : parseFloat(String(raw.amount || raw.value || 0));
      const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0;
      const paymentDate = normalizeHgDate(raw.payment_date || raw.paymentDate || raw.date_payment || raw.data_pagamento);
      const approvedDate = normalizeHgDate(raw.approved_date || raw.approvedDate || raw.last_date_prior || raw.data_com);

      dividends.push({
        type: raw.type || raw.dividend_type || "Dividendo",
        amount,
        paymentDate,
        approvedDate: approvedDate || undefined,
        lastDatePrior: raw.last_date_prior ? normalizeHgDate(raw.last_date_prior) || undefined : undefined,
        rate: typeof raw.rate === "number" ? raw.rate : undefined,
        relatedTo: raw.related_to || undefined,
      });
    }

    const result: HgBrasilDividendsResult = {
      ticker: cleanTicker,
      dividends,
    };

    cache.set(cleanTicker, { result, timestamp: now });
    reportIngestionStatus("hgBrasil", "PASSED", `Parsed ${dividends.length} dividends`, cleanTicker);
    return result;
  } catch (err: any) {
    reportIngestionStatus("hgBrasil", "ERROR", err?.message || String(err), cleanTicker);
    return null;
  }
}

/**
 * Enriches a list of existing dividend items (e.g. from Brapi/B3) with confirmed payment dates from HG Brasil.
 * Pure non-destructive enrichment: never overwrites or alters existing valuation data.
 */
export function enrichDividendPaymentDates<T extends { paymentDate?: string | null; approvedDate?: string | null; amount?: number; paymentDateSource?: "hgBrasil" | "provider" | "estimated" | null }>(
  existingDividends: T[],
  hgDividends: HgBrasilDividendItem[],
): T[] {
  if (!hgDividends || hgDividends.length === 0) return existingDividends;

  // Build a fast lookup key based on approvedDate + approximate amount or payment month
  const hgByApproved = new Map<string, string>();
  for (const hg of hgDividends) {
    if (hg.approvedDate && hg.paymentDate) {
      hgByApproved.set(hg.approvedDate, hg.paymentDate);
    }
  }

  return existingDividends.map((item) => {
    // If already has a valid paymentDate, preserve it and mark source if not already marked
    if (item.paymentDate) {
      return {
        ...item,
        paymentDateSource: item.paymentDateSource ?? "provider",
      };
    }

    // Try match by approvedDate ("data com")
    if (item.approvedDate && hgByApproved.has(item.approvedDate)) {
      return {
        ...item,
        paymentDate: hgByApproved.get(item.approvedDate)!,
        paymentDateSource: "hgBrasil",
      };
    }

    return item;
  });
}
