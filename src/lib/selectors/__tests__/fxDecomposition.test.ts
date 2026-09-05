import { describe, it, expect } from "vitest";
import { computeFxDecomposition } from "../fxDecomposition";
import type { ValuedWatchlistItem } from "../../useValuedPortfolio";

function makeItem(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  return {
    id: overrides.ticker ?? "TICKER",
    ticker: "TICKER",
    name: "Test US Asset",
    type: "STOCK_US",
    currency: "USD",
    currentPrice: 70,
    annualDividend: 2,
    targetYield: 3,
    ceilingPrice: 75,
    safetyMargin: 0.1,
    quantity: 10,
    averagePrice: 60,
    paymentMonths: [],
    payoutRatio: null,
    addedAt: 1700000000000,
    livePrice: 70,
    sector: "Technology",
    valuation: {} as any,
    isClosedPosition: false,
    ...overrides,
  } as ValuedWatchlistItem;
}

describe("computeFxDecomposition", () => {
  it("filters out non-USD and closed positions", () => {
    const items = [
      makeItem({ ticker: "AAPL", currency: "USD", quantity: 10, averagePrice: 150, livePrice: 180 }),
      makeItem({ ticker: "VALE3", currency: "BRL", quantity: 100, averagePrice: 60, livePrice: 65 }),
      makeItem({ ticker: "MSFT", currency: "USD", quantity: 5, averagePrice: 200, isClosedPosition: true }),
    ];

    const result = computeFxDecomposition(items, 5.5);

    expect(result.usAssets).toHaveLength(1);
    expect(result.usAssets[0].ticker).toBe("AAPL");
  });

  it("calculates asset return in USD and compound return in BRL correctly", () => {
    const items = [
      makeItem({ ticker: "KO", currency: "USD", quantity: 100, averagePrice: 50, livePrice: 60 }),
    ];

    // Current USD rate 5.50
    const result = computeFxDecomposition(items, 5.5);

    expect(result.usAssets).toHaveLength(1);
    const asset = result.usAssets[0];

    // Asset gain: (60 - 50) / 50 = +20%
    expect(asset.assetReturnPct).toBeCloseTo(20);
    expect(asset.assetGainUsd).toBe(1000); // 10 * 100

    // Compound total return BRL must be greater than asset return due to positive FX effect
    expect(asset.totalReturnBrlPct).toBeGreaterThan(asset.assetReturnPct);
    expect(result.totalCurrentUsd).toBe(6000);
    expect(result.totalInvestedUsd).toBe(5000);
  });

  it("handles empty or non-US portfolios gracefully", () => {
    const items = [
      makeItem({ ticker: "BBAS3", currency: "BRL", quantity: 100 }),
    ];

    const result = computeFxDecomposition(items, 5.5);

    expect(result.usAssets).toHaveLength(0);
    expect(result.totalCurrentUsd).toBe(0);
    expect(result.totalProfitBrl).toBe(0);
  });
});
