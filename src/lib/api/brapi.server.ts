import type { Currency } from "../domain";
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
    const url = `https://brapi.dev/api/quote/${encodeURIComponent(clean)}?fundamental=true&dividends=true&range=5y&interval=1mo`;
    const r = await fetchWithRetry(url);
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
      typeof res.earningsPerShare === "number" ? res.earningsPerShare : null;
    const pe: number | null = typeof res.priceEarnings === "number" ? res.priceEarnings : null;
    const pb: number | null =
      typeof res.priceToBookRatio === "number" ? res.priceToBookRatio : null;
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
      metrics: {
        peRatio: pe,
        pbRatio: pb,
        eps,
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
