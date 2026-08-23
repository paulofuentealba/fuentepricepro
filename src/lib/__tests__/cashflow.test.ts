import { describe, it, expect, vi } from "vitest";
import { buildMonthlyBuckets, computeCashFlowSummary, computeInvestedVsReceived } from "../cashflow";
import { EXCHANGE_RATE_FALLBACK } from "../macroDefaults";
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
    investingSince: 0,
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
      calendarMonth: i,
      calendarYear: 2026,
      amount: 100, // 100 per month
      cumulativeTotal: 100 * (i + 1),
      contributors: [],
      isBest: false,
      isWorst: false,
      concentratedTicker: null,
      paidAmount: 0,
      announcedAmount: 0,
      projectedAmount: 0,
      realizedAmount: 0,
    }));

    const summary = computeCashFlowSummary(buckets);
    expect(summary.total).toBe(1200);
    expect(summary.avg).toBe(100);
    // Since all months are 100, a 30-day window (roughly 1 month) should be around 100
    // depending on the exact day it's run, it might be 98-102.
    expect(summary.next30).toBeGreaterThan(90);
    expect(summary.next30).toBeLessThan(110);
  });

  it("isBest reflects the effective displayed value, not the pure projection", () => {
    // Arrange: two assets paying in different months.
    // Jan (index 0) has projected = 100, Jun (index 5) also = 100.
    // But Jan already passed and its real paidAmount is 200 (a bumper payment).
    // isBest must land on Jan (effectiveAmount=200), not on some future month.
    const currentMonth = new Date().getMonth();
    if (currentMonth < 1) {
      // If we're running in January, Jan isn't a "past" month; skip this variant.
      return;
    }

    // Jan: index 0 — must be a past month for this test to be meaningful
    const pastMonthIdx = 0;
    const futureMonthIdx = currentMonth + 1 <= 11 ? currentMonth + 1 : 11;

    const items = [
      mkItem({
        ticker: "PAST",
        annualDividend: 100,
        quantity: 1,
        paymentMonths: [pastMonthIdx + 1], // 1-indexed
      }),
      mkItem({
        ticker: "FUT",
        annualDividend: 50,
        quantity: 1,
        paymentMonths: [futureMonthIdx + 1], // 1-indexed
      }),
    ];

    const currentYear = new Date().getFullYear();
    // Real event for PAST: 200/share (higher than projection of 100)
    const dividendEventsMap = {
      PAST: [
        {
          exDate: new Date(Date.UTC(currentYear, pastMonthIdx, 15)).toISOString(),
          paymentDate: new Date(Date.UTC(currentYear, pastMonthIdx, 20)).toISOString(),
          amountPerShare: 200,
        },
      ],
    };

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const buckets = buildMonthlyBuckets(items, "USD", months, dividendEventsMap);

    // The past month's effective displayed amount is 200 (real) — must be isBest
    expect(buckets[pastMonthIdx].isBest).toBe(true);
    // The future month's projection is 50 — must NOT be isBest
    expect(buckets[futureMonthIdx].isBest).toBe(false);
    // amount (pure projection) is still 100 for past month — unchanged
    expect(buckets[pastMonthIdx].amount).toBe(100);
  });

  it("filters out ghost dividends before addedAt date", () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    if (currentMonth < 2) return; // Need at least Jan and Feb to be past

    const items = [
      mkItem({
        ticker: "GHOST",
        annualDividend: 120,
        quantity: 1,
        paymentMonths: [1, 2], // Jan, Feb
        investingSince: new Date(Date.UTC(currentYear, 1, 15)).getTime(), // Added mid-Feb
      }),
    ];

    const dividendEventsMap = {
      GHOST: [
        {
          exDate: new Date(Date.UTC(currentYear, 0, 10)).toISOString(), // Jan event (GHOST)
          paymentDate: null,
          amountPerShare: 10,
        },
        {
          exDate: new Date(Date.UTC(currentYear, 1, 20)).toISOString(), // Late Feb event (VALID)
          paymentDate: null,
          amountPerShare: 10,
        },
      ],
    };

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const buckets = buildMonthlyBuckets(items, "USD", months, dividendEventsMap, "calendar");

    // Jan (index 0) was before addedAt -> realPaid should be 0, not 10
    expect(buckets[0].paidAmount).toBe(0);
    // Feb (index 1) is after addedAt -> realPaid should be 10
    expect(buckets[1].paidAmount).toBe(10);
  });

  it("buildMonthlyBuckets computes dynamic quantity when transactions are provided", () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const items = [
      mkItem({
        ticker: "DYNAMIC",
        type: "STOCK_BR",
        currency: "BRL",
        quantity: 100, // current quantity is 100, but historical is different
        investingSince: Date.UTC(currentYear, 0, 1),
      }),
    ];

    const dividendEventsMap = {
      DYNAMIC: [
        {
          exDate: new Date(Date.UTC(currentYear, 0, 15)).toISOString(), // Jan event
          paymentDate: new Date(Date.UTC(currentYear, 0, 25)).toISOString(),
          amountPerShare: 2,
        },
        {
          exDate: new Date(Date.UTC(currentYear, 1, 15)).toISOString(), // Feb event
          paymentDate: new Date(Date.UTC(currentYear, 1, 25)).toISOString(),
          amountPerShare: 2,
        },
      ],
    };

    const transactions: any[] = [
      { id: "1", ticker: "DYNAMIC", type: "buy", quantity: 10, pricePerShare: 100, date: Date.UTC(currentYear, 0, 1) }, // Jan 1st: bought 10
      { id: "2", ticker: "DYNAMIC", type: "buy", quantity: 90, pricePerShare: 100, date: Date.UTC(currentYear, 1, 10) }, // Feb 10th: bought 90 -> total 100
    ];

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const buckets = buildMonthlyBuckets(items, "BRL", months, dividendEventsMap, "calendar", transactions);

    // Jan event should multiply by 10 (quantity at Jan 15) -> 2 * 10 = 20 Net (STOCK_BR)
    // Feb event should multiply by 100 (quantity at Feb 15) -> 2 * 100 = 200 Net (STOCK_BR)

    if (currentMonth >= 1 || currentYear > new Date().getFullYear()) {
      expect(buckets[0].paidAmount).toBe(20);
    }
    if (currentMonth >= 2 || currentYear > new Date().getFullYear()) {
      expect(buckets[1].paidAmount).toBe(200);
    }
  });

  it("includes and converts USD assets (STOCK_US and ETF) when display currency is BRL", () => {
    const items = [
      mkItem({
        ticker: "VOO",
        type: "ETF",
        currency: "USD",
        annualDividend: 120, // $120 USD/year
        quantity: 1,
        paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      }),
    ];

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    // Target currency BRL, fxRate = 5.0 (so $10 USD/month becomes R$ 50 BRL/month)
    const buckets = buildMonthlyBuckets(items, "BRL", months, {}, "calendar", [], 5.0);

    expect(buckets[0].amount).toBe(50);
    expect(buckets[0].contributors[0].ticker).toBe("VOO");
    expect(buckets[0].contributors[0].amount).toBe(50);
  });

  it("computeCashFlowSummary aligns UTC month index with buildMonthlyBuckets near midnight (Item 2)", () => {
    // Simulate 2026-08-31 23:30:00 GMT-3 -> 2026-09-01 02:30:00 UTC
    // Local month is August (7), but UTC month is September (8).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T02:30:00Z"));

    try {
      const items = [
        mkItem({
          ticker: "KO",
          annualDividend: 120,
          quantity: 10, // $100/month
          paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        }),
      ];
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const buckets = buildMonthlyBuckets(items, "USD", months, {}, "calendar", []);

      const summary = computeCashFlowSummary(buckets);
      expect(summary.total).toBe(1200);
      expect(summary.avg).toBe(100);
      // On Sep 1 (day 1 of 30 in Sep), 29/30 remaining in Sep ($96.67) + 1/31 consumed in Oct ($3.23) = $99.89
      expect(summary.next30).toBeCloseTo(99.89, 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("computeCashFlowSummary returns zero-safe summary for empty array without NaN", () => {
    const emptySummary = computeCashFlowSummary([]);
    expect(emptySummary.total).toBe(0);
    expect(emptySummary.avg).toBe(0);
    expect(emptySummary.top).toBeNull();
    expect(emptySummary.next30).toBe(0);
    expect(Number.isFinite(emptySummary.next30)).toBe(true);
  });

  it("does not fall back to guest mode when user has ledger but zero realized events in past months (Item 4)", () => {
    // Set time to August 2026 so Jan and Jul are past months
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T12:00:00Z"));

    try {
      const items = [
        mkItem({
          ticker: "PETR4",
          type: "STOCK_BR",
          currency: "BRL",
          annualDividend: 240,
          quantity: 100,
          averagePrice: 30,
          paymentMonths: [1, 7],
        }),
      ];

      // Bought on June 1st, 2026
      const transactions: any[] = [
        {
          id: "tx1",
          ticker: "PETR4",
          type: "buy",
          quantity: 100,
          pricePerShare: 30,
          date: Date.UTC(2026, 5, 1), // June 1st, 2026
        },
      ];

      // Event 1: Jan 10 (before buy) -> user owned 0 shares
      // Event 2: Jul 10 (after buy) -> user owned 100 shares
      const dividendEventsMap = {
        PETR4: [
          {
            exDate: "2026-01-10T00:00:00Z",
            paymentDate: "2026-01-20T00:00:00Z",
            amountPerShare: 2.0,
          },
          {
            exDate: "2026-07-10T00:00:00Z",
            paymentDate: "2026-07-20T00:00:00Z",
            amountPerShare: 3.0,
          },
        ],
      };

      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const buckets = buildMonthlyBuckets(items, "BRL", months, dividendEventsMap, "calendar", transactions);

      // January (idx 0): user owned 0 shares -> realizedAmount and paidAmount MUST be 0 (no guest-mode fallback of 200!)
      expect(buckets[0].realizedAmount).toBe(0);
      expect(buckets[0].paidAmount).toBe(0);

      // July (idx 6): user owned 100 shares -> 100 * 3.0 = 300 Net (STOCK_BR has 0% tax)
      expect(buckets[6].realizedAmount).toBe(300);
      expect(buckets[6].paidAmount).toBe(300);
    } finally {
      vi.useRealTimers();
    }
  });

  describe("EXCHANGE_RATE_FALLBACK parameter default (Item 2)", () => {
    it("buildMonthlyBuckets defaults to EXCHANGE_RATE_FALLBACK (5.5) when fxRate parameter is omitted", () => {
      const items = [
        mkItem({ ticker: "O", currency: "USD", annualDividend: 120, quantity: 1, paymentMonths: [1] }),
      ];
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

      // Omit fxRate parameter (default = EXCHANGE_RATE_FALLBACK)
      const buckets = buildMonthlyBuckets(items, "BRL", months);
      // 120 USD * 5.5 = 660 BRL in January (idx 0)
      expect(buckets[0].amount).toBe(120 * EXCHANGE_RATE_FALLBACK);
      expect(buckets[0].amount).toBe(660);
    });

    it("computeInvestedVsReceived defaults to EXCHANGE_RATE_FALLBACK (5.5) when fxRate parameter is omitted", () => {
      const items = [
        mkItem({ ticker: "AAPL", currency: "USD", averagePrice: 150, quantity: 10 }),
      ];
      // Omit fxRate parameter (default = EXCHANGE_RATE_FALLBACK)
      const result = computeInvestedVsReceived(items, "BRL", {});
      expect(result).toHaveLength(1);
      // 150 USD * 10 * 5.5 = 8250 BRL
      expect(result[0].invested).toBe(150 * 10 * EXCHANGE_RATE_FALLBACK);
      expect(result[0].invested).toBe(8250);
    });
  });
});
