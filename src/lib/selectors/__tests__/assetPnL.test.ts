import { describe, it, expect } from "vitest";
import { getAssetPnL } from "../assetPnL";
import type { ValuedWatchlistItem } from "../../useValuedPortfolio";

function makeItem(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  return {
    id: overrides.ticker ?? "TICKER",
    ticker: "TICKER",
    name: "Test Asset",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 10,
    annualDividend: 1,
    targetYield: 6,
    ceilingPrice: 12,
    safetyMargin: 0.2,
    quantity: 1,
    averagePrice: 9,
    paymentMonths: [],
    payoutRatio: null,
    addedAt: 1700000000000,
    livePrice: 10,
    sector: "Other",
    valuation: {} as any,
    isClosedPosition: false,
    ...overrides,
  } as ValuedWatchlistItem;
}

describe("getAssetPnL", () => {
  it("computes positive P&L (gain)", () => {
    const item = makeItem({ currentPrice: 15, averagePrice: 10, quantity: 2 });

    const result = getAssetPnL(item);

    expect(result.pnlAbsolute).toBe(10); // (15 - 10) * 2
    expect(result.pnlPercent).toBeCloseTo(0.5); // (15 - 10) / 10
  });

  it("computes negative P&L (loss)", () => {
    const item = makeItem({ currentPrice: 8, averagePrice: 10, quantity: 3 });

    const result = getAssetPnL(item);

    expect(result.pnlAbsolute).toBe(-6); // (8 - 10) * 3
    expect(result.pnlPercent).toBeCloseTo(-0.2); // (8 - 10) / 10
  });

  it("returns zero P&L for a zeroed-out position (quantity 0)", () => {
    const item = makeItem({ currentPrice: 20, averagePrice: 10, quantity: 0 });

    const result = getAssetPnL(item);

    expect(result.pnlAbsolute).toBe(0);
    expect(result.pnlPercent).toBeCloseTo(1); // percent unaffected by quantity
  });

  it("guards against averagePrice === 0, returning pnlPercent 0 instead of Infinity/NaN", () => {
    const item = makeItem({ currentPrice: 10, averagePrice: 0, quantity: 5 });

    const result = getAssetPnL(item);

    expect(result.pnlAbsolute).toBe(50); // (10 - 0) * 5
    expect(result.pnlPercent).toBe(0);
    expect(Number.isFinite(result.pnlPercent)).toBe(true);
  });

  it("guards against averagePrice === null, treating it as 0", () => {
    const item = makeItem({ currentPrice: 10, averagePrice: null as any, quantity: 5 });

    const result = getAssetPnL(item);

    expect(result.pnlAbsolute).toBe(50);
    expect(result.pnlPercent).toBe(0);
  });
});
