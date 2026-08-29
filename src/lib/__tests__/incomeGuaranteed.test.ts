import { describe, it, expect } from "vitest";
import { buildConfirmedUpcoming, buildWeakMonths, buildAnnualDividends } from "../incomeGuaranteed";
import type { RealizedIncomeEvent } from "../realizedIncome";
import type { MonthBucket, MonthContributor } from "../cashflow";

function mkEvent(overrides: Partial<RealizedIncomeEvent>): RealizedIncomeEvent {
  return {
    ticker: "TAEE11",
    currency: "BRL",
    exDate: "2026-01-01",
    paymentDate: "2026-01-10",
    isPaid: false,
    quantityHeld: 10,
    amountPerShareGross: 1,
    amountGross: 10,
    amountNet: 10,
    taxType: "dividend",
    ...overrides,
  };
}

function mkBucket(overrides: Partial<MonthBucket> & { contributors?: MonthContributor[] }): MonthBucket {
  return {
    month: "Jan",
    monthIndex: 0,
    calendarMonth: 0,
    calendarYear: 2026,
    amount: 0,
    paidAmount: 0,
    realizedAmount: 0,
    announcedAmount: 0,
    projectedAmount: 0,
    cumulativeTotal: 0,
    contributors: [],
    isBest: false,
    isWorst: false,
    concentratedTicker: null,
    ...overrides,
  };
}

describe("buildConfirmedUpcoming", () => {
  it("includes only unpaid events within the window, sorted soonest-first", () => {
    const events = [
      mkEvent({ ticker: "A", isPaid: false, paymentDate: "2026-03-01" }), // 60 days out
      mkEvent({ ticker: "B", isPaid: false, paymentDate: "2026-01-05" }), // 4 days out
      mkEvent({ ticker: "C", isPaid: true, paymentDate: "2026-01-05" }), // already paid, excluded
      mkEvent({ ticker: "D", isPaid: false, paymentDate: "2026-06-01" }), // beyond window, excluded
      mkEvent({ ticker: "E", isPaid: false, paymentDate: null }), // no date, excluded
    ];

    const rows = buildConfirmedUpcoming(events, "2026-01-01", 60);

    expect(rows.map((r) => r.ticker)).toEqual(["B", "A"]);
    expect(rows[0].daysUntilPayment).toBe(4);
  });

  it("returns an empty array when nothing is announced", () => {
    expect(buildConfirmedUpcoming([mkEvent({ isPaid: true })], "2026-01-01")).toEqual([]);
  });
});

describe("buildWeakMonths", () => {
  it("flags months with no top-3-ticker payer and ranks tickers by total contribution", () => {
    const buckets: MonthBucket[] = [
      mkBucket({
        monthIndex: 0,
        amount: 500,
        contributors: [
          { ticker: "BBAS3", amount: 500, type: "STOCK_BR" },
          { ticker: "TAEE11", amount: 400, type: "STOCK_BR" },
          { ticker: "HGLG11", amount: 300, type: "FII" },
        ],
      }),
      mkBucket({ monthIndex: 1, amount: 50, contributors: [{ ticker: "SMALL", amount: 50, type: "STOCK_BR" }] }),
      mkBucket({
        monthIndex: 2,
        amount: 500,
        contributors: [
          { ticker: "BBAS3", amount: 500, type: "STOCK_BR" },
          { ticker: "TAEE11", amount: 400, type: "STOCK_BR" },
          { ticker: "HGLG11", amount: 300, type: "FII" },
        ],
      }),
    ];

    const result = buildWeakMonths(buckets);

    expect(result.topTickers).toEqual(["BBAS3", "TAEE11", "HGLG11"]);
    expect(result.weakMonthIndexes).toEqual([1]);
    expect(result.weakMonthThreshold).toBe(50);
    expect(result.monthlyAmounts).toEqual([500, 50, 500]);
  });

  it("flags no weak months when every month has a top payer", () => {
    const buckets: MonthBucket[] = [
      mkBucket({ monthIndex: 0, amount: 100, contributors: [{ ticker: "X", amount: 100, type: "STOCK_BR" }] }),
    ];
    expect(buildWeakMonths(buckets).weakMonthIndexes).toEqual([]);
  });
});

describe("buildAnnualDividends", () => {
  it("sums paid events per past year and splits the current year received/projected", () => {
    const events: RealizedIncomeEvent[] = [
      mkEvent({ isPaid: true, paymentDate: "2024-06-01", amountNet: 100, currency: "BRL" }),
      mkEvent({ isPaid: true, paymentDate: "2025-06-01", amountNet: 200, currency: "BRL" }),
      mkEvent({ isPaid: false, paymentDate: "2026-06-01", amountNet: 999, currency: "BRL" }), // excluded from past-year sums
    ];
    const currentYearBuckets: MonthBucket[] = [
      mkBucket({ realizedAmount: 150, announcedAmount: 0, projectedAmount: 0 }),
      mkBucket({ realizedAmount: 0, announcedAmount: 50, projectedAmount: 100 }),
    ];

    const result = buildAnnualDividends(events, currentYearBuckets, "BRL", undefined, 2, "2026-01-01");

    expect(result.years.map((y) => y.year)).toEqual([2024, 2025, 2026]);
    expect(result.years[0].receivedAmount).toBe(100);
    expect(result.years[1].receivedAmount).toBe(200);
    expect(result.years[2]).toMatchObject({ receivedAmount: 150, projectedAmount: 150, isCurrentYear: true });
    // (150+150)/100 - 1 = 200% growth over 2 years
    expect(result.totalGrowthPct).toBe(200);
  });

  it("returns 0% growth when the first year has no income (avoids divide-by-zero)", () => {
    const result = buildAnnualDividends([], [mkBucket({})], "BRL", undefined, 1, "2026-01-01");
    expect(result.totalGrowthPct).toBe(0);
    expect(result.cagrPct).toBe(0);
  });
});
