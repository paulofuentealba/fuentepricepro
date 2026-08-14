import { describe, it, expect } from "vitest";
import { computeUpcomingPayments } from "@/components/ceiling/watchlist/NextPaymentBanner";
import type { WatchlistItem } from "@/lib/watchlist";
import type { DividendEventsMap } from "@/lib/cashflow";

describe("computeUpcomingPayments resilience", () => {
  it("should select only the EARLIEST future paymentDate event per ticker when ticker has multiple future events", () => {
    const items: WatchlistItem[] = [
      {
        id: "stock:PETR4",
        ticker: "PETR4",
        name: "Petróleo Brasileiro S.A.",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 38,
        annualDividend: 4,
        targetYield: 10,
        ceilingPrice: 40,
        safetyMargin: 5,
        quantity: 100,
        averagePrice: 35,
        paymentMonths: [5, 8, 11, 12],
        payoutRatio: 0.5,
        addedAt: Date.now(),
        investingSince: Date.now(),
      },
    ];

    const dividendEventsMap: DividendEventsMap = {
      PETR4: [
        {
          exDate: "2026-06-01T03:00:00.000Z",
          paymentDate: "2026-09-21T03:00:00.000Z", // Future Event 2 (Later)
          amountPerShare: 0.35,
          isJCP: true,
        },
        {
          exDate: "2026-06-01T03:00:00.000Z",
          paymentDate: "2026-08-20T03:00:00.000Z", // Future Event 1 (Earliest)
          amountPerShare: 0.35,
          isJCP: true,
        },
        {
          exDate: "2025-12-01T03:00:00.000Z",
          paymentDate: "2026-01-20T03:00:00.000Z", // Past Event
          amountPerShare: 0.30,
          isJCP: false,
        },
      ],
    };

    // Fixed mock nowMs: 2026-08-08
    const mockNow = new Date("2026-08-08T12:00:00.000Z").getTime();

    const { sortedList, totalCount } = computeUpcomingPayments(
      items,
      {},
      dividendEventsMap,
      mockNow,
    );

    // Must return ONLY 1 entry for PETR4, not 2
    expect(totalCount).toBe(1);
    expect(sortedList.length).toBe(1);
    expect(sortedList[0].item.ticker).toBe("PETR4");
    // Date must be the earliest future date (2026-08-20)
    expect(sortedList[0].date.toISOString()).toBe("2026-08-20T03:00:00.000Z");
  });

  it("should handle multiple distinct tickers without duplication", () => {
    const items: WatchlistItem[] = [
      {
        id: "stock:PETR4",
        ticker: "PETR4",
        name: "Petróleo Brasileiro S.A.",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 38,
        annualDividend: 4,
        targetYield: 10,
        ceilingPrice: 40,
        safetyMargin: 5,
        quantity: 100,
        averagePrice: 35,
        paymentMonths: [8, 9],
        payoutRatio: 0.5,
        addedAt: Date.now(),
        investingSince: Date.now(),
      },
      {
        id: "stock:VALE3",
        ticker: "VALE3",
        name: "Vale S.A.",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 60,
        annualDividend: 5,
        targetYield: 10,
        ceilingPrice: 70,
        safetyMargin: 10,
        quantity: 50,
        averagePrice: 55,
        paymentMonths: [9],
        payoutRatio: 0.5,
        addedAt: Date.now(),
        investingSince: Date.now(),
      },
    ];

    const dividendEventsMap: DividendEventsMap = {
      PETR4: [
        {
          exDate: "2026-06-01T03:00:00.000Z",
          paymentDate: "2026-09-21T03:00:00.000Z",
          amountPerShare: 0.35,
        },
        {
          exDate: "2026-06-01T03:00:00.000Z",
          paymentDate: "2026-08-20T03:00:00.000Z",
          amountPerShare: 0.35,
        },
      ],
      VALE3: [
        {
          exDate: "2026-08-11T03:00:00.000Z",
          paymentDate: "2026-09-02T03:00:00.000Z",
          amountPerShare: 1.56,
        },
      ],
    };

    const mockNow = new Date("2026-08-08T12:00:00.000Z").getTime();
    const { sortedList, totalCount } = computeUpcomingPayments(
      items,
      {},
      dividendEventsMap,
      mockNow,
    );

    expect(totalCount).toBe(2);
    expect(sortedList.length).toBe(2);

    // PETR4 (08-20) should come before VALE3 (09-02)
    expect(sortedList[0].item.ticker).toBe("PETR4");
    expect(sortedList[0].date.toISOString()).toBe("2026-08-20T03:00:00.000Z");

    expect(sortedList[1].item.ticker).toBe("VALE3");
    expect(sortedList[1].date.toISOString()).toBe("2026-09-02T03:00:00.000Z");
  });
});

