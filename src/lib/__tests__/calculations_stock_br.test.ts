import { describe, it, expect } from "vitest";
import { valuateStockBR, getAssetValuation } from "../calculations";

describe("valuateStockBR - Ações Brasileiras Especializadas", () => {
  it("should calculate Bazin, Graham and Gordon for BBSE3 with assumptions array", () => {
    const result = valuateStockBR({
      ticker: "BBSE3",
      targetYield: 6,
      currentPrice: 34.5,
      avgDividend: 3.25,
      eps: 3.85,
      bvps: 12.4,
      dividendCagr: 8.5,
      selicPct: 10.5,
      terminalGrowthRate: 0.045, // 4.5% IPCA 5y
      currency: "BRL",
      type: "STOCK_BR",
      roe: 31.0,
      payoutRatio: 80,
    });

    // Bazin = 3.25 / 0.06 = 54.166...
    expect(result.methods.bazin).toBeCloseTo(54.17, 1);
    expect(result.bazin).toBeCloseTo(54.17, 1);

    // Graham = sqrt(22.5 * 3.85 * 12.4) = sqrt(1074.15) = 32.77
    expect(result.methods.graham).toBeCloseTo(32.77, 1);
    expect(result.graham).toBeCloseTo(32.77, 1);

    // Gordon should be finite and positive
    expect(result.methods.gordon).toBeGreaterThan(0);
    expect(result.fuenteConsensus).toBeGreaterThan(0);

    // Active ceiling should equal consensus median
    expect(result.activeCeiling).toBe(result.fuenteConsensus);

    // Assumptions should have 4 resolved items with proper confidence badges
    expect(result.assumptions).toHaveLength(4);
    const targetYieldAssumption = result.assumptions.find((a) => a.key === "targetYield");
    expect(targetYieldAssumption?.value).toBe(6);
    expect(targetYieldAssumption?.confidenceBadge).toBe(4);

    const grahamAssumption = result.assumptions.find((a) => a.key === "grahamMultiplier");
    expect(grahamAssumption?.value).toBe(22.5);
    expect(grahamAssumption?.confidenceBadge).toBe(4);
  });

  it("should calculate Peter Lynch modified fair value and include it in the consensus median", () => {
    const result = valuateStockBR({
      ticker: "BBSE3",
      targetYield: 6,
      currentPrice: 34.5,
      avgDividend: 3.25,
      eps: 3.85,
      bvps: 12.4,
      dividendCagr: 8.5,
      selicPct: 10.5,
      terminalGrowthRate: 0.045,
      currency: "BRL",
      type: "STOCK_BR",
      roe: 31.0,
      payoutRatio: 80,
    });

    // Net dividend (no JCP by default, so no 15% WHT deduction here): 3.25
    // rawDy = (3.25 / 34.5) * 100 = 9.42
    // effectiveGrowth = dividendCagr = 8.5
    // lynchMultiplier = clamp(8.5 + 9.42, 5, 25) = 17.92
    // lynch = eps * multiplier = 3.85 * 17.92 = 68.99
    expect(result.methods.lynch).toBeCloseTo(68.99, 1);
    expect(result.lynch).toBeCloseTo(68.99, 1);

    // Consensus should be the median of [bazin=54.17, graham=32.77, gordon>0, lynch=68.99]
    const values = [result.bazin, result.graham, result.gordon, result.lynch].filter(
      (v): v is number => v != null,
    );
    const sorted = [...values].sort((a, b) => a - b);
    const expectedMedian = (sorted[1] + sorted[2]) / 2;
    expect(result.fuenteConsensus).toBeCloseTo(expectedMedian, 1);
  });

  it("should set lynch to null when EPS is missing for STOCK_BR", () => {
    const result = valuateStockBR({
      ticker: "RECENT3",
      targetYield: 6,
      currentPrice: 20.0,
      avgDividend: 1.2,
      eps: null,
      bvps: null,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.methods.lynch).toBeNull();
    expect(result.lynch).toBeNull();
  });

  it("should correctly apply 15% withholding tax when isJCP is true", () => {
    const grossDividend = 2.0;
    const resultWithJcp = valuateStockBR({
      ticker: "PETR4",
      targetYield: 6,
      currentPrice: 38.0,
      avgDividend: grossDividend,
      isJCP: true,
      eps: 6.5,
      bvps: 30.0,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    // Net dividend = 2.0 * (1 - 0.15) = 1.70
    // Bazin = 1.70 / 0.06 = 28.333
    expect(resultWithJcp.methods.bazin).toBeCloseTo(28.33, 1);
  });

  it("should set confidenceBadge: 2 for Graham when LPA/VPA is missing", () => {
    const result = valuateStockBR({
      ticker: "RECENT3",
      targetYield: 6,
      currentPrice: 20.0,
      avgDividend: 1.2,
      eps: null,
      bvps: null,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.methods.graham).toBeNull();
    const grahamAssumption = result.assumptions.find((a) => a.key === "grahamMultiplier");
    expect(grahamAssumption?.confidenceBadge).toBe(2);
  });

  it("should be called via getAssetValuation dispatcher when type is STOCK_BR", () => {
    const result = getAssetValuation({
      ticker: "VALE3",
      targetYield: 6,
      currentPrice: 58.0,
      avgDividend: 4.5,
      eps: 8.2,
      bvps: 45.0,
      currency: "BRL",
      type: "STOCK_BR",
      selicPct: 10.5,
    });

    expect(result.methods.bazin).toBeCloseTo(75.0, 1);
    expect(result.assumptions).toHaveLength(4);
  });
});
