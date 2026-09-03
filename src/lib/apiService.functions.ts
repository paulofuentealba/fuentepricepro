import { createServerFn } from "@tanstack/react-start";
import type { ApiAsset, LiveQuote, SearchHit } from "./api/types";
import { UA, fetchWithRetry, dedupeInFlight } from "./api/http.server";
import { reportIngestionStatus } from "./api/ingestionLog.server";
import { MACRO_RATES_CACHE_TTL_MS } from "./api/cacheConfig.server";
import { classifyBrAsync, classifyYahoo } from "./api/classify.server";
import { fetchFromBrapi } from "./api/brapi.server";
import { fetchFromYahoo, fetchYahooQuote } from "./api/yahoo.server";
import { fetchSecEdgarFacts, fetchSecEdgarCompanyFacts, getCikForTicker } from "./api/secEdgar.server";
import { calculatePiotroskiFScore, type PiotroskiResult } from "./calculations";
import { fetchCvmEnrichedFacts } from "./api/cvm.server";
import { fetchNasdaqDividends } from "./api/nasdaq.server";
import { fetchHgBrasilDividends, fetchHgBrasilExchangeRate } from "./api/hgBrasil.server";
import { estimatePaymentDate } from "./fiiPaymentRules";
import { getCachedAsset, setCachedAsset } from "./api/assetCache.server";

// Re-export public types so existing `@/lib/apiService.server` imports keep working.
export type { ApiAsset, LiveQuote, SearchHit } from "./api/types";
import { cleanTicker } from "../lib/formatters";
import { type MacroRates, MACRO_RATES_FALLBACK, EXCHANGE_RATE_FALLBACK } from "./macroDefaults";

// -------- Input caps (public, unauthenticated endpoints) --------
// Keep these tight — anything past normal user input is abuse, not a real query.
const MAX_QUERY_LEN = 64;
const MAX_TICKER_LEN = 15;
// Tickers: letters, digits, dot, hyphen, equals, underscore, caret (e.g. AAPL, PETR4.SA, ^GSPC, BRL=X).
const TICKER_RE = /^[A-Z0-9.\-=_^]{1,20}$/;

function sanitizeQuery(raw: unknown): string {
  const s = String(raw ?? "")
    .trim()
    .slice(0, MAX_QUERY_LEN);
  // Strip control chars; allow letters/digits/space/./-/&/space typical for company names.
  return s.replace(/[\x00-\x1f\x7f]/g, "");
}

function sanitizeTicker(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .slice(0, MAX_TICKER_LEN);
}

// -------- Search --------

