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

    const { displayList, totalCount } = computeUpcomingPayments(
      items,
      {},
      dividendEventsMap,
      mockNow,
    );

    // Must return ONLY 1 entry for PETR4, not 2
    expect(totalCount).toBe(1);
    expect(displayList.length).toBe(1);
    expect(displayList[0].item.ticker).toBe("PETR4");
    // Date must be the earliest future date (2026-08-20)
    expect(displayList[0].date.toISOString()).toBe("2026-08-20T03:00:00.000Z");
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
    const { displayList, totalCount } = computeUpcomingPayments(
      items,
      {},
      dividendEventsMap,
      mockNow,
    );

    expect(totalCount).toBe(2);
    expect(displayList.length).toBe(2);

    // PETR4 (08-20) should come before VALE3 (09-02)
    expect(displayList[0].item.ticker).toBe("PETR4");
    expect(displayList[0].date.toISOString()).toBe("2026-08-20T03:00:00.000Z");

    expect(displayList[1].item.ticker).toBe("VALE3");
    expect(displayList[1].date.toISOString()).toBe("2026-09-02T03:00:00.000Z");
  });
});
