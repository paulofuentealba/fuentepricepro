import type { Currency } from "../domain";
import type { DividendEvent } from "../domain";
import type { ApiAsset, LiveQuote, QuoteSummary } from "./types";
import { UA, dedupeInFlight, fetchWithRetry, num } from "./http.server";
import { reportIngestionStatus } from "./ingestionLog.server";
import { classifyYahoo } from "./classify.server";
import {
  dividendCagrPct,
  historyFromMap,
  paymentMonthsFromDates,
  pickLast3,
  sumByYear,
} from "./dividendAgg.server";
import { YAHOO_AUTH_TTL_MS } from "./cacheConfig.server";

// Cache Yahoo crumb + cookie on globalThis so HMR / module re-eval preserves
// it, and so concurrent callers share one in-flight fetch instead of each
// hitting fc.yahoo.com independently. Per-isolate only (Workers can't share
// across isolates without KV) — but this eliminates the intra-isolate storm.
type YahooAuth = { crumb: string; cookie: string; expiresAt: number };
const g = globalThis as unknown as { __yahooAuth?: YahooAuth | null };
const AUTH_TTL_MS = YAHOO_AUTH_TTL_MS;

export async function getYahooAuth(): Promise<{ crumb: string; cookie: string } | null> {
  const cached = g.__yahooAuth;
  if (cached && cached.expiresAt > Date.now()) return cached;

  return dedupeInFlight("yahoo:auth", async () => {
    // Re-check after awaiting the lock — another caller may have populated it.
    const fresh = g.__yahooAuth;
    if (fresh && fresh.expiresAt > Date.now()) return fresh;
    try {
      const r = await fetchWithRetry(
        "https://fc.yahoo.com",
        "yahoo",
        { headers: { "User-Agent": UA } },
        { timeoutMs: 2000, retries: 0 },
      );
      const setCookie = r.headers.get("set-cookie") || "";
      const cookie = setCookie
        .split(",")
        .map((c) => c.split(";")[0].trim())
        .filter(Boolean)
        .join("; ");
      if (!cookie) {
        reportIngestionStatus("yahoo", "INVALID", "missing set-cookie from fc.yahoo.com");
        return null;
      }
      const cr = await fetchWithRetry(
        "https://query1.finance.yahoo.com/v1/test/getcrumb",
        "yahoo",
        {
          headers: { "User-Agent": UA, Cookie: cookie },
        },
        { timeoutMs: 2000, retries: 0 },
      );
      if (!cr.ok) return null;
      const crumb = (await cr.text()).trim();
      if (!crumb) return null;
      g.__yahooAuth = { crumb, cookie, expiresAt: Date.now() + AUTH_TTL_MS };
      return g.__yahooAuth;
    } catch {
      return null;
    }
  });
}

function invalidateYahooAuth() {
  g.__yahooAuth = null;
}

export async function fetchYahooQuoteSummary(ticker: string): Promise<QuoteSummary | null> {
  const auth = await getYahooAuth();
  if (!auth) return null;
  const modules = "summaryDetail,defaultKeyStatistics,financialData,assetProfile,fundProfile";
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
  try {
    const r = await fetchWithRetry(
      url,
      "yahoo",
      { headers: { "User-Agent": UA, Cookie: auth.cookie } },
      { timeoutMs: 2000, retries: 0 },
    );
    if (!r.ok) {
      if (r.status === 401) invalidateYahooAuth();
      return null;
    }
    const j = await r.json();
    const res = j?.quoteSummary?.result?.[0];
    if (!res) {
      reportIngestionStatus("yahoo", "INVALID", "missing quoteSummary.result[0]", ticker);
      return null;
    }
    const sd = res.summaryDetail ?? {};
    const ks = res.defaultKeyStatistics ?? {};
    const fd = res.financialData ?? {};
    const ap = res.assetProfile ?? {};
    const fp = res.fundProfile ?? {};
    return {
      trailingPE: num(sd.trailingPE),
      forwardPE: num(sd.forwardPE),
      priceToBook: num(ks.priceToBook),
      trailingEps: num(ks.trailingEps),
      forwardEps: num(ks.forwardEps),
      returnOnEquity: num(fd.returnOnEquity),
      dividendYield: num(sd.dividendYield),
      marketCap: num(sd.marketCap),
      exDividendDate: num(sd.exDividendDate),
      payoutRatio: num(sd.payoutRatio),
      sector:
        typeof ap.sector === "string"
          ? ap.sector
          : typeof fp.categoryName === "string"
            ? fp.categoryName
            : null,
    };
  } catch {
    return null;
  }
}

