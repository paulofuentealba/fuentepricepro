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
 * Annualizes a cumulative percentage return over a given period of days using compound interest.
 * Formula: ((1 + cumulativeReturnPct / 100) ^ (365 / days) - 1) * 100
 *
 * @param cumulativeReturnPct Total cumulative percentage return over the period (e.g., 10 for 10%).
 * @param days Total days in the evaluation period.
 * @returns Annualized percentage rate (e.g., 21.32 for 21.32% a.a.). Returns 0 if days <= 0 or input invalid.
 */
export function annualizeReturn(cumulativeReturnPct: number, days: number): number {
  if (!days || days <= 0 || !Number.isFinite(cumulativeReturnPct)) {
    return 0;
  }
  const factor = 1 + cumulativeReturnPct / 100;
  if (factor <= 0) return -100;
  const annualizedFactor = Math.pow(factor, 365 / days);
  const annualizedPct = (annualizedFactor - 1) * 100;
  return Number(annualizedPct.toFixed(4));
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