describe("computeUpcomingPayments pagination support", () => {
  it("should return full sorted list for pagination to work on component level", () => {
    const items: WatchlistItem[] = [
      {
        id: "stock:A",
        ticker: "AAA",
        name: "Asset A",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 10,
        annualDividend: 1,
        targetYield: 10,
        ceilingPrice: 12,
        safetyMargin: 5,
        quantity: 100,
        averagePrice: 9,
        paymentMonths: [1],
        payoutRatio: 0.5,
        addedAt: Date.now(),
        investingSince: Date.now(),
      },
      {
        id: "stock:B",
        ticker: "BBB",
        name: "Asset B",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 10,
        annualDividend: 1,
        targetYield: 10,
        ceilingPrice: 12,
        safetyMargin: 5,
        quantity: 100,
        averagePrice: 9,
        paymentMonths: [2],
        payoutRatio: 0.5,
        addedAt: Date.now(),
        investingSince: Date.now(),
      },
      {
        id: "stock:C",
        ticker: "CCC",
        name: "Asset C",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 10,
        annualDividend: 1,
        targetYield: 10,
        ceilingPrice: 12,
        safetyMargin: 5,
        quantity: 100,
        averagePrice: 9,
        paymentMonths: [3],
        payoutRatio: 0.5,
        addedAt: Date.now(),
        investingSince: Date.now(),
      },
      {
        id: "stock:D",
        ticker: "DDD",
        name: "Asset D",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 10,
        annualDividend: 1,
        targetYield: 10,
        ceilingPrice: 12,
        safetyMargin: 5,
        quantity: 100,
        averagePrice: 9,
        paymentMonths: [4],
        payoutRatio: 0.5,
        addedAt: Date.now(),
        investingSince: Date.now(),
      },
      {
        id: "stock:E",
        ticker: "EEE",
        name: "Asset E",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 10,
        annualDividend: 1,
        targetYield: 10,
        ceilingPrice: 12,
        safetyMargin: 5,
        quantity: 100,
        averagePrice: 9,
        paymentMonths: [5],
        payoutRatio: 0.5,
        addedAt: Date.now(),
        investingSince: Date.now(),
      },
      {
        id: "stock:F",
        ticker: "FFF",
        name: "Asset F",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 10,
        annualDividend: 1,
        targetYield: 10,
        ceilingPrice: 12,
        safetyMargin: 5,
        quantity: 100,
        averagePrice: 9,
        paymentMonths: [6],
        payoutRatio: 0.5,
        addedAt: Date.now(),
        investingSince: Date.now(),
      },
    ];

    const dividendEventsMap: DividendEventsMap = {
      AAA: [{ exDate: "2026-02-01", paymentDate: "2026-02-15", amountPerShare: 0.5 }],
      BBB: [{ exDate: "2026-03-01", paymentDate: "2026-03-15", amountPerShare: 0.5 }],
      CCC: [{ exDate: "2026-04-01", paymentDate: "2026-04-15", amountPerShare: 0.5 }],
      DDD: [{ exDate: "2026-05-01", paymentDate: "2026-05-15", amountPerShare: 0.5 }],
      EEE: [{ exDate: "2026-06-01", paymentDate: "2026-06-15", amountPerShare: 0.5 }],
      FFF: [{ exDate: "2026-07-01", paymentDate: "2026-07-15", amountPerShare: 0.5 }],
    };

    const mockNow = new Date("2026-01-01T12:00:00.000Z").getTime();
    const { sortedList, totalCount } = computeUpcomingPayments(
      items,
      {},
      dividendEventsMap,
      mockNow,
    );

    // Should return ALL 6 items (not sliced to 4)
    expect(totalCount).toBe(6);
    expect(sortedList.length).toBe(6);

    // Should be sorted by date
    expect(sortedList[0].item.ticker).toBe("AAA");
    expect(sortedList[1].item.ticker).toBe("BBB");
    expect(sortedList[2].item.ticker).toBe("CCC");
    expect(sortedList[3].item.ticker).toBe("DDD");
    expect(sortedList[4].item.ticker).toBe("EEE");
    expect(sortedList[5].item.ticker).toBe("FFF");
  });
});
