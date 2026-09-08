import { describe, it, expect } from "vitest";
import { calculateDividendSafetyScore } from "../dividendSafety";

describe("calculateDividendSafetyScore", () => {
  it("classifies high quality stock with low payout and low debt as very_safe", () => {
    const result = calculateDividendSafetyScore({
      type: "STOCK_BR",
      payoutRatio: 0.45,
      netDebtToEbitda: 0.8,
      roe: 0.22,
      yearsPayingDividends: 15,
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.tier).toBe("very_safe");
    expect(result.badgeVariant).toBe("success");
    expect(result.cutRiskProbabilityPct).toBeLessThanOrEqual(10);
    expect(result.factors).toHaveLength(4);
  });

  it("identifies high risk of dividend cut when payout exceeds 100% and leverage is high", () => {
    const result = calculateDividendSafetyScore({
      type: "STOCK_BR",
      payoutRatio: 1.25, // 125% payout
      netDebtToEbitda: 4.8, // severe leverage
      roe: 0.04,
      yearsPayingDividends: 2,
    });

    expect(result.score).toBeLessThan(40);
    expect(result.tier).toBe("cut_risk");
    expect(result.badgeVariant).toBe("danger");
    expect(result.cutRiskProbabilityPct).toBeGreaterThanOrEqual(50);
  });

  it("calculates safety score for FIIs using vacancy and pvp metrics", () => {
    const result = calculateDividendSafetyScore({
      type: "FII",
      vacancyRate: 0.03, // 3% vacancy
      pvp: 0.98,
      yearsPayingDividends: 8,
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.factors.some((f) => f.name.includes("Ocupação"))).toBe(true);
    expect(result.factors.some((f) => f.name.includes("P/VP"))).toBe(true);
  });

  it("localizes REIT metrics and labels into English with zero Portuguese leakage", () => {
    const result = calculateDividendSafetyScore(
      {
        type: "REIT",
        currency: "USD",
        yearsPayingDividends: 30,
        vacancyRate: 0.014,
        pvp: 1.05,
      },
      "en"
    );

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.tier).toBe("very_safe");
    expect(result.label).toBe("Very Safe");
    expect(result.summary).toContain("virtually zero");

    // Factors must use REIT & US terminology
    expect(result.factors).toHaveLength(3);
    const names = result.factors.map((f) => f.name);
    expect(names).toContain("Property Occupancy");
    expect(names).toContain("Valuation (Price / NAV)");
    expect(names).toContain("Dividend Track Record");

    // Zero Portuguese leakage
    const allText = JSON.stringify(result);
    expect(allText).not.toContain("Muito Seguro");
    expect(allText).not.toContain("Ocupação");
    expect(allText).not.toContain("P/VP");
    expect(allText).not.toContain("blindagem");
    expect(allText).not.toContain("proventos");
  });

  it("localizes US stocks with zero Brazilian references in English", () => {
    const result = calculateDividendSafetyScore(
      {
        type: "STOCK_US",
        currency: "USD",
        payoutRatio: 0.55,
        netDebtToEbitda: 1.5,
        roe: 0.2,
        yearsPayingDividends: 15,
      },
      "en"
    );

    expect(result.label).toBe("Very Safe");
    const names = result.factors.map((f) => f.name);
    expect(names).toContain("Payout Ratio");
    expect(names).toContain("Leverage (Net Debt / EBITDA)");
    expect(names).toContain("Dividend Track Record");
    expect(names).toContain("Profitability (ROE)");

    const allText = JSON.stringify(result);
    expect(allText).not.toContain("brasileiro");
    expect(allText).not.toContain("Alavancagem");
    expect(allText).not.toContain("Rentabilidade");
  });

  it("supports Spanish localization correctly", () => {
    const result = calculateDividendSafetyScore(
      {
        type: "REIT",
        currency: "USD",
        yearsPayingDividends: 15,
        vacancyRate: 0.03,
        pvp: 0.95,
      },
      "es"
    );

    expect(result.label).toBe("Muy Seguro");
    expect(result.factors.some((f) => f.name === "Ocupación de Inmuebles")).toBe(true);
    expect(result.factors.some((f) => f.name === "Valuación Patrimonial (P/NAV)")).toBe(true);
  });
});
