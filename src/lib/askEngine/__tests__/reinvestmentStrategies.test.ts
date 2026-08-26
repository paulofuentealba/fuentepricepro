import { describe, it, expect } from "vitest";
import { runAsk } from "../engine";
import { accelerateSnowballStrategy, runAccelerateSnowball } from "../strategies/accelerateSnowball";
import { correctDriftStrategy } from "../strategies/correctDrift";
import { balanceTargetsStrategy, runBalanceTargets } from "../strategies/balanceTargets";
import { reinforcePayerStrategy, runReinforcePayer } from "../strategies/reinforcePayer";
import type { AskContext, AskStrategyContext } from "../types";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

function createMockPosition(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  const margin = overrides.safetyMargin ?? 46.2;
  const ceiling = overrides.ceilingPrice ?? 41.67;
  const dy = overrides.valuation?.dividendYield ?? 8.77;

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
      dividendYield: dy,
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
      dividendYield: overrides.valuation?.dividendYield ?? base.valuation.dividendYield,
      ...(overrides.valuation || {}),
    },
  };
}

describe("Reinvestment Strategies (Prompt 134 / Item 1.2)", () => {
  describe("Strategy 1: accelerateSnowball", () => {
    it("ranks positions strictly by net dividendYield from SSOT (not gross recalculation)", () => {
      // Asset BR: Gross 8.0%, Net 8.0% (tax exempt) -> dividendYield = 8.0
      const posBR = createMockPosition({
        ticker: "PETR4",
        type: "STOCK_BR",
        currency: "BRL",
        livePrice: 30,
        annualDividend: 2.4, // Gross yield = 8.0%
        valuation: {
          ticker: "PETR4",
          activeCeiling: 40,
          margin: 33.3,
          fuenteConsensus: 40,
          methods: { bazin: 40, graham: null, gordon: null },
          assumptions: [],
          investorProfile: "moderate",
          bazin: 40,
          graham: null,
          gordon: null,
          gordonConfidence: null,
          consensus: 40,
          dividendYield: 8.0, // SSOT Net DY
          positive: true,
          isUnavailable: false,
          yieldTrapWarning: false,
          shareholderYield: null,
        },
      });

      // Asset US: Gross 10.0%, Net 7.0% after 30% US Withholding Tax -> dividendYield = 7.0
      const posUS = createMockPosition({
        ticker: "O",
        type: "REIT",
        currency: "USD",
        livePrice: 50,
        annualDividend: 5.0, // Gross 10.0%, but Net is 7.0%
        valuation: {
          ticker: "O",
          activeCeiling: 60,
          margin: 20,
          fuenteConsensus: 60,
          methods: { bazin: 60, graham: null, gordon: null },
          assumptions: [],
          investorProfile: "moderate",
          bazin: 60,
          graham: null,
          gordon: null,
          gordonConfidence: null,
          consensus: 60,
          dividendYield: 7.0, // SSOT Net DY
          positive: true,
          isUnavailable: false,
          yieldTrapWarning: false,
          shareholderYield: null,
        },
      });

      const ctx: AskStrategyContext = {
        eligiblePositions: [posUS, posBR], // Provided with US first
        availableAmount: 300,
        settings: { smartAllocationTargets: { STOCK_BR: 50, STOCK_US: 0, FII: 0, REIT: 50, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 } },
        asOf: "2026-08-26T10:00:00.000Z",
      };

      const candidates = runAccelerateSnowball(ctx);

      // PETR4 must be ranked first because its net DY (8.0%) > O (7.0%)
      expect(candidates[0].ticker).toBe("PETR4");
      expect(candidates[0].suggestedQuantity).toBe(10); // 300 / 30
      expect(candidates[0].reasonKey).toBe("askEngine.reasons.highestNetYield");
      expect(candidates[0].reasonParams).toEqual({ yield: 8.0 });
    });

    it("resists fractional shares and respects remaining budget cap", () => {
      const pos = createMockPosition({
        ticker: "VALE3",
        livePrice: 70,
        valuation: {
          ticker: "VALE3",
          activeCeiling: 90,
          margin: 28.5,
          fuenteConsensus: 90,
          methods: { bazin: 90, graham: null, gordon: null },
          assumptions: [],
          investorProfile: "moderate",
          bazin: 90,
          graham: null,
          gordon: null,
          gordonConfidence: null,
          consensus: 90,
          dividendYield: 11.5,
          positive: true,
          isUnavailable: false,
          yieldTrapWarning: false,
          shareholderYield: null,
        },
      });

      const ctx: AskContext = {
        positions: [pos],
        availableAmount: 200, // 200 / 70 = 2 shares (140 BRL) with 60 BRL leftover
        settings: {
          smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 },
        },
        asOf: "2026-08-26T10:00:00.000Z",
      };

      const result = runAsk(ctx, accelerateSnowballStrategy);

      expect(result.state).toBe("success");
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].quantity).toBe(2);
      expect(result.allocations[0].amountBRL).toBe(140);
      expect(result.leftover).toBe(60);
      expect(result.allocations[0].amountBRL + result.leftover).toBe(200);
    });

    it("breaks ties by ticker alphabetically", () => {
      const posA = createMockPosition({ ticker: "BBAS3", valuation: { ...createMockPosition({}).valuation, dividendYield: 10.0 } });
      const posB = createMockPosition({ ticker: "ABEV3", valuation: { ...createMockPosition({}).valuation, dividendYield: 10.0 } });

      const ctx: AskStrategyContext = {
        eligiblePositions: [posA, posB],
        availableAmount: 500,
        settings: { smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 } },
        asOf: "2026-08-26T10:00:00.000Z",
      };

      const candidates = runAccelerateSnowball(ctx);
      expect(candidates[0].ticker).toBe("ABEV3"); // ABEV3 comes before BBAS3
    });
  });

  describe("Strategy 2: correctDrift (Zero Duplication Verification)", () => {
    it("is identical in function reference and execution to runBalanceTargets", () => {
      expect(correctDriftStrategy.run).toBe(runBalanceTargets);
      expect(correctDriftStrategy.id).toBe("correctDrift");
      expect(correctDriftStrategy.labelKey).toBe("askEngine.strategies.correctDrift");
      expect(correctDriftStrategy.requiresTargets).toBe(true);
    });

    it("produces identical allocations to balanceTargetsStrategy through runAsk", () => {
      const pos1 = createMockPosition({ ticker: "BBAS3", livePrice: 25, safetyMargin: 30, type: "STOCK_BR" });
      const pos2 = createMockPosition({ ticker: "HGLG11", livePrice: 100, safetyMargin: 15, type: "FII" });

      const ctx: AskContext = {
        positions: [pos1, pos2],
        availableAmount: 1000,
        settings: {
          smartAllocationTargets: { STOCK_BR: 50, STOCK_US: 0, FII: 50, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 },
        },
        asOf: "2026-08-26T10:00:00.000Z",
      };

      const resultBalance = runAsk(ctx, balanceTargetsStrategy);
      const resultDrift = runAsk(ctx, correctDriftStrategy);

      expect(resultDrift.allocations).toEqual(resultBalance.allocations);
      expect(resultDrift.leftover).toEqual(resultBalance.leftover);
      expect(resultDrift.state).toEqual(resultBalance.state);
    });
  });

  describe("Strategy 3: reinforcePayer", () => {
    it("returns empty candidate list when sourceTicker is missing or undefined", () => {
      const pos = createMockPosition({ ticker: "BBAS3", livePrice: 25 });
      const ctx: AskStrategyContext = {
        eligiblePositions: [pos],
        availableAmount: 500,
        settings: { smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 } },
        asOf: "2026-08-26T10:00:00.000Z",
        sourceTicker: undefined,
      };

      const candidates = runReinforcePayer(ctx);
      expect(candidates).toEqual([]);
    });

    it("allocates whole shares of the eligible sourceTicker up to availableAmount", () => {
      const pos1 = createMockPosition({ ticker: "BBAS3", livePrice: 25 });
      const pos2 = createMockPosition({ ticker: "ITSA4", livePrice: 10 });

      const ctx: AskContext = {
        positions: [pos1, pos2],
        availableAmount: 260, // 260 / 25 = 10 shares of BBAS3 = 250 BRL, 10 BRL leftover
        settings: {
          smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 },
        },
        asOf: "2026-08-26T10:00:00.000Z",
        sourceTicker: "BBAS3",
      };

      const result = runAsk(ctx, reinforcePayerStrategy);

      expect(result.state).toBe("success");
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].ticker).toBe("BBAS3");
      expect(result.allocations[0].quantity).toBe(10);
      expect(result.allocations[0].amountBRL).toBe(250);
      expect(result.leftover).toBe(10);
      expect(result.allocations[0].reasonKey).toBe("askEngine.reasons.reinforcePayer");
    });

    it("does NOT perform silent fallback when sourceTicker is excluded by criteria (e.g. above ceiling)", () => {
      const posPayerAboveCeiling = createMockPosition({
        ticker: "TAEE11",
        livePrice: 40,
        ceilingPrice: 35,
        safetyMargin: -12.5,
        valuation: {
          ticker: "TAEE11",
          activeCeiling: 35,
          margin: -12.5,
          fuenteConsensus: 35,
          methods: { bazin: 35, graham: null, gordon: null },
          assumptions: [],
          investorProfile: "moderate",
          bazin: 35,
          graham: null,
          gordon: null,
          gordonConfidence: null,
          consensus: 35,
          dividendYield: 6.5,
          positive: false,
          isUnavailable: false,
          yieldTrapWarning: false,
          shareholderYield: null,
        },
      });

      const posAlternative = createMockPosition({
        ticker: "BBAS3",
        livePrice: 25,
        ceilingPrice: 40,
        safetyMargin: 60,
      });

      const ctx: AskContext = {
        positions: [posPayerAboveCeiling, posAlternative],
        availableAmount: 500,
        settings: {
          excludeAboveCeiling: true,
          smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 },
        },
        asOf: "2026-08-26T10:00:00.000Z",
        sourceTicker: "TAEE11",
      };

      const result = runAsk(ctx, reinforcePayerStrategy);

      // Must NOT allocate BBAS3 as a fallback
      expect(result.allocations).toEqual([]);
      expect(result.state).toBe("insufficient_funds");
      expect(result.leftover).toBe(500);

      // TAEE11 is present in excluded[] with the exact reason from applyExclusions
      expect(result.excluded).toHaveLength(1);
      expect(result.excluded[0].ticker).toBe("TAEE11");
      expect(result.excluded[0].reasonKey).toBe("askEngine.reasons.excludedAboveCeiling");
      expect(result.excluded[0].reasonParams).toEqual({
        price: 40,
        ceiling: 35,
        margin: -12.5,
      });
    });
  });
});
