import { UA, fetchWithRetry } from "./api/http.server";

export type BenchmarkType = "CDI" | "SELIC" | "IBOV" | "SPX";

export interface BenchmarkPoint {
  date: string; // YYYY-MM-DD
  cumulativeReturnPct: number;
}

export interface DailyRatePoint {
  date: string; // YYYY-MM-DD
  ratePct: number; // Daily percentage rate e.g. 0.04513
}

export interface PricePoint {
  date: string; // YYYY-MM-DD
  close: number | null;
}

/**
 * Calculates compounded cumulative percentage returns from a series of daily interest rates (e.g., CDI/Selic).
 * The first point in the series represents the baseline date with 0% cumulative return.
 * Subsequent points compound daily rates: factor_t = factor_{t-1} * (1 + rate_t / 100).
 */
export function calculateDailyCompoundedReturn(
  dailyRates: DailyRatePoint[],
): BenchmarkPoint[] {
  if (!dailyRates || dailyRates.length === 0) return [];

  let factor = 1.0;
  return dailyRates.map((point, index) => {
    if (index === 0) {
      return {
        date: point.date,
        cumulativeReturnPct: 0,
      };
    }
    const dailyRate = point.ratePct || 0;
    factor = factor * (1 + dailyRate / 100);
    const cumulativeReturnPct = (factor - 1) * 100;
    return {
      date: point.date,
      cumulativeReturnPct: Number(cumulativeReturnPct.toFixed(6)),
    };
  });
}

/**
 * Calculates price-based cumulative percentage returns from closing price series (e.g., IBOV/SPX).
 * Baseline price is the first valid price point in the series (0% return).
 * For each subsequent date: cumulativeReturnPct = ((price_t / price_0) - 1) * 100.
 */
export function calculatePriceCumulativeReturn(
  priceSeries: PricePoint[],
): BenchmarkPoint[] {
  const validSeries = (priceSeries || []).filter(
    (p): p is { date: string; close: number } =>
      p != null && p.close != null && Number.isFinite(p.close) && p.close > 0,
  );
  if (validSeries.length === 0) return [];

  const basePrice = validSeries[0].close;

  return validSeries.map((point, index) => {
    if (index === 0) {
      return {
        date: point.date,
        cumulativeReturnPct: 0,
      };
    }
    const cumulativeReturnPct = (point.close / basePrice - 1) * 100;
    return {
      date: point.date,
      cumulativeReturnPct: Number(cumulativeReturnPct.toFixed(6)),
    };
  });
}

function formatDateBcb(yyyyMmDd: string): string {
  const parts = yyyyMmDd.split("-");
  if (parts.length !== 3) return yyyyMmDd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseBcbDate(ddMmYyyy: string): string {
  const parts = ddMmYyyy.split("/");
  if (parts.length !== 3) return ddMmYyyy;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Fetches daily interest rate series from Banco Central do Brasil (BCB) SGS.
 * Series 12: Taxa de juros - CDI diária (% a.d.)
 * Series 11: Taxa de juros - Selic diária (% a.d.)
 */
export async function fetchBcbBenchmarkSeries(
  seriesCode: number,
  fromDate: string,
  toDate: string,
): Promise<BenchmarkPoint[]> {
  try {
    const dataInicial = formatDateBcb(fromDate);
    const dataFinal = formatDateBcb(toDate);
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados?dataInicial=${encodeURIComponent(
      dataInicial,
    )}&dataFinal=${encodeURIComponent(dataFinal)}&formato=json`;

    const res = await fetchWithRetry(url, {}, { timeoutMs: 5000, retries: 1 });
    if (!res.ok) return [];

    const json = (await res.json()) as Array<{ data: string; valor: string }>;
    if (!Array.isArray(json) || json.length === 0) return [];

    const dailyRates: DailyRatePoint[] = json.map((item) => ({
      date: parseBcbDate(item.data),
      ratePct: parseFloat(item.valor) || 0,
    }));

    return calculateDailyCompoundedReturn(dailyRates);
  } catch (err) {
    console.warn(`[benchmark] BCB SGS series ${seriesCode} failed gracefully`, err);
    return [];
  }
}

/**
 * Fetches index historical prices from Yahoo Finance Chart API.
 * ^BVSP: IBOVESPA
 * ^GSPC: S&P 500
 */
export async function fetchYahooBenchmarkSeries(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<BenchmarkPoint[]> {
  try {
    const startSec = Math.floor(new Date(fromDate).getTime() / 1000);
    const endSec = Math.floor(new Date(toDate).getTime() / 1000) + 86400;

    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?interval=1d&period1=${startSec}&period2=${endSec}`;

    const res = await fetchWithRetry(
      url,
      { headers: { "User-Agent": UA } },
      { timeoutMs: 5000, retries: 1 },
    );
    if (!res.ok) return [];

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];

    if (timestamps.length === 0 || closes.length === 0) return [];

    const priceSeries: PricePoint[] = timestamps.map((ts, i) => {
      const date = new Date(ts * 1000).toISOString().slice(0, 10);
      const close = closes[i] != null && Number.isFinite(closes[i]) ? closes[i] : null;
      return { date, close };
    });

    return calculatePriceCumulativeReturn(priceSeries);
  } catch (err) {
    console.warn(`[benchmark] Yahoo Finance chart for ${symbol} failed gracefully`, err);
    return [];
  }
}
