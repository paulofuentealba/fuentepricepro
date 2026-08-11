import { describe, it, expect } from "vitest";
import {
  calculatePiotroskiFScore,
  PIOTROSKI_MIN_CRITERIA_AVAILABLE,
  type PiotroskiYearInput,
} from "../calculations";

// A company passing all 9 criteria: profitable, cash-flow positive, improving
// ROA, CFO > net income, deleveraging, improving liquidity, no dilution,
// improving gross margin, improving asset turnover.
const PASSING_CURRENT: PiotroskiYearInput = {
  netIncome: 120,
  totalAssets: 1000,
  operatingCashFlow: 150,
  longTermDebt: 200,
  currentAssets: 400,
  currentLiabilities: 200,
  sharesOutstanding: 100,
  grossProfit: 500,
  revenues: 1100,
};

const PASSING_PRIOR: PiotroskiYearInput = {
  netIncome: 80,
  totalAssets: 900,
  operatingCashFlow: 90,
  longTermDebt: 300,
  currentAssets: 300,
  currentLiabilities: 250,
  sharesOutstanding: 100,
  grossProfit: 350,
  revenues: 900,
};

describe("calculatePiotroskiFScore", () => {
  it("scores 9/9 when every criterion improves/passes", () => {
    const result = calculatePiotroskiFScore(PASSING_CURRENT, PASSING_PRIOR);
    expect(result.criteriaAvailable).toBe(9);
    expect(result.score).toBe(9);
    expect(result.criteria).toEqual({
      positiveNetIncome: true,
      positiveOperatingCashFlow: true,
      roaImproving: true,
      cashFlowExceedsNetIncome: true,
      leverageDecreasing: true,
      currentRatioImproving: true,
      noNewShares: true,
      grossMarginImproving: true,
      assetTurnoverImproving: true,
    });
  });

  it("scores 0/9 when every criterion fails/worsens", () => {
    // Mirror image of the passing fixture: current is worse than prior on every axis.
    const failingCurrent: PiotroskiYearInput = {
      netIncome: -50,
      totalAssets: 1000,
      operatingCashFlow: -60,
      longTermDebt: 400,
      currentAssets: 200,
      currentLiabilities: 300,
      sharesOutstanding: 150,
      grossProfit: 100,
      revenues: 900,
    };
    const failingPrior: PiotroskiYearInput = {
      netIncome: 50,
      totalAssets: 900,
      operatingCashFlow: 60,
      longTermDebt: 200,
      currentAssets: 350,
      currentLiabilities: 250,
      sharesOutstanding: 100,
      grossProfit: 300,
      revenues: 900,
    };

    const result = calculatePiotroskiFScore(failingCurrent, failingPrior);
    expect(result.criteriaAvailable).toBe(9);
    expect(result.score).toBe(0);
    expect(Object.values(result.criteria).every((v) => v === false)).toBe(true);
  });

  it("withholds the score (null) when fewer than the minimum criteria are available", () => {
    // Only totalAssets/currentAssets/currentLiabilities available — netIncome,
    // operatingCashFlow, longTermDebt, sharesOutstanding, grossProfit, revenues
    // all missing. That leaves at most currentRatioImproving computable (1 of 9),
    // well under PIOTROSKI_MIN_CRITERIA_AVAILABLE.
    const sparseCurrent: PiotroskiYearInput = {
      netIncome: null,
      totalAssets: 1000,
      operatingCashFlow: null,
      longTermDebt: null,
      currentAssets: 400,
      currentLiabilities: 200,
      sharesOutstanding: null,
      grossProfit: null,
      revenues: null,
    };
    const sparsePrior: PiotroskiYearInput = {
      netIncome: null,
      totalAssets: 900,
      operatingCashFlow: null,
      longTermDebt: null,
      currentAssets: 300,
      currentLiabilities: 250,
      sharesOutstanding: null,
      grossProfit: null,
      revenues: null,
    };

    const result = calculatePiotroskiFScore(sparseCurrent, sparsePrior);
    expect(result.criteriaAvailable).toBeLessThan(PIOTROSKI_MIN_CRITERIA_AVAILABLE);
    expect(result.score).toBeNull();
    expect(result.criteria.currentRatioImproving).toBe(true);
    expect(result.criteria.positiveNetIncome).toBeNull();
  });

  it("still reports a numeric score when exactly at the minimum criteria threshold", () => {
    // Zero out longTermDebt/grossProfit/revenues (3 of 9 criteria become null:
    // leverageDecreasing, grossMarginImproving, assetTurnoverImproving),
    // leaving exactly 6 of 9 available — right at the threshold.
    const current: PiotroskiYearInput = { ...PASSING_CURRENT, longTermDebt: null, grossProfit: null, revenues: null };
    const prior: PiotroskiYearInput = { ...PASSING_PRIOR, longTermDebt: null, grossProfit: null, revenues: null };

    const result = calculatePiotroskiFScore(current, prior);
    expect(result.criteriaAvailable).toBe(6);
    expect(result.score).toBe(6);
  });
});
