import { describe, it, expect } from "vitest";
import { computeMarketScope } from "../useMarketScope";
import { US_CLASSES_ORDER, EIGHT_CLASSES_ORDER } from "../selectors/eightClassAllocation";
import type { ValuedWatchlistItem } from "../useValuedPortfolio";

describe("computeMarketScope", () => {
  it("determines 100% US native scope when taxJurisdiction is US and no BR positions", () => {
    const positions: ValuedWatchlistItem[] = [
      {
        id: "1",
        ticker: "KO",
        type: "STOCK_US",
        currency: "USD",
        quantity: 10,
        currentPrice: 60,
      } as ValuedWatchlistItem,
      {
        id: "2",
        ticker: "O",
        type: "REIT",
        currency: "USD",
        quantity: 20,
        currentPrice: 55,
      } as ValuedWatchlistItem,
    ];

    const scope = computeMarketScope("US", positions);

    expect(scope.isUS).toBe(true);
    expect(scope.hasBrPositions).toBe(false);
    expect(scope.hasUsPositions).toBe(true);
    expect(scope.isUSNative).toBe(true);
    expect(scope.isBRNative).toBe(false);
    expect(scope.isDual).toBe(false);
    expect(scope.defaultScreenerMarket).toBe("US");
    expect(scope.visibleAllocationClasses).toEqual(US_CLASSES_ORDER);
    expect(scope.priorityBrokers).toContain("FIDELITY");
    expect(scope.priorityBrokers).toContain("SCHWAB");
  });

  it("determines 100% BR native scope when taxJurisdiction is BR and no US positions", () => {
    const positions: ValuedWatchlistItem[] = [
      {
        id: "1",
        ticker: "PETR4",
        type: "STOCK_BR",
        currency: "BRL",
        quantity: 100,
        currentPrice: 30,
      } as ValuedWatchlistItem,
      {
        id: "2",
        ticker: "HGLG11",
        type: "FII",
        currency: "BRL",
        quantity: 10,
        currentPrice: 160,
      } as ValuedWatchlistItem,
    ];

    const scope = computeMarketScope("BR", positions);

    expect(scope.isUS).toBe(false);
    expect(scope.hasBrPositions).toBe(true);
    expect(scope.hasUsPositions).toBe(false);
    expect(scope.isUSNative).toBe(false);
    expect(scope.isBRNative).toBe(true);
    expect(scope.isDual).toBe(false);
    expect(scope.defaultScreenerMarket).toBe("ALL");
    expect(scope.visibleAllocationClasses).toEqual(EIGHT_CLASSES_ORDER);
    expect(scope.priorityBrokers).toContain("XP");
    expect(scope.priorityBrokers).toContain("BTG");
  });

  it("determines Dual scope when user holds assets from both markets", () => {
    const positions: ValuedWatchlistItem[] = [
      {
        id: "1",
        ticker: "PETR4",
        type: "STOCK_BR",
        currency: "BRL",
        quantity: 100,
        currentPrice: 30,
      } as ValuedWatchlistItem,
      {
        id: "2",
        ticker: "KO",
        type: "STOCK_US",
        currency: "USD",
        quantity: 10,
        currentPrice: 60,
      } as ValuedWatchlistItem,
    ];

    const scope = computeMarketScope("US", positions);

    expect(scope.isUS).toBe(true);
    expect(scope.hasBrPositions).toBe(true);
    expect(scope.hasUsPositions).toBe(true);
    expect(scope.isUSNative).toBe(false);
    expect(scope.isDual).toBe(true);
    expect(scope.visibleAllocationClasses).toEqual(EIGHT_CLASSES_ORDER);
  });
});
