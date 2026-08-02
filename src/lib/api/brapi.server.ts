import type { Currency } from "../domain";
import type { DividendEvent } from "../domain";
import type { ApiAsset } from "./types";
import { dedupeInFlight, fetchWithRetry } from "./http.server";
import { classifyBr } from "./classify.server";
import {
  dividendCagrPct,
  historyFromMap,
  paymentMonthsFromDates,
  pickLast3,
  sumByYear,
} from "./dividendAgg.server";

export async function fetchFromBrapi(ticker: string): Promise<ApiAsset | null> {
  const clean = ticker.toUpperCase().replace(".SA", "");
  return dedupeInFlight(`brapi:asset:${clean}`, async () => {
    const token = process.env.BRAPI_TOKEN;
    // `fundamental=true` only returns basic P/L + LPA (EPS) at the root of the
    // response — it does NOT include priceToBookRatio, so Graham (which needs
    // BVPS) was always N/A. The real P/VP + Book Value per Share live under
    // the `defaultKeyStatistics` module, which requires a Brapi token for any
    // ticker outside the 4 free test tickers (PETR4/MGLU3/VALE3/ITUB4). Only
    // request the module when a token is configured, so behavior for anyone
    // without BRAPI_TOKEN set stays exactly as before (no broken requests).
    const modulesParam = token ? "&modules=defaultKeyStatistics" : "";
    const url = `https://brapi.dev/api/quote/${encodeURIComponent(clean)}?fundamental=true&dividends=true&range=5y&interval=1mo${modulesParam}`;
    const r = await fetchWithRetry(
      url,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    );
    if (!r.ok) return null;
    const json = await r.json();
    const res = json?.results?.[0];
    if (!res || !res.regularMarketPrice) return null;

    const cash = (res.dividendsData?.cashDividends ?? []) as Array<{
      paymentDate?: string;
      lastDatePrior?: string;
      rate: number;
    }>;
    const yearMap = sumByYear(
      cash
        .map((d) => {
          const iso = d.paymentDate || d.lastDatePrior;
          if (!iso) return null;
          const y = new Date(iso).getUTCFullYear();
          return Number.isFinite(y) ? { year: y, amount: Number(d.rate) || 0 } : null;
        })
        .filter((x): x is { year: number; amount: number } => !!x),
    );

    const eps: number | null =
      typeof res.earningsPerShare === "number"
        ? res.earningsPerShare
        : typeof res.defaultKeyStatistics?.trailingEps === "number"
          ? res.defaultKeyStatistics.trailingEps
          : null;
    const pe: number | null = typeof res.priceEarnings === "number" ? res.priceEarnings : null;
    // Prefer the direct Book Value per Share when available (defaultKeyStatistics.bookValue) —
    // more precise than deriving it downstream from currentPrice / pbRatio.
    const bvps: number | null =
      typeof res.defaultKeyStatistics?.bookValue === "number"
        ? res.defaultKeyStatistics.bookValue
        : null;
    const pb: number | null =
      typeof res.priceToBookRatio === "number"
        ? res.priceToBookRatio
        : typeof res.defaultKeyStatistics?.priceToBook === "number"
          ? res.defaultKeyStatistics.priceToBook
          : null;
    const type = classifyBr(clean);

    // Next ex-dividend date: prefer future lastDatePrior (data com), else future paymentDate
    const nowMs = Date.now();
    const futureDates = cash
      .flatMap((d) => [d.lastDatePrior, d.paymentDate].filter(Boolean) as string[])
      .map((iso) => ({ iso, t: new Date(iso).getTime() }))
      .filter((x) => Number.isFinite(x.t) && x.t > nowMs)
      .sort((a, b) => a.t - b.t);
    const exDividendDate = futureDates[0]?.iso ?? null;

    const dividendHistory = historyFromMap(yearMap, 5);
    const cagr = dividendCagrPct(dividendHistory);
    const payoutRatio =
      eps && eps > 0
        ? Math.min(100, ((dividendHistory[dividendHistory.length - 1]?.amount ?? 0) / eps) * 100)
        : null;

    const paymentMonths = paymentMonthsFromDates(
      cash.map((d) => d.paymentDate || d.lastDatePrior || null),
    );

    // Expose raw dividend events in parallel (does NOT affect valuation)
    const dividendEvents: DividendEvent[] = cash
      .filter((d) => Number.isFinite(Number(d.rate)) && Number(d.rate) > 0)
      .map((d) => ({
        exDate: d.lastDatePrior ?? d.paymentDate ?? "",
        paymentDate: d.paymentDate ?? null,
        amountPerShare: Number(d.rate),
      }))
      .filter((e) => e.exDate !== "");

    return {
      ticker: clean,
      name: res.longName || res.shortName || clean,
      type,
      currency: (res.currency as Currency) || "BRL",
      currentPrice: Number(res.regularMarketPrice),
      dividends3y: pickLast3(yearMap),
      dividendHistory,
      exDividendDate,
      epsCurrent: eps,
      epsNext: null,
      paymentMonths,
      sector: typeof res.sector === "string" ? res.sector : null,
      dividendEvents,
      metrics: {
        peRatio: pe,
        pbRatio: pb,
        eps,
        bvps,
        roe: null,
        currentDy: null,
        capRate: null,
        vacancy: null,
        expenseRatio: null,
        aum: typeof res.marketCap === "number" ? res.marketCap / 1_000_000 : null,
        trackingError: null,
        payoutRatio,
        dividendCagr5y: cagr,
      },
    };
  });
}