export async function fetchFromYahoo(ticker: string): Promise<ApiAsset | null> {
  const t = ticker.toUpperCase();
  return dedupeInFlight(`yahoo:asset:${t}`, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?range=5y&interval=1mo&events=div`;
    const r = await fetchWithRetry(
      url,
      "yahoo",
      { headers: { "User-Agent": UA } },
      { timeoutMs: 2500, retries: 0 },
    );
    if (!r.ok) return null;
    const json = await r.json();
    const res = json?.chart?.result?.[0];
    if (!res?.meta?.regularMarketPrice) {
      reportIngestionStatus("yahoo", "INVALID", "missing chart.result[0].meta.regularMarketPrice", t);
      return null;
    }

    const divsObj = (res.events?.dividends ?? {}) as Record<
      string,
      { amount: number; date: number }
    >;
    const yearMap = sumByYear(
      Object.values(divsObj).map((d) => ({
        year: new Date(d.date * 1000).getUTCFullYear(),
        amount: Number(d.amount) || 0,
      })),
    );

    const type = classifyYahoo({
      symbol: t,
      quoteType: res.meta.instrumentType,
      longname: res.meta.longName,
      shortname: res.meta.shortName,
    });

    // Best-effort fundamentals via authenticated quoteSummary
    const qs = await fetchYahooQuoteSummary(t);

    const exIso =
      qs?.exDividendDate && qs.exDividendDate * 1000 > Date.now()
        ? new Date(qs.exDividendDate * 1000).toISOString()
        : null;

    const dividendHistory = historyFromMap(yearMap, 5);
    const cagr = dividendCagrPct(dividendHistory);
    const paymentMonths = paymentMonthsFromDates(Object.values(divsObj).map((d) => d.date));

    // Expose raw dividend events in parallel (does NOT affect valuation)
    // Yahoo doesn't separate ex-date from payment date; date is the ex-date (unix seconds)
    const dividendEvents: DividendEvent[] = Object.values(divsObj)
      .filter((d) => Number.isFinite(d.amount) && d.amount > 0)
      .map((d) => ({
        exDate: new Date(d.date * 1000).toISOString(),
        paymentDate: null,
        amountPerShare: Number(d.amount),
      }));

    const currency: Currency = (res.meta.currency as Currency) || "USD";
    if (!res.meta.currency) {
      console.warn(`[yahoo] missing currency in response for ${t}, defaulted to USD`);
    }

    return {
      ticker: t,
      name: res.meta.longName || res.meta.shortName || t,
      type,
      currency,
      currentPrice: Number(res.meta.regularMarketPrice),
      dividends3y: pickLast3(yearMap),
      dividendHistory,
      exDividendDate: exIso,
      epsCurrent: qs?.trailingEps ?? null,
      epsNext: qs?.forwardEps ?? null,
      paymentMonths,
      sector: qs?.sector ?? null,
      dividendEvents,
      metrics: {
        peRatio: qs?.trailingPE ?? qs?.forwardPE ?? null,
        pbRatio: qs?.priceToBook ?? null,
        eps: qs?.trailingEps ?? null,
        roe: qs?.returnOnEquity != null ? qs.returnOnEquity * 100 : null,
        currentDy: qs?.dividendYield != null ? qs.dividendYield * 100 : null,
        capRate: null,
        vacancy: null,
        expenseRatio: null,
        aum: qs?.marketCap != null ? qs.marketCap / 1_000_000 : null,
        trackingError: null,
        payoutRatio: qs?.payoutRatio != null ? qs.payoutRatio * 100 : null,
        dividendCagr5y: cagr,
      },
    };
  });
}

export async function fetchYahooQuote(ticker: string): Promise<LiveQuote | null> {
  return dedupeInFlight(`yahoo:quote:${ticker}`, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=1d`;
    try {
      const r = await fetchWithRetry(
        url,
        "yahoo",
        { headers: { "User-Agent": UA } },
        { timeoutMs: 2500, retries: 0 },
      );
      if (!r.ok) return null;
      const json = await r.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) {
        reportIngestionStatus("yahoo", "INVALID", "missing chart.result[0].meta.regularMarketPrice", ticker);
        return null;
      }
      const price = Number(meta.regularMarketPrice);
      const prev = Number(meta.chartPreviousClose ?? meta.previousClose);
      const changePct = Number.isFinite(prev) && prev > 0 ? ((price - prev) / prev) * 100 : null;
      return { ticker, price, changePct };
    } catch {
      return null;
    }
  });
}