export const searchAssetsFn = createServerFn({ method: "GET" })
  .validator((data: { query: string }) => ({ query: sanitizeQuery(data?.query) }))
  .handler(async ({ data }): Promise<SearchHit[]> => {
    const q = data.query;
    if (!q) return [];

    const results: SearchHit[] = [];
    const seen = new Set<string>();

    const [brRes, yhRes] = await Promise.allSettled([
      fetchWithRetry(
        `https://brapi.dev/api/quote/list?search=${encodeURIComponent(q)}`,
        "brapi",
        {},
        { timeoutMs: 2500, retries: 0 },
      ).then((r: Response) => (r.ok ? r.json() : null)),
      fetchWithRetry(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=6&newsCount=0`,
        "yahoo",
        { headers: { "User-Agent": UA } },
        { timeoutMs: 2500, retries: 0 },
      ).then((r: Response) => (r.ok ? r.json() : null)),
    ]);

    if (brRes.status === "fulfilled" && brRes.value?.stocks) {
      // Collect BR candidates first, then resolve their AssetType via classifyBrAsync in
      // parallel (HG Brasil canonical classification, falling back to the local heuristic).
      // This avoids misclassifying ETFs/funds ending in "11" (e.g. IMAB11) as FII, which the
      // synchronous classifyBr() alone cannot distinguish without HG Brasil's `kind` field.
      const brCandidates: { ticker: string; name: string; sector: string | null; apiType?: string }[] = [];

      for (const s of brRes.value.stocks.slice(0, 10)) {
        if (typeof s === "string") {
          const t = String(s).toUpperCase();
          const cleaned = cleanTicker(t);
          if (seen.has(cleaned)) continue;
          if (t.endsWith("F") && seen.has(t.slice(0, -1))) continue;
          seen.add(cleaned);
          brCandidates.push({ ticker: cleaned, name: t, sector: null });
        } else if (s.stock) {
          const t = String(s.stock).toUpperCase();
          const cleaned = cleanTicker(t);
          if (s.type === "option" || (t.length >= 6 && /^[A-Z]{4}\d{1,2}[A-Z]$/.test(t) && !t.endsWith("F"))) {
            continue;
          }
          if (seen.has(cleaned)) continue;
          if (t.endsWith("F") && seen.has(t.slice(0, -1))) continue;
          seen.add(cleaned);
          brCandidates.push({ ticker: cleaned, name: s.name || t, sector: s.sector || null, apiType: s.type });
        }
      }

      const brTypes = await Promise.all(
        brCandidates.map((c) => classifyBrAsync(c.ticker, c.apiType)),
      );
      brCandidates.forEach((c, i) => {
        results.push({ ticker: c.ticker, name: c.name, type: brTypes[i], sector: c.sector });
      });
    }

    if (yhRes.status === "fulfilled" && yhRes.value?.quotes) {
      for (const q2 of yhRes.value.quotes) {
        if (!q2.symbol) continue;
        const t = String(q2.symbol).toUpperCase();
        // Remove .SA suffix to match Brapi's raw tickers and allow Map deduplication
        const strippedT = t.replace(/\.SA$/, "");
        const cleaned = cleanTicker(strippedT);
        if (seen.has(cleaned)) continue;
        // Skip non-primary exchange BR shadows (e.g. .BK)
        if (/\.(BK|F|MX|TA|IL|VI|BR)$/.test(t)) continue;
        seen.add(cleaned);
        results.push({
          ticker: cleaned,
          name: q2.longname || q2.shortname || strippedT,
          type: classifyYahoo({
            symbol: t,
            quoteType: q2.quoteType,
            longname: q2.longname,
            shortname: q2.shortname,
          }),
          sector: null,
        });
      }
    }

    return results.slice(0, 8);
  });

// -------- Fetch --------

export const fetchAssetFn = createServerFn({ method: "GET" })
  .validator((data: { ticker: string }) => {
    const ticker = sanitizeTicker(data?.ticker);
    if (!ticker || !TICKER_RE.test(ticker)) throw new Error("INVALID_TICKER");
    return { ticker };
  })
  .handler(async ({ data }): Promise<ApiAsset> => {
    const raw = data.ticker;
    if (!raw) throw new Error("NOT_FOUND");

    const cached = await getCachedAsset(raw);
    if (cached) return cached;

    if (process.env.NODE_ENV === "development" && raw === "TEST_IPO_RECENTE") {
      const currentYear = new Date().getUTCFullYear();
      return {
        ticker: "TEST_IPO_RECENTE",
        name: "Synthetic Recent IPO",
        currentPrice: 15.0,
        dividends3y: [1.5, 1.2],
        dividendHistory: [
          { year: currentYear - 1, amount: 1.5 },
          { year: currentYear - 2, amount: 1.2 },
        ],
        exDividendDate: null,
        epsCurrent: 1.0,
        epsNext: 1.1,
        paymentMonths: [4, 10],
        dividendEvents: [],
        metrics: {
          peRatio: 15,
          pbRatio: 1.5,
          eps: 1.0,
          roe: 10,
          currentDy: 10,
          capRate: null,
          vacancy: null,
          expenseRatio: null,
          aum: null,
          trackingError: null,
          payoutRatio: 50,
          dividendCagr5y: null,
        },
        type: "STOCK_BR",
        currency: "BRL",
        sector: "Utilities",
      };
    }

    const looksBr = /^[A-Z]{4}\d{1,2}$/.test(raw);

    let asset: ApiAsset | null = null;

    if (looksBr) {
      try {
        asset = await fetchFromBrapi(raw);
      } catch (err) {
        console.error(`[fetchAsset] Brapi error for ${raw}, falling back to Yahoo:`, err);
      }
      if (!asset) {
        try {
          asset = await fetchFromYahoo(`${raw}.SA`);
        } catch (err) {
          console.error(`[fetchAsset] Yahoo error for ${raw}.SA:`, err);
        }
      }
    } else {
      try {
        asset = await fetchFromYahoo(raw);
      } catch (err) {
        console.error(`[fetchAsset] Yahoo error for ${raw}:`, err);
      }
    }

    if (!asset) throw new Error("NOT_FOUND");
    
    // Deep enough clone to allow mutation of metrics and events without polluting dedupeInFlight cache
    asset = {
      ...asset,
      metrics: { ...asset.metrics },
      dividendEvents: asset.dividendEvents.map((e) => ({ ...e }))
    };

    // Enrich BR dividends & financials via HG Brasil + Dados de Mercado + CVM.
    // All four lookups only depend on `raw` (the ticker), not on each other's
    // output, so they run concurrently instead of adding up their latencies.
    if (looksBr) {
      const [canonicalType, hgRes, dmRes, cvmData] = await Promise.all([
        classifyBrAsync(raw).catch(() => null),
        fetchHgBrasilDividends(raw).catch(() => null),
        import("./api/dadosDeMercadoScraper.server").then((m) => m.fetchDadosDeMercado(raw)).catch(() => null),
        fetchCvmEnrichedFacts(raw).catch(() => null),
      ]);

      if (canonicalType) {
        asset.type = canonicalType;
      }

      if (hgRes && hgRes.dividends && hgRes.dividends.length > 0) {
        asset.dividendEvents = hgRes.dividends
          .map((d) => ({
            exDate: d.approvedDate ?? "",
            paymentDate: d.paymentDate ?? null,
            amountPerShare: d.amount,
            isJCP: typeof d.type === "string" && d.type.toUpperCase().includes("JCP"),
          }))
          .filter((e) => e.exDate !== "");
      } else if (dmRes && dmRes.dividendEvents.length > 0) {
        asset.dividendEvents = dmRes.dividendEvents.map((e) => ({ ...e }));
      }

      if (dmRes) {
        if (asset.metrics.roe === null) asset.metrics.roe = dmRes.fundamentals.roe ?? null;
        if (asset.metrics.currentDy === null) asset.metrics.currentDy = dmRes.fundamentals.dy ?? null;
        if (asset.metrics.peRatio === null && dmRes.fundamentals.pl) asset.metrics.peRatio = dmRes.fundamentals.pl;
        if (asset.metrics.pbRatio === null && dmRes.fundamentals.pvp) asset.metrics.pbRatio = dmRes.fundamentals.pvp;
      }

      if (cvmData) {
        if (asset.metrics.bvps == null && cvmData.vpa != null) {
          asset.metrics.bvps = cvmData.vpa;
        }
        if (asset.metrics.eps == null && cvmData.lpa != null) {
          asset.metrics.eps = cvmData.lpa;
          if (asset.epsCurrent == null) asset.epsCurrent = cvmData.lpa;
        }
        if (asset.metrics.vacancy == null && cvmData.vacancy != null) {
          asset.metrics.vacancy = cvmData.vacancy;
        }
      }
    }

    // Enrich with SEC EDGAR for US stocks/REITs when Yahoo doesn't have BVPS
    if (!looksBr && (asset.metrics.bvps == null || asset.metrics.bvps === undefined)) {
      const secData = await fetchSecEdgarFacts(raw).catch(() => null);
      if (secData?.bvps != null) {
        asset.metrics.bvps = secData.bvps;
      }
    }

    // Enrich paymentDate for US Nasdaq stocks/ETFs when paymentDate is null from Yahoo
    if (!looksBr && asset.dividendEvents && asset.dividendEvents.length > 0) {
      const nasdaqMap = await fetchNasdaqDividends(raw, asset.type).catch(() => new Map<string, string>());
      if (nasdaqMap.size > 0) {
        for (const ev of asset.dividendEvents) {
          if (ev.paymentDate == null && ev.exDate) {
            const exIso = ev.exDate.slice(0, 10);
            const match = nasdaqMap.get(exIso);
            if (match) {
              ev.paymentDate = `${match}T00:00:00.000Z`;
            }
          }
        }
      }
    }

    // Fallback de último recurso: Estimativa de data de pagamento para FIIs/FIAGROs
    // Executa APENAS se o paymentDate continuar genuinamente nulo após consultar HG Brasil / Dados de Mercado.
    // NUNCA sobrescreve uma data de pagamento real confirmada.
    if (looksBr && asset.dividendEvents && asset.dividendEvents.length > 0) {
      for (const ev of asset.dividendEvents) {
        if (ev.paymentDate === null && ev.exDate) {
          const exDateObj = new Date(ev.exDate);
          if (Number.isFinite(exDateObj.getTime())) {
            const estimated = estimatePaymentDate(raw, exDateObj);
            if (estimated) {
              ev.paymentDate = `${estimated}T00:00:00.000Z`;
              ev.paymentDateEstimated = true;
            }
          }
        }
      }
    }

    const cleanedAsset = { ...asset, ticker: cleanTicker(asset.ticker) };
    await setCachedAsset(raw, cleanedAsset);
    return cleanedAsset;
  });

// -------- Lightweight live quote (price + daily change %) --------

export const fetchQuoteFn = createServerFn({ method: "GET" })
  .validator((data: { ticker: string }) => {
    const ticker = sanitizeTicker(data?.ticker);
    if (!ticker || !TICKER_RE.test(ticker)) throw new Error("INVALID_TICKER");
    return { ticker };
  })
  .handler(async ({ data }): Promise<LiveQuote | null> => {
    const raw = data.ticker;
    if (!raw) return null;

    if (process.env.NODE_ENV === "development" && raw === "TEST_IPO_RECENTE") {
      return {
        ticker: "TEST_IPO_RECENTE",
        price: 15.0,
        changePct: 1.5,
      };
    }

    const looksBr = /^[A-Z]{4}\d{1,2}$/.test(raw);
    const primary = looksBr && !raw.endsWith(".SA") ? `${raw}.SA` : raw;
    const q = await fetchYahooQuote(primary);
    if (q) return { ...q, ticker: cleanTicker(raw) };
    return null;
  });

// -------- Exchange Rate Oracle --------

export const fetchExchangeRatesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ USDBRL: number }> => {
    // Fallback default in case of failure to prevent UI crashing
    const fallback = { USDBRL: EXCHANGE_RATE_FALLBACK };
    try {
      const rate = await fetchHgBrasilExchangeRate();
      if (rate != null && rate > 0) {
        return { USDBRL: rate };
      }
      return fallback;
    } catch {
      return fallback;
    }
  },
);

// -------- Radar --------

const BR_RADAR_TICKERS = [
  "BBAS3",
  "TAEE11",
  "PETR4",
  "VALE3",
  "TRPL4",
  "CMIG4",
  "EGIE3",
  "BBSE3",
  "CXSE3",
  "DIVO11",
  "BIVB39",
  "NDIV11",
  "MXRF11",
  "BTLG11",
  "HGLG11",
];
const US_RADAR_TICKERS = [
  "O",
  "KO",
  "PEP",
  "JNJ",
  "PG",
  "ABBV",
  "CVX",
  "XOM",
  "VZ",
  "SPYI",
  "QQQI",
  "KBWD",
  "SCHD",
  "JEPI",
  "JEPQ",
  "BTCI",
  "IBIT",
];

let radarCache: { br: any[]; us: any[]; timestamp: number } | null = null;
const RADAR_CACHE_TTL = 1000 * 60 * 15; // 15 minutes

export const fetchRadarFn = createServerFn({ method: "GET" }).handler(async () => {
  if (radarCache && Date.now() - radarCache.timestamp < RADAR_CACHE_TTL) {
    return { br: radarCache.br, us: radarCache.us };
  }

  const fetchRadarFor = async (tickers: string[]) => {
    const promises = tickers.map(async (t) => {
      try {
        let asset: ApiAsset | null = null;
        if (t.length >= 5 && !t.includes(".")) {
          asset = await fetchFromBrapi(t);
          if (!asset) asset = await fetchFromYahoo(`${t}.SA`);
        } else {
          asset = await fetchFromYahoo(t);
        }
        if (asset) {
          return { ...asset, ticker: cleanTicker(asset.ticker) };
        }
      } catch (e) {
        console.warn(`Failed to fetch radar asset ${t}`, e);
      }
      return null;
    });

    const settled = await Promise.allSettled(promises);
    const results = settled
      .filter(
        (r): r is PromiseFulfilledResult<ApiAsset> => r.status === "fulfilled" && r.value !== null,
      )
      .map((r) => r.value);

    return results;
  };

  const [br, us] = await Promise.all([
    fetchRadarFor(BR_RADAR_TICKERS),
    fetchRadarFor(US_RADAR_TICKERS),
  ]);

  radarCache = { br, us, timestamp: Date.now() };
  return { br, us };
});

// -------- Corporate Events --------

export const checkPendingSplitsFn = createServerFn({ method: "GET" })
  .validator((data: { ticker: string; sinceTimestamp: number }) => {
    const ticker = sanitizeTicker(data?.ticker);
    if (!ticker) throw new Error("INVALID_TICKER");
    const sinceTimestamp =
      typeof data?.sinceTimestamp === "number" && Number.isFinite(data.sinceTimestamp) && data.sinceTimestamp >= 0
        ? data.sinceTimestamp
        : 0;
    return { ticker, sinceTimestamp };
  })
  .handler(async ({ data }) => {
    const ticker = data.ticker;
    const isBr = /^[A-Z]{4}\d{1,2}$/.test(ticker);
    const yhTicker = isBr && !ticker.endsWith(".SA") ? `${ticker}.SA` : ticker;

    try {
      const res = await fetchWithRetry(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yhTicker)}?events=split&interval=1d&range=5y`,
        "yahoo",
        { headers: { "User-Agent": UA } },
        { timeoutMs: 3000, retries: 1 },
      );
      if (!res.ok) return [];

      const json = await res.json();
      const splits = json?.chart?.result?.[0]?.events?.splits || {};
      const events = [];

      for (const key in splits) {
        const sp = splits[key];
        if (sp.date * 1000 > data.sinceTimestamp) {
          const factor = sp.numerator / sp.denominator;
          const type = factor > 1 ? "split" : "grouping";
          events.push({
            eventId: `yh_${sp.date}`,
            date: sp.date * 1000,
            type,
            ratio: factor,
          });
        }
      }
      return events;
    } catch (error) {
      console.warn(`[checkPendingSplitsFn] Failed to check splits for ${ticker}`, error);
      return [];
    }
  });

// -------- Macro Rates Oracle --------

interface MacroRatesCacheEntry {
  rates: MacroRates;
  cachedAt: number;
}
let macroRatesMemoryCache: MacroRatesCacheEntry | null = null;

async function fetchMacroRatesUncached(): Promise<MacroRates> {
  const fallback = MACRO_RATES_FALLBACK;

  try {
    const [selicRes, cdiRes, ipcaRes] = await Promise.all([
      fetchWithRetry(
        "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json",
        "macroRates",
        {},
        { timeoutMs: 5000, retries: 1 },
      ),
      fetchWithRetry(
        "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json",
        "macroRates",
        {},
        { timeoutMs: 5000, retries: 1 },
      ),
      fetchWithRetry(
        "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json",
        "macroRates",
        {},
        { timeoutMs: 5000, retries: 1 },
      ),
    ]);

    let selic = fallback.selic;
    let cdi = fallback.cdi;
    let ipca = fallback.ipca;

    if (selicRes.ok) {
      const selicData = await selicRes.json();
      if (selicData && selicData.length > 0 && selicData[0].valor) {
        selic = parseFloat(selicData[0].valor);
      }
    }

    if (cdiRes.ok) {
      const cdiData = await cdiRes.json();
      if (cdiData && cdiData.length > 0 && cdiData[0].valor) {
        cdi = parseFloat(cdiData[0].valor);
      }
    }

    if (ipcaRes.ok) {
      const ipcaData = await ipcaRes.json();
      if (ipcaData && ipcaData.length > 0 && ipcaData[0].valor) {
        ipca = parseFloat(ipcaData[0].valor);
      }
    }

    return { selic, cdi, ipca };
  } catch (err) {
    reportIngestionStatus(
      "macroRates",
      "ERROR",
      err instanceof Error ? err.message : String(err),
    );
    return fallback;
  }
}

export const fetchMacroRatesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<MacroRates> => {
    const now = Date.now();
    if (macroRatesMemoryCache && now - macroRatesMemoryCache.cachedAt < MACRO_RATES_CACHE_TTL_MS) {
      return macroRatesMemoryCache.rates;
    }
    return dedupeInFlight("macroRates:bacenSgs", async () => {
      const rates = await fetchMacroRatesUncached();
      macroRatesMemoryCache = { rates, cachedAt: now };
      return rates;
    });
  },
);

