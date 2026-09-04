import { describe, it, expect } from "vitest";
import { evaluateBuyAndHoldChecklist } from "../buyAndHoldChecklist";
import type { Asset } from "../domain";
import type { ValuationResult } from "../calculations";

describe("evaluateBuyAndHoldChecklist", () => {
  it("evaluates healthy stock criteria correctly", () => {
    const asset: Asset = {
      ticker: "BBAS3",
      name: "Banco do Brasil",
      type: "STOCK_BR",
      currency: "BRL",
      currentPrice: 28.5,
      dividends3y: [2.1, 2.3, 2.5],
      dividendHistory: [
        { year: 2021, amount: 2.1 },
        { year: 2022, amount: 2.3 },
        { year: 2023, amount: 2.5 },
      ],
      exDividendDate: "2024-05-15",
      epsCurrent: 5.2,
      epsNext: 5.8,
      paymentMonths: [3, 6, 9, 12],
      sector: "Finance",
      dividendEvents: [],
      metrics: {
        eps: 5.2,
        roe: 18.5,
        payoutRatio: 45,
        pbRatio: 0.85,
        peRatio: 4.5,
        currentDy: 9.2,
        dividendCagr5y: 12.5,
        capRate: null,
        vacancy: null,
        expenseRatio: null,
        aum: null,
        trackingError: null,
      },
    };

    const valuation: ValuationResult = {
      ticker: "BBAS3",
      activeCeiling: 35.0,
      margin: 22.8,
      fuenteConsensus: 35.0,
      methods: {
        bazin: 35.0,
        graham: 38.0,
        gordon: 32.0,
        lynch: null,
      },
      assumptions: [],
      investorProfile: "moderate",
      bazin: 35.0,
      graham: 38.0,
      gordon: 32.0,
      lynch: null,
      gordonConfidence: "high",
      consensus: 35.0,
      isUnavailable: false,
      dividendYield: 9.2,
      positive: true,
      yieldTrapWarning: false,
      shareholderYield: null,
    };

    const result = evaluateBuyAndHoldChecklist(asset, valuation);
    expect(result.score).toBe(8);
    expect(result.totalApplicable).toBe(8);
    expect(result.criteria.every((c) => c.passed === true)).toBe(true);
  });

  it("handles missing data gracefully without generating false failures", () => {
    const sparseAsset: Asset = {
      ticker: "NEW3",
      name: "New Asset",
      type: "STOCK_BR",
      currency: "BRL",
      currentPrice: 10.0,
      dividends3y: [],
      dividendHistory: [],
      exDividendDate: null,
      epsCurrent: null,
      epsNext: null,
      paymentMonths: [],
      sector: null,
      dividendEvents: [],
      metrics: {
        eps: null,
        roe: null,
        payoutRatio: null,
        pbRatio: null,
        peRatio: null,
        currentDy: null,
        dividendCagr5y: null,
        capRate: null,
        vacancy: null,
        expenseRatio: null,
        aum: null,
        trackingError: null,
      },
    };

    const result = evaluateBuyAndHoldChecklist(sparseAsset, null);
    // LPA, ROE, Payout, PB, CAGR, BelowCeiling, NoYieldTrap should be null
    const nullCount = result.criteria.filter((c) => c.passed === null).length;
    expect(nullCount).toBe(7);
    // Consistent dividends with 0 history is false
    const failedCount = result.criteria.filter((c) => c.passed === false).length;
    expect(failedCount).toBe(1);
    expect(result.totalApplicable).toBe(1);
    expect(result.score).toBe(0);
  });

  it("adapts criteria for FIIs and REITs correctly", () => {
    const fiiAsset: Asset = {
      ticker: "HGLG11",
      name: "CSHG Logística",
      type: "FII",
      currency: "BRL",
      currentPrice: 160.0,
      dividends3y: [12.0, 13.0, 13.5],
      dividendHistory: [
        { year: 2021, amount: 12.0 },
        { year: 2022, amount: 13.0 },
        { year: 2023, amount: 13.5 },
      ],
      exDividendDate: "2024-05-15",
      epsCurrent: null,
      epsNext: null,
      paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      sector: "Real Estate",
      dividendEvents: [],
      metrics: {
        eps: null,
        roe: null,
        payoutRatio: null,
        pbRatio: 1.02,
        peRatio: null,
        currentDy: 8.5,
        dividendCagr5y: 5.0,
        capRate: 8.0,
        vacancy: 4.5,
        expenseRatio: null,
        aum: 5_000_000_000,
        trackingError: null,
      },
    };

    const valuation: ValuationResult = {
      ticker: "HGLG11",
      activeCeiling: 177.5,
      margin: 10.9,
      fuenteConsensus: 177.5,
      methods: {
        bazin: 180.0,
        graham: null,
        gordon: 175.0,
        lynch: null,
      },
      assumptions: [],
      investorProfile: "moderate",
      bazin: 180.0,
      graham: null,
      gordon: 175.0,
      lynch: null,
      gordonConfidence: "high",
      consensus: 177.5,
      isUnavailable: false,
      dividendYield: 8.5,
      positive: true,
      yieldTrapWarning: false,
      shareholderYield: null,
    };

    const result = evaluateBuyAndHoldChecklist(fiiAsset, valuation);
    expect(result.score).toBe(7);
    expect(result.totalApplicable).toBe(7);
    expect(result.criteria.find((c) => c.id === "reasonablePbFund")?.passed).toBe(true);
    expect(result.criteria.find((c) => c.id === "lowVacancyOrAum")?.passed).toBe(true);
  });
});
