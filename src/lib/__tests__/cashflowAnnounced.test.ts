import { describe, it, expect } from "vitest";
import { buildMonthlyBuckets } from "../cashflow";
import type { WatchlistItem } from "../watchlist";
import type { DividendEvent } from "../domain";
import type { Transaction } from "../transactionsLogic";

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
    quantity: 100,
    averagePrice: null,
    paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    payoutRatio: null,
    customTaxRate: null,
    sector: null,
    addedAt: 0,
    investingSince: 0,
    ...overrides,
  };
}

describe("Cash Flow: Announced vs Realized vs Projected (Prompt 113b)", () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  it("assigns declared dividends with future paymentDate to announcedAmount, not realizedAmount", () => {
    // Pick a future month in the current calendar year
    const futureMonthIdx = currentMonth < 11 ? 11 : 0;
    const targetYear = currentMonth < 11 ? currentYear : currentYear + 1;

    const items = [
      mkItem({
        ticker: "VALE3",
        type: "STOCK_BR",
        currency: "BRL",
        quantity: 100,
        annualDividend: 60, // 5 per month projected
      }),
    ];

    // Transaction bought 100 shares long ago
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        ticker: "VALE3",
        type: "buy",
        quantity: 100,
        pricePerShare: 60,
        date: new Date(Date.UTC(currentYear - 1, 0, 1)).getTime(),
      },
    ];

    // Event has exDate in the past, but paymentDate in December
    const pastExDate = new Date(Date.UTC(currentYear, 0, 15)).toISOString().slice(0, 10);
    const futurePaymentDate = new Date(Date.UTC(targetYear, futureMonthIdx, 20)).toISOString().slice(0, 10);

    const dividendEventsMap: Record<string, DividendEvent[]> = {
      VALE3: [
        {
          exDate: pastExDate,
          paymentDate: futurePaymentDate,
          amountPerShare: 2.5, // 100 * 2.5 = 250 Net (Ações BR = 0% tax)
        },
      ],
    };

    const buckets = buildMonthlyBuckets(
      items,
      "BRL",
      months,
      dividendEventsMap,
      "calendar",
      transactions
    );

    const targetBucket = buckets.find(
      (b) => b.calendarMonth === futureMonthIdx && b.calendarYear === targetYear
    );

    expect(targetBucket).toBeDefined();
    if (targetBucket) {
      // Must NOT be in realizedAmount or paidAmount (since the month is future)
      expect(targetBucket.realizedAmount).toBe(0);
      expect(targetBucket.paidAmount).toBe(0);

      // MUST be in announcedAmount
      expect(targetBucket.announcedAmount).toBe(250);

      // Projected amount is residual: max(0, b.amount - announcedAmount)
      // 500 projected (100 qty * 60 / 12) - 250 announced = 250 residual projection
      expect(targetBucket.projectedAmount).toBe(250);
    }
  });

  it("assigns dividends in past months to realizedAmount, with announcedAmount = 0", () => {
    if (currentMonth < 1) return; // Skip if run in January

    const pastMonthIdx = 0; // January
    const items = [
      mkItem({
        ticker: "BBSE3",
        type: "STOCK_BR",
        currency: "BRL",
        quantity: 100,
        annualDividend: 60,
      }),
    ];

    const transactions: Transaction[] = [
      {
        id: "tx-2",
        ticker: "BBSE3",
        type: "buy",
        quantity: 100,
        pricePerShare: 35,
        date: new Date(Date.UTC(currentYear - 1, 0, 1)).getTime(),
      },
    ];

    const pastExDate = new Date(Date.UTC(currentYear, pastMonthIdx, 5)).toISOString().slice(0, 10);
    const pastPaymentDate = new Date(Date.UTC(currentYear, pastMonthIdx, 25)).toISOString().slice(0, 10);

    const dividendEventsMap: Record<string, DividendEvent[]> = {
      BBSE3: [
        {
          exDate: pastExDate,
          paymentDate: pastPaymentDate,
          amountPerShare: 1.5, // 100 * 1.5 = 150
        },
      ],
    };

    const buckets = buildMonthlyBuckets(
      items,
      "BRL",
      months,
      dividendEventsMap,
      "calendar",
      transactions
    );

    const janBucket = buckets.find(
      (b) => b.calendarMonth === pastMonthIdx && b.calendarYear === currentYear
    );

    expect(janBucket).toBeDefined();
    if (janBucket) {
      expect(janBucket.realizedAmount).toBe(150);
      expect(janBucket.announcedAmount).toBe(0);
      expect(janBucket.projectedAmount).toBe(0);
    }
  });
});
