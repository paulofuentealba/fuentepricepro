import { UA, fetchWithRetry } from "./api/http.server";
import { reportIngestionStatus } from "./api/ingestionLog.server";
import {
  calculateDailyCompoundedReturn,
  calculatePriceCumulativeReturn,
  type BenchmarkPoint,
  type DailyRatePoint,
  type PricePoint,
} from "./benchmark";

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

    const res = await fetchWithRetry(url, "benchmark", {}, { timeoutMs: 5000, retries: 1 });
    if (!res.ok) return [];

    const json = (await res.json()) as Array<{ data: string; valor: string }>;
    if (!Array.isArray(json) || json.length === 0) {
      reportIngestionStatus("benchmark", "INVALID", `empty BCB series ${seriesCode}`);
      return [];
    }

    const dailyRates: DailyRatePoint[] = json.map((item) => ({
      date: parseBcbDate(item.data),
      ratePct: parseFloat(item.valor) || 0,
    }));

    const result = calculateDailyCompoundedReturn(dailyRates);
    reportIngestionStatus("benchmark", "PASSED");
    return result;
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
      "benchmark",
      { headers: { "User-Agent": UA } },
      { timeoutMs: 5000, retries: 1 },
    );
    if (!res.ok) return [];

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];

    if (timestamps.length === 0 || closes.length === 0) {
      reportIngestionStatus("benchmark", "INVALID", `empty Yahoo chart series for ${symbol}`);
      return [];
    }

    const priceSeries: PricePoint[] = timestamps.map((ts, i) => {
      const date = new Date(ts * 1000).toISOString().slice(0, 10);
      const close = closes[i] != null && Number.isFinite(closes[i]) ? closes[i] : null;
      return { date, close };
    });

    const benchmarkSeries = calculatePriceCumulativeReturn(priceSeries);
    reportIngestionStatus("benchmark", "PASSED");
    return benchmarkSeries;
  } catch (err) {
    console.warn(`[benchmark] Yahoo Finance chart for ${symbol} failed gracefully`, err);
    return [];
  }
}
