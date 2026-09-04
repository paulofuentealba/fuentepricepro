import { describe, it, expect } from "vitest";
import { runAsk, calculateAllocationPercentages } from "../engine";
import type { AskContext, Strategy, StrategyCandidate } from "../types";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

function createMockPosition(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
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
    ceilingPrice: 41.67,
    safetyMargin: 46.2,
    quantity: 100,
    averagePrice: 25.0,
    paymentMonths: [3, 6, 9, 12],
    payoutRatio: 40,
    sector: "Financeiro",
    addedAt: 1700000000000,
    investingSince: 1700000000000,
    isClosedPosition: false,
    isBffMode: true,
    valuation: {
      ticker: "BBAS3",
      activeCeiling: 41.67,
      margin: 46.2,
      fuenteConsensus: 41.67,
      methods: { bazin: 41.67, graham: 45.0, gordon: 40.0, lynch: null },
      assumptions: [],
      investorProfile: "moderate",
      bazin: 41.67,
      graham: 45.0,
      gordon: 40.0,
      lynch: null,
      gordonConfidence: "high",
      consensus: 41.67,
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
      ...(overrides.valuation || {}),
    },
  };
}

describe("AskEngine: engine (runAsk & Hare-Niemeyer)", () => {
  const dummyStrategy: Strategy = {
    id: "dummy",
    labelKey: "askEngine.strategies.dummy",
    requiresTargets: true,
    run: ({ eligiblePositions }) => {
      return eligiblePositions.map((pos) => ({
        ticker: pos.ticker,
        suggestedQuantity: 10,
        reasonKey: "askEngine.reasons.dummy",
      }));
    },
  };

  it("enforces the fundamental invariant: sum(allocations) + leftover === availableAmount", () => {
    const pos1 = createMockPosition({ ticker: "BBAS3", livePrice: 28.5 });
    const pos2 = createMockPosition({ ticker: "ITSA4", livePrice: 10.2 });

    const ctx: AskContext = {
      positions: [pos1, pos2],
      availableAmount: 1000,
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

    const result = runAsk(ctx, dummyStrategy);

    expect(result.state).toBe("success");
    const totalSpent = result.allocations.reduce((sum, a) => sum + a.amountBRL, 0);
    expect(Number((totalSpent + result.leftover).toFixed(2))).toBe(1000);
  });

  describe("Guards & Edge Cases", () => {
    it("returns targets_not_configured when smartAllocationTargets is empty, all zeros, or missing", () => {
      const pos = createMockPosition({ ticker: "BBAS3", livePrice: 28.5 });

      const ctxWithoutTargets: AskContext = {
        positions: [pos],
        availableAmount: 1000,
        settings: {
          smartAllocationTargets: {
            STOCK_BR: 0,
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

      const result = runAsk(ctxWithoutTargets, dummyStrategy);

      expect(result.state).toBe("targets_not_configured");
      expect(result.allocations).toEqual([]);
      expect(result.leftover).toBe(1000);
    });

    it("returns insufficient_funds when availableAmount is 0 or negative", () => {
      const pos = createMockPosition({ ticker: "BBAS3", livePrice: 28.5 });

      const ctxZeroBudget: AskContext = {
        positions: [pos],
        availableAmount: 0,
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

      const result = runAsk(ctxZeroBudget, dummyStrategy);
      expect(result.state).toBe("insufficient_funds");
      expect(result.allocations).toEqual([]);
      expect(result.leftover).toBe(0);
    });

    it("returns no_eligible_assets when positions array is empty", () => {
      const ctxEmptyPositions: AskContext = {
        positions: [],
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

      const result = runAsk(ctxEmptyPositions, dummyStrategy);
      expect(result.state).toBe("no_eligible_assets");
      expect(result.allocations).toEqual([]);
      expect(result.leftover).toBe(500);
    });

    it("returns insufficient_funds when availableAmount is smaller than 1 share of any eligible asset", () => {
      const pos = createMockPosition({ ticker: "BBAS3", livePrice: 100 });

      const ctxLowBudget: AskContext = {
        positions: [pos],
        availableAmount: 50, // Less than 1 share of 100
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

      const result = runAsk(ctxLowBudget, dummyStrategy);
      expect(result.state).toBe("insufficient_funds");
      expect(result.allocations).toEqual([]);
      expect(result.leftover).toBe(50);
    });
  });

  describe("StrategyCandidate Sizing Precedence Rules", () => {
    it("uses suggestedQuantity directly when provided", () => {
      const pos = createMockPosition({ ticker: "BBAS3", livePrice: 20 });
      const customStrategy: Strategy = {
        id: "custom",
        labelKey: "custom",
        run: () => [{ ticker: "BBAS3", suggestedQuantity: 5, reasonKey: "test" }],
      };

      const ctx: AskContext = {
        positions: [pos],
        availableAmount: 200,
        settings: {
          smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 },
        },
        asOf: "2026-08-26T10:00:00.000Z",
      };

      const result = runAsk(ctx, customStrategy);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].quantity).toBe(5);
      expect(result.allocations[0].amountBRL).toBe(100);
      expect(result.leftover).toBe(100);
    });

    it("converts allocatedAmount via Math.floor(allocatedAmount / livePrice) when suggestedQuantity is omitted", () => {
      const pos = createMockPosition({ ticker: "BBAS3", livePrice: 25 });
      const customStrategy: Strategy = {
        id: "custom",
        labelKey: "custom",
        run: () => [{ ticker: "BBAS3", allocatedAmount: 80, reasonKey: "test" }],
      };

      const ctx: AskContext = {
        positions: [pos],
        availableAmount: 200,
        settings: {
          smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 },
        },
        asOf: "2026-08-26T10:00:00.000Z",
      };

      const result = runAsk(ctx, customStrategy);
      expect(result.allocations).toHaveLength(1);
      // Math.floor(80 / 25) = 3 shares = 75 BRL
      expect(result.allocations[0].quantity).toBe(3);
      expect(result.allocations[0].amountBRL).toBe(75);
      expect(result.leftover).toBe(125);
    });

    it("prefers suggestedQuantity when both suggestedQuantity and allocatedAmount are provided", () => {
      const pos = createMockPosition({ ticker: "BBAS3", livePrice: 20 });
      const customStrategy: Strategy = {
        id: "custom",
        labelKey: "custom",
        run: () => [
          {
            ticker: "BBAS3",
            suggestedQuantity: 4,
            allocatedAmount: 200, // would be 10 shares, but suggestedQuantity=4 must prevail
            reasonKey: "test",
          },
        ],
      };

      const ctx: AskContext = {
        positions: [pos],
        availableAmount: 500,
        settings: {
          smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 },
        },
        asOf: "2026-08-26T10:00:00.000Z",
      };

      const result = runAsk(ctx, customStrategy);
      expect(result.allocations[0].quantity).toBe(4);
      expect(result.allocations[0].amountBRL).toBe(80);
    });

    it("omits candidate when neither suggestedQuantity nor allocatedAmount is provided", () => {
      const pos = createMockPosition({ ticker: "BBAS3", livePrice: 20 });
      const customStrategy: Strategy = {
        id: "custom",
        labelKey: "custom",
        run: () => [{ ticker: "BBAS3", reasonKey: "test" }],
      };

      const ctx: AskContext = {
        positions: [pos],
        availableAmount: 500,
        settings: {
          smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 },
        },
        asOf: "2026-08-26T10:00:00.000Z",
      };

      const result = runAsk(ctx, customStrategy);
      expect(result.state).toBe("insufficient_funds");
      expect(result.allocations).toHaveLength(0);
      expect(result.leftover).toBe(500);
    });
  });

  describe("Purity & Determinism", () => {
    it("produces identical output for identical input across repeated executions", () => {
      const pos1 = createMockPosition({ ticker: "BBAS3", livePrice: 28.5 });
      const pos2 = createMockPosition({ ticker: "ITSA4", livePrice: 10.2 });

      const ctx: AskContext = {
        positions: [pos1, pos2],
        availableAmount: 1000,
        settings: {
          smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 },
        },
        asOf: "2026-08-26T10:00:00.000Z",
      };

      const run1 = runAsk(ctx, dummyStrategy);
      const run2 = runAsk(ctx, dummyStrategy);

      expect(run1).toEqual(run2);
    });
  });

  describe("Hare-Niemeyer (Largest Remainder) Percentage Distribution", () => {
    it("guarantees sum(percentOfTotal) <= 100 without float rounding drift", () => {
      const allocations = [
        { ticker: "A", amountBRL: 33.33 },
        { ticker: "B", amountBRL: 33.33 },
        { ticker: "C", amountBRL: 33.34 },
      ];
      const percentages = calculateAllocationPercentages(allocations, 100);
      const sum = percentages.reduce((a, b) => a + b, 0);

      expect(sum).toBe(100);
      expect(percentages.every((p) => Number.isInteger(p))).toBe(true);
    });

    it("correctly matches proportional allocated budget when there is leftover", () => {
      const allocations = [
        { ticker: "A", amountBRL: 250 },
        { ticker: "B", amountBRL: 250 },
      ];
      // 500 spent out of 1000 available = exactly 50%
      const percentages = calculateAllocationPercentages(allocations, 1000);
      const sum = percentages.reduce((a, b) => a + b, 0);

      expect(sum).toBe(50);
      expect(percentages).toEqual([25, 25]);
    });
  });
});
