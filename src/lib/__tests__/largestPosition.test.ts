import { describe, it, expect } from "vitest";
import { getLargestPosition } from "../selectors/largestPosition";
import type { ValuedWatchlistItem } from "../useValuedPortfolio";

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

describe("getLargestPosition", () => {
  it("returns null for an empty portfolio", () => {
    expect(getLargestPosition([])).toBeNull();
  });

  it("picks the item with the highest market value (price * quantity)", () => {
    const small = makeItem({ ticker: "SMALL", currentPrice: 10, quantity: 5 }); // 50
    const large = makeItem({ ticker: "LARGE", currentPrice: 100, quantity: 20 }); // 2000
    const medium = makeItem({ ticker: "MEDIUM", currentPrice: 50, quantity: 10 }); // 500

    const result = getLargestPosition([small, large, medium]);

    expect(result).not.toBeNull();
    expect(result!.item.ticker).toBe("LARGE");
    expect(result!.marketValue).toBe(2000);
  });

  it("ignores closed positions even if quantity/price would otherwise dominate", () => {
    const closed = makeItem({
      ticker: "CLOSED",
      currentPrice: 1000,
      quantity: 100,
      isClosedPosition: true,
    });
    const open = makeItem({ ticker: "OPEN", currentPrice: 10, quantity: 1 });

    const result = getLargestPosition([closed, open]);

    expect(result!.item.ticker).toBe("OPEN");
  });

  it("ignores items with zero or negative market value", () => {
    const zero = makeItem({ ticker: "ZERO", currentPrice: 0, quantity: 10 });
    const negative = makeItem({ ticker: "NEG", currentPrice: -5, quantity: 10 });

    expect(getLargestPosition([zero, negative])).toBeNull();
  });
});
