import { describe, it, expect } from "vitest";
import {
  computeSmartAllocation,
  normalize,
  scoreFor,
  calculateAllocationDeviation,
  isOutOfTolerance,
} from "../allocation";
import type { WatchlistItem } from "../watchlist";

function mkItem(overrides: Partial<WatchlistItem>): WatchlistItem {
  return {
    id: overrides.ticker ?? "T",
    ticker: "T",
    name: "Test",
    type: "STOCK_US",
    currency: "USD",
    currentPrice: 10,
    annualDividend: 1,
    targetYield: 6,
    ceilingPrice: 16,
    safetyMargin: 10,
    quantity: 0,
    averagePrice: null,
    paymentMonths: [3, 6, 9, 12],
    payoutRatio: null,
    customTaxRate: null,
    sector: null,
    addedAt: 0,
    ...overrides,
  };
}

describe("normalize", () => {
  it("scales to [0,1] by max", () => {
    expect(normalize([1, 2, 4])).toEqual([0.25, 0.5, 1]);
  });
  it("returns zeros when max<=0", () => {
    expect(normalize([0, 0])).toEqual([0, 0]);
    expect(normalize([-1, -2])).toEqual([0, 0]);
  });
});

describe("allocation tolerance and deviation helpers", () => {
  it("calculateAllocationDeviation computes difference in percentage points", () => {
    expect(calculateAllocationDeviation(35, 30)).toBe(5);
    expect(calculateAllocationDeviation(20, 30)).toBe(-10);
    expect(calculateAllocationDeviation(30, 30)).toBe(0);
    expect(calculateAllocationDeviation(null, 30)).toBeNull();
    expect(calculateAllocationDeviation(undefined, 30)).toBeNull();
  });

  it("isOutOfTolerance flags deviations exceeding threshold", () => {
    // Tolerância padrão: 2 p.p.
    expect(isOutOfTolerance(31, 30)).toBe(false); // desvio = +1 (<= 2)
    expect(isOutOfTolerance(32, 30)).toBe(false); // desvio = +2 (<= 2)
    expect(isOutOfTolerance(32.1, 30)).toBe(true); // desvio = +2.1 (> 2)
    expect(isOutOfTolerance(28, 30)).toBe(false); // desvio = -2 (<= 2)
    expect(isOutOfTolerance(27.9, 30)).toBe(true); // desvio = -2.1 (> 2)

    // Com tolerância customizada
    expect(isOutOfTolerance(34, 30, 5)).toBe(false); // desvio = 4 (<= 5)
    expect(isOutOfTolerance(36, 30, 5)).toBe(true); // desvio = 6 (> 5)

    // Trata valores nulos ou indefinidos como false (sem alerta)
    expect(isOutOfTolerance(null, 30)).toBe(false);
    expect(isOutOfTolerance(undefined, 30)).toBe(false);
  });
});

describe("scoreFor", () => {
  const covered = new Set<number>();
  it("yield = annualDividend/price", () => {
    // STOCK_US defaults to 30% tax, so 2 * 0.7 = 1.4. Yield = 1.4 / 20 = 0.07
    expect(scoreFor(mkItem({ annualDividend: 2, currentPrice: 20 }), "yield", covered)).toBeCloseTo(
      0.07,
    );
  });
  it("margin clamps negatives to 0", () => {
    expect(scoreFor(mkItem({ safetyMargin: -5 }), "margin", covered)).toBe(0);
    expect(scoreFor(mkItem({ safetyMargin: 15 }), "margin", covered)).toBe(15);
  });
  it("gapFiller rewards uncovered months", () => {
    const c = new Set([3, 6]);
    const s = scoreFor(mkItem({ paymentMonths: [3, 6, 9, 12] }), "gapFiller", c);
    expect(s).toBeCloseTo(2 / 12);
  });
});