// -------- Benchmark History Oracle --------

import {
  type BenchmarkPoint,
  type BenchmarkType,
} from "./benchmark";
import {
  fetchBcbBenchmarkSeries,
  fetchYahooBenchmarkSeries,
  fetchIpcaFiveYearAverage,
} from "./benchmark.server";

export type { BenchmarkPoint, BenchmarkType };

const VALID_BENCHMARKS = new Set<BenchmarkType>(["CDI", "SELIC", "IBOV", "SPX"]);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeBenchmarkDate(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!ISO_DATE_RE.test(trimmed)) return "";
  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? "" : trimmed;
}

export const fetchBenchmarkHistoryFn = createServerFn({ method: "GET" })
  .validator(
    (data: {
      benchmark: BenchmarkType;
      fromDate: string;
      toDate: string;
    }) => {
      const benchmark = VALID_BENCHMARKS.has(data?.benchmark)
        ? data.benchmark
        : ("" as BenchmarkType);
      const fromDate = sanitizeBenchmarkDate(data?.fromDate);
      const toDate = sanitizeBenchmarkDate(data?.toDate);
      return { benchmark, fromDate, toDate };
    },
  )
  .handler(async ({ data }): Promise<BenchmarkPoint[]> => {
    const { benchmark, fromDate, toDate } = data || {};
    if (!benchmark || !fromDate || !toDate) return [];

    try {
      switch (benchmark) {
        case "CDI":
          // BCB SGS Series 12: Taxa de juros - CDI diária (% a.d.)
          return await fetchBcbBenchmarkSeries(12, fromDate, toDate);
        case "SELIC":
          // BCB SGS Series 11: Taxa de juros - Selic diária (% a.d.)
          return await fetchBcbBenchmarkSeries(11, fromDate, toDate);
        case "IBOV":
          return await fetchYahooBenchmarkSeries("^BVSP", fromDate, toDate);
        case "SPX":
          return await fetchYahooBenchmarkSeries("^GSPC", fromDate, toDate);
        default:
          return [];
      }
    } catch (err) {
      console.warn(`[fetchBenchmarkHistoryFn] Error fetching benchmark ${benchmark}`, err);
      return [];
    }
  });

