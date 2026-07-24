import { describe, it, expect } from "vitest";
import { buildMonthlyBuckets, computeCashFlowSummary } from "../cashflow";
import type { WatchlistItem } from "../watchlist";

function mkItem(overrides: Partial<WatchlistItem>): WatchlistItem {
  return {
    id: overrides.ticker ?? "T",
    ticker: "T",
    name: "Test",
    type: "STOCK_US",
    currency: "USD",
    currentPrice: 10,
    annualDividend: 120,
    targetYield: 6,
    ceilingPrice: 16,
    safetyMargin: 10,
    quantity: 1,
    averagePrice: null,
    paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    payoutRatio: null,
    customTaxRate: null,
    sector: null,
    addedAt: 0,
    ...overrides,
  };
}

describe("Cashflow logic", () => {
  it("buildMonthlyBuckets distributes annual dividend across payment months", () => {
    const items = [
      mkItem({ ticker: "A", annualDividend: 120, quantity: 1, paymentMonths: [1, 6, 12] }),
    ];
    const buckets = buildMonthlyBuckets(items, "USD", [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);

    // 120 total, 3 months -> 40 per month for Jan(0), Jun(5), Dec(11)
    expect(buckets[0].amount).toBe(40);
    expect(buckets[5].amount).toBe(40);
    expect(buckets[11].amount).toBe(40);

    // Other months should be 0
    expect(buckets[1].amount).toBe(0);
  });

  it("computeCashFlowSummary calculates next30 correctly", () => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      month: String(i),
      monthIndex: i,
      amount: 100, // 100 per month
      cumulativeTotal: 100 * (i + 1),
      contributors: [],
      isBest: false,
      isWorst: false,
      concentratedTicker: null,
      paidAmount: 0,
      announcedAmount: 0,
      projectedAmount: 0,
    }));

    const summary = computeCashFlowSummary(buckets);
    expect(summary.total).toBe(1200);
    expect(summary.avg).toBe(100);
    // Since all months are 100, a 30-day window (roughly 1 month) should be around 100
    // depending on the exact day it's run, it might be 98-102.
    expect(summary.next30).toBeGreaterThan(90);
    expect(summary.next30).toBeLessThan(110);
  });
});
