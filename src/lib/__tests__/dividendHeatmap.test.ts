import { describe, it, expect } from "vitest";
import { computeDividendHeatmap } from "../dividendHeatmap";
import type { Asset } from "../domain";

describe("computeDividendHeatmap", () => {
  const asset: Asset = {
    ticker: "BBSE3",
    name: "BB Seguridade",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 35.0,
    dividends3y: [2.5, 3.0, 3.2],
    dividendHistory: [
      { year: 2023, amount: 2.5 },
      { year: 2024, amount: 3.0 },
      { year: 2025, amount: 3.2 },
    ],
    exDividendDate: "2025-08-15",
    epsCurrent: 4.0,
    epsNext: 4.5,
    paymentMonths: [2, 8],
    sector: "Finance",
    dividendEvents: [
      { exDate: "2024-02-01", paymentDate: "2024-02-20", amountPerShare: 1.2 },
      { exDate: "2024-08-01", paymentDate: "2024-08-20", amountPerShare: 1.8 },
      { exDate: "2025-02-01", paymentDate: "2025-02-20", amountPerShare: 1.4 },
      { exDate: "2025-08-01", paymentDate: "2025-08-20", amountPerShare: 1.8 },
    ],
    metrics: {
      eps: 4.0,
      roe: 50.0,
      payoutRatio: 80.0,
      pbRatio: 6.0,
      peRatio: 8.75,
      currentDy: 9.1,
      dividendCagr5y: 12.0,
      capRate: null,
      vacancy: null,
      expenseRatio: null,
      aum: null,
      trackingError: null,
    },
  };

  it("computes year x month matrix and recurrence frequencies correctly", () => {
    const result = computeDividendHeatmap(asset);

    expect(result.years).toEqual([2025, 2024]);
    expect(result.maxMonthlyAmount).toBe(1.8);

    // February (month 2) paid in both 2024 and 2025 -> 100% recurrence
    expect(result.recurrenceByMonth[2].yearsPaidCount).toBe(2);
    expect(result.recurrenceByMonth[2].recurrencePct).toBe(100);

    // August (month 8) paid in both 2024 and 2025 -> 100% recurrence
    expect(result.recurrenceByMonth[8].yearsPaidCount).toBe(2);
    expect(result.recurrenceByMonth[8].recurrencePct).toBe(100);

    // January (month 1) never paid -> 0% recurrence
    expect(result.recurrenceByMonth[1].yearsPaidCount).toBe(0);
    expect(result.recurrenceByMonth[1].recurrencePct).toBe(0);

    // Stock returns payout ratio
    expect(result.payoutRatio).toBe(80.0);
  });

  it("omits payout ratio for FII assets", () => {
    const fiiAsset = { ...asset, type: "FII" as const };
    const result = computeDividendHeatmap(fiiAsset);
    expect(result.payoutRatio).toBeNull();
  });
});
