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
});
