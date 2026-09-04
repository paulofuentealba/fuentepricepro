import { describe, it, expect } from "vitest";
import { generateDynamicAssetFaq } from "../dynamicAssetFaq";
import type { Asset } from "../domain";
import type { ValuationResult } from "../calculations";
import { en } from "../i18n/dict.en";

describe("generateDynamicAssetFaq", () => {
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
    methods: { bazin: 35.0, graham: 38.0, gordon: 32.0, lynch: null },
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

  it("generates 4 factual questions with real asset interpolation", () => {
    const faq = generateDynamicAssetFaq(asset, valuation, en, "en");
    expect(faq.length).toBe(4);

    // Q1: Price
    expect(faq[0].question).toContain("BBAS3");
    expect(faq[0].answer).toContain("BBAS3");

    // Q2: Dividends
    expect(faq[1].question).toContain("BBAS3");
    expect(faq[1].answer).toContain("March, June, September, December");

    // Q3: Ceiling
    expect(faq[2].question).toContain("BBAS3");
    expect(faq[2].answer).toContain("22.80%");

    // Q4: Worth it (Neutral)
    expect(faq[3].question).toContain("BBAS3");
    expect(faq[3].answer).toContain("educational analytics");
  });
});