describe("computeSmartAllocation multi-strategy weighted scoring", () => {
  const covered = new Set<number>();
  const items = [
    mkItem({ ticker: "A", annualDividend: 2, currentPrice: 10, safetyMargin: 5 }), // yield 0.2
    mkItem({ ticker: "B", annualDividend: 1, currentPrice: 10, safetyMargin: 50 }), // yield 0.1
    mkItem({ ticker: "C", annualDividend: 0.5, currentPrice: 10, safetyMargin: 1 }), // yield 0.05
  ];

  it("allocates all capital proportionally to top scorers (single strategy)", () => {
    const result = computeSmartAllocation(
      1000,
      "USD",
      items,
      ["yield"],
      [],
      {
        STOCK_US: 0,
        FII: 0,
        STOCK_BR: 0,
        REIT: 0,
        FII_INFRA: 0,
        FIAGRO: 0,
        ETF: 0,
        FIXED_INCOME: 0,
      },
      5,
    );
    const recs = result?.recs || [];
    expect(recs.map((r) => r.item.ticker)).toEqual(["A", "B", "C"]);
    const spent = recs.reduce((s, r) => s + r.cost, 0);
    expect(spent).toBeLessThanOrEqual(1000);
    // A has highest yield -> highest cost
    expect(recs[0].cost).toBeGreaterThan(recs[1].cost);
  });

  it("excluded tickers are ignored", () => {
    const result = computeSmartAllocation(
      1000,
      "USD",
      items,
      ["yield"],
      ["A"],
      {
        STOCK_US: 0,
        FII: 0,
        STOCK_BR: 0,
        REIT: 0,
        FII_INFRA: 0,
        FIAGRO: 0,
        ETF: 0,
        FIXED_INCOME: 0,
      },
      5,
    );
    const recs = result?.recs || [];
    expect(recs.map((r) => r.item.ticker)).not.toContain("A");
  });

  it("multi-strategy averages normalized scores", () => {
    const result = computeSmartAllocation(
      1000,
      "USD",
      items,
      ["yield", "margin"],
      [],
      {
        STOCK_US: 0,
        FII: 0,
        STOCK_BR: 0,
        REIT: 0,
        FII_INFRA: 0,
        FIAGRO: 0,
        ETF: 0,
        FIXED_INCOME: 0,
      },
      5,
    );
    const recs = result?.recs || [];
    // B has high margin (50) so it should not be dominated as heavily
    const byTicker = Object.fromEntries(recs.map((r) => [r.item.ticker, r]));
    expect(byTicker.B.cost).toBeGreaterThan(0);
    expect(byTicker.A.cost).toBeGreaterThan(0);
  });

  it("returns empty when no viable candidates", () => {
    expect(
      computeSmartAllocation(
        1000,
        "USD",
        [],
        ["yield"],
        [],
        {
          STOCK_US: 0,
          FII: 0,
          STOCK_BR: 0,
          REIT: 0,
          FII_INFRA: 0,
          FIAGRO: 0,
          ETF: 0,
          FIXED_INCOME: 0,
        },
        5,
      )?.recs,
    ).toEqual([]);
    expect(
      computeSmartAllocation(
        1000,
        "USD",
        [mkItem({ annualDividend: 0 })],
        ["yield"],
        [],
        {
          STOCK_US: 0,
          FII: 0,
          STOCK_BR: 0,
          REIT: 0,
          FII_INFRA: 0,
          FIAGRO: 0,
          ETF: 0,
          FIXED_INCOME: 0,
        },
        5,
      )?.recs || [],
    ).toEqual([]);
  });

  it("shares are integer (floor of budget/price)", () => {
    const result = computeSmartAllocation(
      1000,
      "USD",
      items,
      ["yield"],
      [],
      {
        STOCK_US: 0,
        FII: 0,
        STOCK_BR: 0,
        REIT: 0,
        FII_INFRA: 0,
        FIAGRO: 0,
        ETF: 0,
        FIXED_INCOME: 0,
      },
      5,
    );
    const recs = result?.recs || [];
    for (const r of recs) expect(Number.isInteger(r.shares)).toBe(true);
  });
});
