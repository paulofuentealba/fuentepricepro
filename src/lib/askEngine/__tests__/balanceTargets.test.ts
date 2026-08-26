import { describe, it, expect } from "vitest";
import { runAsk } from "../engine";
import { balanceTargetsStrategy, runBalanceTargets } from "../strategies/balanceTargets";
import type { AskContext, AskStrategyContext } from "../types";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

function createMockPosition(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  const margin = overrides.safetyMargin ?? 46.2;
  const ceiling = overrides.ceilingPrice ?? 41.67;

  const base: ValuedWatchlistItem = {
    id: "item-1",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 28.5,
    livePrice: 28.5,
    annualDividend: 2.5,
    targetYield: 6,
    ceilingPrice: ceiling,
    safetyMargin: margin,
    quantity: 100,
    averagePrice: 25.0,
    paymentMonths: [3, 6, 9, 12],
    payoutRatio: 40,
    sector: "Financeiro",
    addedAt: 1700000000000,
    investingSince: 1700000000000,
    isClosedPosition: false,
    valuation: {
      ticker: "BBAS3",
      activeCeiling: ceiling,
      margin: margin,
      fuenteConsensus: ceiling,
      methods: { bazin: ceiling, graham: 45.0, gordon: 40.0 },
      assumptions: [],
      investorProfile: "moderate",
      bazin: ceiling,
      graham: 45.0,
      gordon: 40.0,
      gordonConfidence: "high",
      consensus: ceiling,
      dividendYield: 8.77,
      positive: true,
      isUnavailable: false,
      yieldTrapWarning: false,
      shareholderYield: null,
    },
  };

  return {
    ...base,
    ...overrides,
    valuation: {
      ...base.valuation,
      activeCeiling: overrides.ceilingPrice ?? base.valuation.activeCeiling,
      margin: overrides.safetyMargin ?? base.valuation.margin,
      ...(overrides.valuation || {}),
    },
  };
}

describe("AskEngine: balanceTargets Strategy", () => {
  it("prioritizes asset class that is furthest below its configured target", () => {
    // Current portfolio:
    // STOCK_BR: 100 * 20 = 2000 BRL
    // FII: 0 * 100 = 0 BRL
    // Total = 2000 BRL
    // Targets: STOCK_BR 50%, FII 50%
    // Available: 1000 BRL
    // Projected total = 3000 BRL. Target FII = 1500 BRL, Deficit FII = 1500 BRL. Target STOCK_BR = 1500 BRL, Deficit = -500 BRL.
    // Therefore, FII has highest deficit.

    const stock = createMockPosition({
      ticker: "VALE3",
      type: "STOCK_BR",
      livePrice: 20,
      quantity: 100,
      safetyMargin: 25,
    });

    const fii = createMockPosition({
      ticker: "HGLG11",
      type: "FII",
      livePrice: 100,
      quantity: 0,
      safetyMargin: 15,
    });

    const strategyCtx: AskStrategyContext = {
      eligiblePositions: [stock, fii],
      availableAmount: 1000,
      settings: {
        smartAllocationTargets: {
          STOCK_BR: 50,
          STOCK_US: 0,
          FII: 50,
          REIT: 0,
          ETF: 0,
          FII_INFRA: 0,
          FIAGRO: 0,
          FIXED_INCOME: 0,
        },
      },
      asOf: "2026-08-26T10:00:00.000Z",
    };

    const candidates = runBalanceTargets(strategyCtx);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].ticker).toBe("HGLG11");
    expect(candidates[0].suggestedQuantity).toBe(10); // 1000 / 100
    expect(candidates[0].reasonKey).toBe("askEngine.reasons.farthestBelowTarget");
    expect(candidates[0].reasonParams).toEqual({
      classType: "FII",
      margin: 15,
    });
  });

  it("breaks ties within the same class by safety margin (descending) and ticker (ascending)", () => {
    const stockA = createMockPosition({
      ticker: "BBAS3",
      type: "STOCK_BR",
      livePrice: 25,
      quantity: 0,
      safetyMargin: 30,
    });

    const stockB = createMockPosition({
      ticker: "ITSA4",
      type: "STOCK_BR",
      livePrice: 10,
      quantity: 0,
      safetyMargin: 40, // Higher margin -> should come first
    });

    const strategyCtx: AskStrategyContext = {
      eligiblePositions: [stockA, stockB],
      availableAmount: 500,
      settings: {
        smartAllocationTargets: {
          STOCK_BR: 100,
          STOCK_US: 0,
          FII: 0,
          REIT: 0,
          ETF: 0,
          FII_INFRA: 0,
          FIAGRO: 0,
          FIXED_INCOME: 0,
        },
      },
      asOf: "2026-08-26T10:00:00.000Z",
    };

    const candidates = runBalanceTargets(strategyCtx);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].ticker).toBe("ITSA4");
    expect(candidates[0].suggestedQuantity).toBe(50); // 500 / 10
  });

  it("runs end-to-end through runAsk computing consequences and integer shares", () => {
    const fii1 = createMockPosition({
      ticker: "KNRI11",
      type: "FII",
      livePrice: 140,
      annualDividend: 12.0,
      quantity: 0,
      safetyMargin: 20,
    });

    const fii2 = createMockPosition({
      ticker: "XPML11",
      type: "FII",
      livePrice: 100,
      annualDividend: 9.6,
      quantity: 0,
      safetyMargin: 10,
    });

    const ctx: AskContext = {
      positions: [fii1, fii2],
      availableAmount: 1000,
      settings: {
        smartAllocationTargets: {
          STOCK_BR: 0,
          STOCK_US: 0,
          FII: 100,
          REIT: 0,
          ETF: 0,
          FII_INFRA: 0,
          FIAGRO: 0,
          FIXED_INCOME: 0,
        },
      },
      asOf: "2026-08-26T10:00:00.000Z",
    };

    const result = runAsk(ctx, balanceTargetsStrategy);

    expect(result.state).toBe("success");
    expect(result.allocations).toHaveLength(1);
    // KNRI11 had higher margin (20 vs 10). Math.floor(1000 / 140) = 7 shares = 980 BRL.
    expect(result.allocations[0].ticker).toBe("KNRI11");
    expect(result.allocations[0].quantity).toBe(7);
    expect(result.allocations[0].amountBRL).toBe(980);
    expect(result.leftover).toBe(20);

    // Invariant check: 980 + 20 === 1000
    expect(result.allocations[0].amountBRL + result.leftover).toBe(1000);

    // Percent of total: 98%
    expect(result.allocations[0].percentOfTotal).toBe(98);

    // Consequences: 7 shares * 12.0 annual dividend = 84.00 BRL
    expect(result.consequences).toHaveLength(1);
    expect(result.consequences[0]).toEqual({
      kind: "income",
      valueKey: "askEngine.consequences.annualIncomeAdded",
      value: 84,
    });
  });
});