/**
 * IPCA 5-year average (annualized), used as the dynamic terminal growth
 * rate for the Gordon 2-Stage model. `null` when the BCB fetch fails or
 * returns too few months — callers fall back to `GORDON_TERMINAL_GROWTH_RATE`.
 */
export const fetchIpcaFiveYearAverageFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<number | null> => {
    try {
      return await fetchIpcaFiveYearAverage();
    } catch (err) {
      console.warn("[fetchIpcaFiveYearAverageFn] failed", err);
      return null;
    }
  },
);

/**
 * Formats a ticker string for Yahoo Finance querying.
 * Brazilian stocks (regex /^[A-Z]{4}\d{1,2}$/) receive .SA suffix if missing.
 * US assets or custom symbols are returned trimmed in uppercase.
 */
export function formatYahooTicker(ticker: string): string {
  const clean = (ticker || "").trim().toUpperCase();
  if (!clean) return "";
  const isBr = /^[A-Z]{4}\d{1,2}$/.test(clean);
  if (isBr && !clean.endsWith(".SA")) {
    return `${clean}.SA`;
  }
  return clean;
}

/**
 * Server function to fetch historical price series and calculate cumulative return (%)
 * for an individual asset ticker via Yahoo Finance.
 */
export const fetchAssetPriceHistoryFn = createServerFn({ method: "GET" })
  .validator(
    (data: { ticker: string; fromDate: string; toDate: string }) => {
      const rawTicker = sanitizeTicker(data?.ticker);
      const ticker = TICKER_RE.test(rawTicker) ? rawTicker : "";
      const fromDate = sanitizeBenchmarkDate(data?.fromDate);
      const toDate = sanitizeBenchmarkDate(data?.toDate);
      return { ticker, fromDate, toDate };
    },
  )
  .handler(async ({ data }): Promise<BenchmarkPoint[]> => {
    const { ticker, fromDate, toDate } = data || {};
    if (!ticker || !fromDate || !toDate) return [];

    try {
      const yhSymbol = formatYahooTicker(ticker);
      return await fetchYahooBenchmarkSeries(yhSymbol, fromDate, toDate);
    } catch (err) {
      console.warn(`[fetchAssetPriceHistoryFn] Failed for ${ticker}`, err);
      return [];
    }
  });

