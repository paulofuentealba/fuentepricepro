import { createServerFn } from "@tanstack/react-start";
import type { ApiAsset, LiveQuote, SearchHit } from "./api/types";
import { UA, fetchWithRetry } from "./api/http.server";
import { classifyBr, classifyYahoo } from "./api/classify.server";
import { fetchFromBrapi } from "./api/brapi.server";
import { fetchFromYahoo, fetchYahooQuote } from "./api/yahoo.server";
import { fetchSecEdgarFacts } from "./api/secEdgar.server";
import { fetchCvmEnrichedFacts } from "./api/cvm.server";
import { fetchNasdaqDividends } from "./api/nasdaq.server";
import { estimatePaymentDate } from "./fiiPaymentRules";

// Re-export public types so existing `@/lib/apiService.functions` imports keep working.
export type { ApiAsset, LiveQuote, SearchHit } from "./api/types";
import { cleanTicker } from "../lib/formatters";

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
        {},
        { timeoutMs: 2500, retries: 0 },
      ).then((r: Response) => (r.ok ? r.json() : null)),
      fetchWithRetry(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=6&newsCount=0`,
        { headers: { "User-Agent": UA } },
        { timeoutMs: 2500, retries: 0 },
      ).then((r: Response) => (r.ok ? r.json() : null)),
    ]);

    if (brRes.status === "fulfilled" && brRes.value?.stocks) {
      for (const s of brRes.value.stocks.slice(0, 6)) {
        if (typeof s === "string") {
          // Fallback in case of old API response
          const t = String(s).toUpperCase();
          const cleaned = cleanTicker(t);
          if (seen.has(cleaned)) continue;
          seen.add(cleaned);
          results.push({ ticker: cleaned, name: t, type: classifyBr(t), sector: null });
        } else if (s.stock) {
          const t = String(s.stock).toUpperCase();
          const cleaned = cleanTicker(t);
          if (seen.has(cleaned)) continue;
          seen.add(cleaned);
          results.push({
            ticker: cleaned,
            name: s.name || t,
            type: classifyBr(t, s.type),
            sector: s.sector || null,
          });
        }
      }
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

    const isYahoo = raw.includes(".") || /^[A-Z]{1,5}$/.test(raw);
    const looksBr = /^[A-Z]{4}\d{1,2}$/.test(raw);

    let asset: ApiAsset | null = null;

    if (looksBr) {
      asset = await fetchFromBrapi(raw);
      if (!asset) asset = await fetchFromYahoo(`${raw}.SA`);
    } else if (isYahoo) {
      asset = await fetchFromYahoo(raw);
    } else {
      asset = await fetchFromYahoo(raw);
    }

    if (!asset) throw new Error("NOT_FOUND");
    
    // Enrich with SEC EDGAR for US stocks/REITs when Yahoo doesn't have BVPS
    if (!looksBr && (asset.metrics.bvps == null || asset.metrics.bvps === undefined)) {
      const secData = await fetchSecEdgarFacts(raw).catch(() => null);
      if (secData?.bvps != null) {
        asset.metrics.bvps = secData.bvps;
      }
    }

    // Enrich with CVM Dados Abertos for BR assets (VPA/LPA & Vacancy)
    if (looksBr) {
      const cvmData = await fetchCvmEnrichedFacts(raw).catch(() => null);
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

    // Enrich paymentDate for US Nasdaq stocks when paymentDate is null from Yahoo
    if (!looksBr && asset.dividendEvents && asset.dividendEvents.length > 0) {
      const nasdaqMap = await fetchNasdaqDividends(raw).catch(() => new Map<string, string>());
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

    // Enrich paymentDate for BR FIIs/FIAGROs when paymentDate is null using business day rules
    if (looksBr && asset.dividendEvents && asset.dividendEvents.length > 0) {
      for (const ev of asset.dividendEvents) {
        if (ev.paymentDate == null && ev.exDate) {
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

    return { ...asset, ticker: cleanTicker(asset.ticker) };
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
    const fallback = { USDBRL: 5.5 };
    try {
      const q = await fetchYahooQuote("BRL=X");
      if (q && q.price > 0) {
        return { USDBRL: q.price };
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
        if (asset && asset.metrics.dividendCagr5y) {
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
    return { ticker, sinceTimestamp: data.sinceTimestamp };
  })
  .handler(async ({ data }) => {
    const ticker = data.ticker;
    const isBr = /^[A-Z]{4}\d{1,2}$/.test(ticker);
    const yhTicker = isBr && !ticker.endsWith(".SA") ? `${ticker}.SA` : ticker;

    try {
      const res = await fetchWithRetry(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yhTicker)}?events=split`,
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

export const fetchMacroRatesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ cdi: number; ipca: number }> => {
    const fallback = { cdi: 10.5, ipca: 4.5 };

    try {
      const fetchWithTimeout = (url: string) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);
        return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
      };

      const [cdiRes, ipcaRes] = await Promise.all([
        fetchWithTimeout(
          "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json",
        ),
        fetchWithTimeout(
          "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json",
        ),
      ]);

      if (cdiRes.ok && ipcaRes.ok) {
        const cdiData = await cdiRes.json();
        const ipcaData = await ipcaRes.json();

        let cdi = fallback.cdi;
        let ipca = fallback.ipca;

        if (cdiData && cdiData.length > 0) {
          cdi = parseFloat(cdiData[0].valor);
        }

        if (ipcaData && ipcaData.length > 0) {
          ipca = parseFloat(ipcaData[0].valor);
        }

        return { cdi, ipca };
      }

      console.warn("[MacroRates] BACEN SGS failed, using fallback.");
      return fallback;
    } catch (err) {
      console.warn("[MacroRates] BACEN SGS error:", err);
      return fallback;
    }
  },
);
