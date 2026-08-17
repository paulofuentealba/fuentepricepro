import { describe, it, expect } from "vitest";
import { simulateRetrospectiveInvestment } from "../retrospectiveSimulator";
import type { Asset } from "../domain";
import type { BenchmarkPoint } from "../benchmark";

describe("simulateRetrospectiveInvestment", () => {
  const asset: Asset = {
    ticker: "ITUB4",
    name: "Itaú Unibanco",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 30.0,
    dividends3y: [1.5, 1.8, 2.0],
    dividendHistory: [
      { year: 2023, amount: 1.5 },
      { year: 2024, amount: 1.8 },
      { year: 2025, amount: 2.0 },
    ],
    exDividendDate: "2024-05-15",
    epsCurrent: 3.5,
    epsNext: 3.8,
    paymentMonths: [2, 8],
    sector: "Finance",
    dividendEvents: [
      { exDate: "2025-02-01", paymentDate: "2025-02-15", amountPerShare: 1.0 },
      { exDate: "2025-08-01", paymentDate: "2025-08-15", amountPerShare: 1.0 },
    ],
    metrics: {
      eps: 3.5,
      roe: 20.0,
      payoutRatio: 50,
      pbRatio: 1.5,
      peRatio: 8.5,
      currentDy: 6.6,
      dividendCagr5y: 10.0,
      capRate: null,
      vacancy: null,
      expenseRatio: null,
      aum: null,
      trackingError: null,
    },
  };

  const priceSeries: BenchmarkPoint[] = [
    { date: "2025-01-01", cumulativeReturnPct: 0 },
    { date: "2025-02-15", cumulativeReturnPct: 5 },
    { date: "2025-08-15", cumulativeReturnPct: 15 },
    { date: "2026-01-01", cumulativeReturnPct: 20 },
  ];

  it("calculates compound returns with reinvested dividends correctly", () => {
    const result = simulateRetrospectiveInvestment(asset, priceSeries, 1000, 1);
    expect(result.initialInvestment).toBe(1000);
    expect(result.finalValue).toBeGreaterThan(1000);
    expect(result.finalShares).toBeGreaterThan(result.initialShares);
    expect(result.dividendsReinvestedValue).toBeGreaterThan(0);
    expect(result.hasSufficientData).toBe(true);
  });

  it("handles zero price or invalid input gracefully", () => {
    const invalidAsset = { ...asset, currentPrice: 0 };
    const result = simulateRetrospectiveInvestment(invalidAsset, priceSeries, 1000, 1);
    expect(result.finalValue).toBe(1000);
    expect(result.totalReturnPct).toBe(0);
    expect(result.hasSufficientData).toBe(false);
  });
});
