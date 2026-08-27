import { describe, it, expect } from "vitest";
import { applyExclusions } from "../applyExclusions";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { AskEngineSettings } from "../types";

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
      methods: { bazin: 41.67, graham: 45.0, gordon: 40.0 },
      assumptions: [],
      investorProfile: "moderate",
      bazin: 41.67,
      graham: 45.0,
      gordon: 40.0,
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

describe("AskEngine: applyExclusions", () => {
  it("excludes positions with missing, zero, or non-finite price", () => {
    const p1 = createMockPosition({ ticker: "ZERO", livePrice: 0 });
    const p2 = createMockPosition({ ticker: "NEG", livePrice: -10 });
    const p3 = createMockPosition({ ticker: "NAN", livePrice: NaN });
    const p4 = createMockPosition({ ticker: "VALID", livePrice: 25 });

    const settings: AskEngineSettings = {
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
    };

    const { eligible, excluded } = applyExclusions([p1, p2, p3, p4], settings);

    expect(eligible.map((e) => e.ticker)).toEqual(["VALID"]);
    expect(excluded).toHaveLength(3);
    expect(excluded[0].reasonKey).toBe("askEngine.reasons.excludedInvalidPrice");
  });

  describe("excludeAboveCeiling filter", () => {
    it("excludes positions when livePrice > activeCeiling or margin < 0 when excludeAboveCeiling is true", () => {
      const posAbove = createMockPosition({
        ticker: "EXPENSIVE",
        livePrice: 50,
        ceilingPrice: 40,
        safetyMargin: -20,
        valuation: {
          ticker: "EXPENSIVE",
          activeCeiling: 40,
          margin: -20,
          fuenteConsensus: 40,
          methods: { bazin: 40, graham: 40, gordon: null },
          assumptions: [],
          investorProfile: "moderate",
          bazin: 40,
          graham: 40,
          gordon: null,
          gordonConfidence: null,
          consensus: 40,
          dividendYield: 5,
          positive: false,
          isUnavailable: false,
          yieldTrapWarning: false,
          shareholderYield: null,
        },
      });

      const posBelow = createMockPosition({
        ticker: "CHEAP",
        livePrice: 30,
        ceilingPrice: 40,
        safetyMargin: 33.3,
      });

      const settings: AskEngineSettings = {
        excludeAboveCeiling: true,
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
      };

      const { eligible, excluded } = applyExclusions([posAbove, posBelow], settings);

      expect(eligible.map((e) => e.ticker)).toEqual(["CHEAP"]);
      expect(excluded).toHaveLength(1);
      expect(excluded[0].ticker).toBe("EXPENSIVE");
      expect(excluded[0].reasonKey).toBe("askEngine.reasons.excludedAboveCeiling");
      expect(excluded[0].reasonParams).toEqual({
        price: 50,
        ceiling: 40,
        margin: -20,
      });
    });

    it("allows positions above ceiling when excludeAboveCeiling is false or unset", () => {
      const posAbove = createMockPosition({
        ticker: "EXPENSIVE",
        livePrice: 50,
        ceilingPrice: 40,
        safetyMargin: -20,
      });

      const settings: AskEngineSettings = {
        excludeAboveCeiling: false,
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
      };

      const { eligible, excluded } = applyExclusions([posAbove], settings);

      expect(eligible.map((e) => e.ticker)).toEqual(["EXPENSIVE"]);
      expect(excluded).toHaveLength(0);
    });
  });

  describe("excludeYieldTraps filter", () => {
    it("excludes positions with yieldTrapWarning when excludeYieldTraps is true", () => {
      const posTrap = createMockPosition({
        ticker: "TRAP11",
        valuation: {
          ticker: "TRAP11",
          activeCeiling: 100,
          margin: 20,
          fuenteConsensus: 100,
          methods: { bazin: 100, graham: null, gordon: null },
          assumptions: [],
          investorProfile: "moderate",
          bazin: 100,
          graham: null,
          gordon: null,
          gordonConfidence: null,
          consensus: 100,
          dividendYield: 25,
          positive: true,
          isUnavailable: false,
          yieldTrapWarning: true,
          shareholderYield: null,
        },
      });

      const posHealthy = createMockPosition({
        ticker: "GOOD11",
        valuation: {
          ticker: "GOOD11",
          activeCeiling: 100,
          margin: 20,
          fuenteConsensus: 100,
          methods: { bazin: 100, graham: null, gordon: null },
          assumptions: [],
          investorProfile: "moderate",
          bazin: 100,
          graham: null,
          gordon: null,
          gordonConfidence: null,
          consensus: 100,
          dividendYield: 9,
          positive: true,
          isUnavailable: false,
          yieldTrapWarning: false,
          shareholderYield: null,
        },
      });

      const settings: AskEngineSettings = {
        excludeYieldTraps: true,
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
      };

      const { eligible, excluded } = applyExclusions([posTrap, posHealthy], settings);

      expect(eligible.map((e) => e.ticker)).toEqual(["GOOD11"]);
      expect(excluded).toHaveLength(1);
      expect(excluded[0].ticker).toBe("TRAP11");
      expect(excluded[0].reasonKey).toBe("askEngine.reasons.excludedYieldTrap");
    });

    it("allows positions with yield trap warning when excludeYieldTraps is false", () => {
      const posTrap = createMockPosition({
        ticker: "TRAP11",
        valuation: {
          ticker: "TRAP11",
          activeCeiling: 100,
          margin: 20,
          fuenteConsensus: 100,
          methods: { bazin: 100, graham: null, gordon: null },
          assumptions: [],
          investorProfile: "moderate",
          bazin: 100,
          graham: null,
          gordon: null,
          gordonConfidence: null,
          consensus: 100,
          dividendYield: 25,
          positive: true,
          isUnavailable: false,
          yieldTrapWarning: true,
          shareholderYield: null,
        },
      });

      const settings: AskEngineSettings = {
        excludeYieldTraps: false,
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
      };

      const { eligible, excluded } = applyExclusions([posTrap], settings);

      expect(eligible.map((e) => e.ticker)).toEqual(["TRAP11"]);
      expect(excluded).toHaveLength(0);
    });
  });
});
