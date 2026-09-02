import { describe, it, expect } from "vitest";
import { simulateScreenerImpact } from "../screenerSimulation";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { AskEngineSettings } from "@/lib/askEngine/types";

function makePosition(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  const base: ValuedWatchlistItem = {
    id: "item-1",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 26.15,
    livePrice: 26.15,
    annualDividend: 2.5,
    targetYield: 6,
    ceilingPrice: 31.1,
    safetyMargin: 18.9,
    quantity: 0,
    averagePrice: null,
    paymentMonths: [3, 6, 9, 12],
    payoutRatio: 40,
    sector: "Financeiro",
    addedAt: 1700000000000,
    investingSince: 1700000000000,
    isClosedPosition: false,
    isBffMode: true,
    valuation: {
      ticker: "BBAS3",
      activeCeiling: 31.1,
      margin: 18.9,
      fuenteConsensus: 31.1,
      methods: { bazin: 31.1, graham: null, gordon: null },
      assumptions: [],
      investorProfile: "moderate",
      bazin: 31.1,
      graham: null,
      gordon: null,
      gordonConfidence: null,
      consensus: 31.1,
      dividendYield: 9.8,
      positive: true,
      isUnavailable: false,
      yieldTrapWarning: false,
      shareholderYield: null,
    },
  };
  return { ...base, ...overrides, valuation: { ...base.valuation, ...(overrides.valuation || {}) } };
}

const settingsWithTargets: AskEngineSettings = {
  smartAllocationTargets: { STOCK_BR: 45, FII: 30, STOCK_US: 25 },
};

describe("simulateScreenerImpact", () => {
  it("computes quantity by flooring amount/price and marks a wide positive margin as great_entry", () => {
    const candidate = makePosition({ ticker: "BBAS3", livePrice: 26.15 });
    const result = simulateScreenerImpact(candidate, 1000, [candidate], settingsWithTargets, 5);
    expect(result.quantity).toBe(Math.floor(1000 / 26.15));
    expect(result.verdict).toBe("great_entry");
  });

  it("marks a negative margin as above_ceiling and prioritizes that reason over allocation fit", () => {
    const candidate = makePosition({
      ticker: "VALE3",
      livePrice: 61.4,
      valuation: { margin: -5.5 } as any,
    });
    const result = simulateScreenerImpact(candidate, 1000, [candidate], settingsWithTargets, 5);
    expect(result.verdict).toBe("above_ceiling");
    expect(result.reasonKey).toBe("screenerScreen.reasons.aboveCeiling");
  });

  it("prioritizes yield_trap over above_ceiling when both would otherwise apply", () => {
    const candidate = makePosition({
      ticker: "MXRF11",
      type: "FII",
      livePrice: 10.08,
      valuation: { margin: -3.1, yieldTrapWarning: true } as any,
    });
    const result = simulateScreenerImpact(candidate, 1000, [candidate], settingsWithTargets, 5);
    expect(result.verdict).toBe("yield_trap");
    expect(result.reasonKey).toBe("screenerScreen.reasons.yieldTrap");
  });

  it("reasons 'alreadyHeld' when the candidate is already a position, even if its class is below target", () => {
    const candidate = makePosition({ ticker: "TAEE11", type: "FII", quantity: 500, livePrice: 34 });
    const result = simulateScreenerImpact(candidate, 1000, [candidate], settingsWithTargets, 5);
    expect(result.reasonKey).toBe("screenerScreen.reasons.alreadyHeld");
  });

  it("reasons 'belowTarget' with the deviation in percentage points when the class is under-allocated", () => {
    const knip = makePosition({ ticker: "KNIP11", type: "FII", quantity: 100, livePrice: 94.2 });
    const candidate = makePosition({ ticker: "BBAS3", type: "STOCK_BR", quantity: 0, livePrice: 26.15 });
    const result = simulateScreenerImpact(candidate, 1000, [knip, candidate], settingsWithTargets, 5);
    expect(result.reasonKey).toBe("screenerScreen.reasons.belowTarget");
    expect(result.deviationBeforePp).toBeGreaterThan(0);
    expect(result.reasonParams?.deviation).toBeCloseTo(result.deviationBeforePp!, 1);
  });

  it("reasons 'withinTarget' when the class is already at/above its goal (and the candidate itself isn't held)", () => {
    // A different STOCK_BR holding fills the class past its 45% target; the candidate (ITUB4,
    // not yet owned) evaluates as "within target", not "already held".
    const heldStock = makePosition({ ticker: "PETR4", type: "STOCK_BR", quantity: 1000, livePrice: 26.15 });
    const candidate = makePosition({ ticker: "ITUB4", type: "STOCK_BR", quantity: 0, livePrice: 26.15 });
    const result = simulateScreenerImpact(candidate, 1000, [heldStock, candidate], settingsWithTargets, 5);
    expect(result.reasonKey).toBe("screenerScreen.reasons.withinTarget");
  });

  it("reasons 'noTargets' and leaves allocation fields null when no smartAllocationTargets are configured", () => {
    const candidate = makePosition({});
    const result = simulateScreenerImpact(candidate, 1000, [candidate], {}, 5);
    expect(result.hasTargets).toBe(false);
    expect(result.reasonKey).toBe("screenerScreen.reasons.noTargets");
    expect(result.allocBeforePct).toBeNull();
    expect(result.allocAfterPct).toBeNull();
  });

  it("converts a USD candidate's simulated purchase using fxRate for allocation/income impact", () => {
    const usdCandidate = makePosition({
      ticker: "O",
      type: "REIT",
      currency: "USD",
      livePrice: 60,
      annualDividend: 3.2,
      valuation: { margin: 12 } as any,
    });
    const result = simulateScreenerImpact(usdCandidate, 3000, [usdCandidate], {}, 5);
    expect(result.currency).toBe("USD");
    expect(result.quantity).toBe(10);
    expect(result.amountNative).toBeCloseTo(600, 2);
    expect(result.incomeAfterMonthlyBRL).toBeCloseTo(160 / 12, 2);
  });

  it("returns quantity 0 (no negative/garbage state) when the typed amount can't buy a single share", () => {
    const candidate = makePosition({ livePrice: 500 });
    const result = simulateScreenerImpact(candidate, 100, [candidate], settingsWithTargets, 5);
    expect(result.quantity).toBe(0);
    expect(result.amountNative).toBe(0);
  });
});