// -------- Piotroski F-Score (US-only, Fase 1) --------

export interface PiotroskiScoreResponse extends PiotroskiResult {
  ticker: string;
  cik: string | null;
  /** Fiscal years actually used for the comparison, most recent first. Empty when
   * fewer than 2 fiscal years of SEC EDGAR data were available. */
  yearsUsed: number[];
}

const EMPTY_PIOTROSKI_CRITERIA: PiotroskiScoreResponse["criteria"] = {
  positiveNetIncome: null,
  positiveOperatingCashFlow: null,
  roaImproving: null,
  cashFlowExceedsNetIncome: null,
  leverageDecreasing: null,
  currentRatioImproving: null,
  noNewShares: null,
  grossMarginImproving: null,
  assetTurnoverImproving: null,
};

/**
 * Server function to compute the Piotroski F-Score for a US ticker from SEC
 * EDGAR data. Fails soft — returns `score: null` with `criteriaAvailable: 0`
 * when the ticker isn't found on SEC EDGAR or fewer than 2 fiscal years of
 * data are available, never throws for a "just no data" case.
 */
export const fetchPiotroskiScoreFn = createServerFn({ method: "GET" })
  .validator((data: { ticker: string }) => ({ ticker: sanitizeTicker(data?.ticker) }))
  .handler(async ({ data }): Promise<PiotroskiScoreResponse> => {
    const ticker = data.ticker;
    const empty: PiotroskiScoreResponse = {
      ticker,
      cik: null,
      score: null,
      criteria: EMPTY_PIOTROSKI_CRITERIA,
      criteriaAvailable: 0,
      yearsUsed: [],
    };
    if (!ticker) return empty;

    try {
      const cik = await getCikForTicker(ticker);
      if (!cik) return empty;

      const facts = await fetchSecEdgarCompanyFacts(cik);
      if (!facts || facts.years.length < 2) {
        return { ...empty, cik };
      }

      const [current, prior] = facts.years;
      const result = calculatePiotroskiFScore(current, prior);

      return {
        ticker,
        cik,
        ...result,
        yearsUsed: [current.fiscalYear, prior.fiscalYear],
      };
    } catch (err) {
      console.warn(`[fetchPiotroskiScoreFn] Failed for ${ticker}`, err);
      return empty;
    }
  });
