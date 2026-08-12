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
 * Composes a list of monthly percentage rates (e.g. IPCA monthly variation,
 * `1.5` meaning 1.5%) into a single annualized rate via geometric mean:
 * `((1+m1%)×(1+m2%)×...×(1+mN%))^(12/N) - 1`.
 *
 * Pure function — no I/O — so it's independently testable with a small
 * synthetic sample instead of requiring 60 months of real/mocked data.
 */
export function composeAnnualizedRateFromMonthlyPct(monthlyRatesPct: number[]): number {
  const compoundFactor = monthlyRatesPct.reduce((acc, ratePct) => acc * (1 + ratePct / 100), 1);
  const monthsUsed = monthlyRatesPct.length;
  return Math.pow(compoundFactor, 12 / monthsUsed) - 1;
}

/**
 * Fetches the IPCA (BCB SGS series 433) monthly variation for the last ~5
 * years and composes it into an annualized average via geometric mean
 * (see `composeAnnualizedRateFromMonthlyPct`).
 *
 * Deliberately NOT built on top of `fetchBcbBenchmarkSeries` — that helper
 * assumes *daily* compounding (`calculateDailyCompoundedReturn`), while
 * IPCA (série 433) is published as a *monthly* variation, so it needs its
 * own composition logic.
 *
 * Returns `null` (graceful fallback, caller decides what to use instead)
 * when the fetch fails or fewer than ~48 of the expected 60 months come
 * back — a very incomplete window shouldn't be composed into a rate.
 */
export async function fetchIpcaFiveYearAverage(): Promise<number | null> {
  const MIN_MONTHS = 48;
  try {
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setMonth(fromDate.getMonth() - 60);

    const dataInicial = formatDateBcb(fromDate.toISOString().slice(0, 10));
    const dataFinal = formatDateBcb(toDate.toISOString().slice(0, 10));
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?dataInicial=${encodeURIComponent(
      dataInicial,
    )}&dataFinal=${encodeURIComponent(dataFinal)}&formato=json`;

    const res = await fetchWithRetry(url, "benchmark", {}, { timeoutMs: 5000, retries: 1 });
    if (!res.ok) {
      reportIngestionStatus("benchmark", "ERROR", `IPCA fetch failed with status ${res.status}`);
      return null;
    }

    const json = (await res.json()) as Array<{ data: string; valor: string }>;
    if (!Array.isArray(json) || json.length === 0) {
      reportIngestionStatus("benchmark", "INVALID", "empty BCB IPCA series 433");
      return null;
    }

    const monthlyRates = json
      .map((item) => parseFloat(item.valor))
      .filter((v) => Number.isFinite(v));

    if (monthlyRates.length < MIN_MONTHS) {
      reportIngestionStatus(
        "benchmark",
        "INVALID",
        `IPCA series 433 returned only ${monthlyRates.length} months (need >= ${MIN_MONTHS})`,
      );
      return null;
    }

    const annualized = composeAnnualizedRateFromMonthlyPct(monthlyRates);

    reportIngestionStatus("benchmark", "PASSED");
    return annualized;
  } catch (err) {
    console.warn("[benchmark] IPCA 5y average (BCB SGS 433) failed gracefully", err);
    reportIngestionStatus("benchmark", "ERROR", `IPCA fetch threw: ${err}`);
    return null;
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
