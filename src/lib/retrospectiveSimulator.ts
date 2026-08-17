import type { Asset } from "./domain";
import type { BenchmarkPoint } from "./benchmark";

export interface RetrospectiveSimulationResult {
  initialInvestment: number;
  finalValue: number;
  totalReturnPct: number;
  capitalAppreciationValue: number;
  dividendsReinvestedValue: number;
  totalDividendsPaid: number;
  initialShares: number;
  finalShares: number;
  periodYears: number;
  hasSufficientData: boolean;
}

/**
 * Reconstructs the estimated absolute price at a given historical index
 * from the cumulative return series and current live quote.
 */
function getPriceAtPoint(
  point: BenchmarkPoint,
  lastPoint: BenchmarkPoint,
  currentPrice: number,
): number {
  const baseFactor = 1 + (point.cumulativeReturnPct || 0) / 100;
  const lastFactor = 1 + (lastPoint.cumulativeReturnPct || 0) / 100;
  if (lastFactor <= 0 || baseFactor <= 0) return currentPrice;
  return (currentPrice * baseFactor) / lastFactor;
}

/**
 * Pure simulation engine for historical compound return with dividend reinvestment.
 * Consumes pre-loaded asset data and price history series without network requests.
 */
export function simulateRetrospectiveInvestment(
  asset: Asset,
  priceSeries: readonly BenchmarkPoint[] | undefined | null,
  initialCapital: number = 1000,
  periodYears: 1 | 3 | 5 = 1,
): RetrospectiveSimulationResult {
  const currentPrice = asset.currentPrice;
  if (!currentPrice || currentPrice <= 0 || initialCapital <= 0) {
    return {
      initialInvestment: initialCapital,
      finalValue: initialCapital,
      totalReturnPct: 0,
      capitalAppreciationValue: 0,
      dividendsReinvestedValue: 0,
      totalDividendsPaid: 0,
      initialShares: 0,
      finalShares: 0,
      periodYears,
      hasSufficientData: false,
    };
  }

  const validSeries = (priceSeries || []).filter((p) => p && p.date && Number.isFinite(p.cumulativeReturnPct));
  const nowMs = Date.now();
  const targetStartMs = nowMs - periodYears * 365.25 * 24 * 60 * 60 * 1000;
  const targetStartDateStr = new Date(targetStartMs).toISOString().split("T")[0];

  let startPrice: number | null = null;
  const lastPoint = validSeries[validSeries.length - 1];

  if (validSeries.length > 0 && lastPoint) {
    // Find closest price point on or after targetStartDateStr
    const match = validSeries.find((p) => p.date >= targetStartDateStr) || validSeries[0];
    if (match) {
      startPrice = getPriceAtPoint(match, lastPoint, currentPrice);
    }
  }

  // Fallback if price series is not yet available: derive from 5y CAGR or annual history
  if (!startPrice || startPrice <= 0) {
    const annualAvgReturn = 0.10; // 10% annual conservative proxy if no series
    startPrice = currentPrice / Math.pow(1 + annualAvgReturn, periodYears);
  }

  const initialShares = initialCapital / startPrice;
  let runningShares = initialShares;
  let totalDividendsPaid = 0;

  // Process dividend events occurring between targetStartDateStr and now
  const events = (asset.dividendEvents ?? [])
    .filter((e) => {
      const d = e.paymentDate || e.exDate;
      return d && d >= targetStartDateStr && e.amountPerShare > 0;
    })
    .sort((a, b) => (a.paymentDate || a.exDate || "").localeCompare(b.paymentDate || b.exDate || ""));

  if (events.length > 0 && validSeries.length > 0 && lastPoint) {
    for (const ev of events) {
      const pDate = ev.paymentDate || ev.exDate || "";
      const divPerShare = ev.amountPerShare;
      const cashReceived = runningShares * divPerShare;
      totalDividendsPaid += cashReceived;

      // Find price on payment date
      const closestPoint =
        validSeries.find((p) => p.date >= pDate) ||
        validSeries[validSeries.length - 1];

      const priceOnDate = closestPoint
        ? getPriceAtPoint(closestPoint, lastPoint, currentPrice)
        : currentPrice;

      if (priceOnDate > 0) {
        const newShares = cashReceived / priceOnDate;
        runningShares += newShares;
      }
    }
  } else {
    // If dividendEvents are missing, use dividendHistory annual points
    const startYear = new Date(targetStartMs).getFullYear();
    const annualPoints = (asset.dividendHistory ?? []).filter(
      (p) => p.year >= startYear && p.amount > 0,
    );
    for (const pt of annualPoints) {
      const cash = runningShares * pt.amount;
      totalDividendsPaid += cash;
      // Reinvest at approximate annual price
      const approxPrice = currentPrice;
      if (approxPrice > 0) {
        runningShares += cash / approxPrice;
      }
    }
  }

  const finalValue = runningShares * currentPrice;
  const initialSharesValueToday = initialShares * currentPrice;
  const capitalAppreciationValue = initialSharesValueToday - initialCapital;
  const dividendsReinvestedValue = Math.max(0, finalValue - initialSharesValueToday);
  const totalReturnPct = ((finalValue - initialCapital) / initialCapital) * 100;

  return {
    initialInvestment: initialCapital,
    finalValue,
    totalReturnPct,
    capitalAppreciationValue,
    dividendsReinvestedValue,
    totalDividendsPaid,
    initialShares,
    finalShares: runningShares,
    periodYears,
    hasSufficientData: validSeries.length > 0 || (asset.dividendHistory ?? []).length > 0,
  };
}
