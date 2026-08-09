import { describe, it, expect } from "vitest";
import {
  avgDividend,
  ceilingPrice,
  safetyMargin,
  netAfterTax,
  dividendTaxRate,
  isUsAsset,
  getAssetValuation,
  GORDON_MIN_DISCOUNT_MARGIN,
} from "../calculations";

describe("Bazin ceiling price math", () => {
  it("averages dividends", () => {
    expect(avgDividend([1, 2, 3])).toBe(2);
    expect(avgDividend([])).toBe(0);
  });

  it("computes ceiling price with target yield", () => {
    // Bazin: avgDiv / (targetYield%)
    expect(ceilingPrice(2, 6)).toBeCloseTo(33.333, 2);
    expect(ceilingPrice(0, 6)).toBe(0);
  });

  it("returns 0 ceiling when target yield is 0", () => {
    expect(ceilingPrice(5, 0)).toBe(0);
  });

  it("computes safety margin", () => {
    // ceiling above current = positive margin
    expect(safetyMargin(120, 100)).toBe(20);
    expect(safetyMargin(80, 100)).toBe(-20);
    expect(safetyMargin(100, 0)).toBe(0);
  });

  it("applies US withholding to USD dividends only", () => {
    expect(isUsAsset("STOCK_US", "USD")).toBe(true);
    expect(isUsAsset("STOCK_BR", "BRL")).toBe(false);
    expect(dividendTaxRate("REIT", "USD")).toBe(0.3);
    expect(dividendTaxRate("STOCK_BR", "BRL")).toBe(0);
    expect(netAfterTax(100, "REIT", "USD")).toBeCloseTo(70);
    expect(netAfterTax(100, "STOCK_BR", "BRL")).toBe(100);
  });

  it("applies 15% withholding to JCP events", () => {
    expect(dividendTaxRate("STOCK_BR", "BRL", undefined, true)).toBe(0.15);
    expect(netAfterTax(100, "STOCK_BR", "BRL", undefined, true)).toBe(85);
  });
});

describe("getAssetValuation — Gordon Guard & Robust Consensus", () => {
  it("applies singularity guard to terminal growth rate (gTerminal=3%), avoiding explosion when gInitial is high", () => {
    // k = 0.105, gInitial = 0.103, gTerminal = 0.03 => k - gTerminal = 0.075 (>= 0.02)
    // 2-Stage Gordon returns 38.80 safely
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.4, // Bazin = 2.4 / 0.06 = 40
      dividendCagr: 10.3,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.gordon).not.toBeNull();
    expect(result.gordon!).toBeCloseTo(38.80, 1);
    expect(result.bazin).toBeCloseTo(40);
  });

  it("calculates 2-stage Gordon model when (k - gTerminal) >= GORDON_MIN_DISCOUNT_MARGIN (e.g. Selic 10.5%, CAGR 5.0%)", () => {
    // k = 0.105, gInitial = 0.05, gTerminal = 0.03 => k - gTerminal = 0.075 (>= 0.02)
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.4,
      dividendCagr: 5.0,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    // 2-stage Gordon = 32.96 + 1.60 = 34.56
    expect(result.gordon).not.toBeNull();
    expect(result.gordon!).toBeCloseTo(34.56, 1);
  });

  it("uses median consensus to prevent single outlier from distorting active ceiling", () => {
    // bazin = 40, graham = 30, gordon = 33.96 => sorted [30, 33.96, 40] => median = 33.96
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.4,
      eps: 2,
      bvps: 20, // Graham = sqrt(22.5 * 2 * 20) = sqrt(900) = 30
      dividendCagr: 4.25, // 2-stage Gordon = 33.96
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.bazin).toBeCloseTo(40);
    expect(result.graham).toBeCloseTo(30);
    expect(result.gordon).toBeCloseTo(33.96, 1);
    // Median of [30, 33.96, 40] is 33.96
    expect(result.consensus).toBeCloseTo(33.96, 1);
    expect(result.activeCeiling).toBeCloseTo(33.96, 1);
  });

  it("verifies VALE3 @ 6% target yield has matching activeCeiling and consensus", () => {
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 62.0,
      avgDividend: 2.954,
      eps: 2.66,
      bvps: 42.56,
      dividendCagr: 5.0,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.consensus).not.toBeNull();
    expect(result.activeCeiling).toBe(result.consensus);
    expect(result.activeCeiling).toBeGreaterThan(0);
    expect(result.isUnavailable).toBe(false);
  });

  it("returns isUnavailable: true when asset has no dividend history", () => {
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 50.0,
      avgDividend: 0,
      eps: null,
      bvps: null,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.isUnavailable).toBe(true);
    expect(result.consensus).toBeNull();
    expect(result.bazin).toBeNull();
  });
});

describe("2-Stage Gordon Growth (H-Model) & Volatility Confidence Tests", () => {
  it("KNCR11 Regression: Singularity guard prevents singularity explosion when terminal spread (k - gTerminal) < 0.02", () => {
    // k = 0.04, gTerminal = 0.03 => k - gTerminal = 0.01 (< 0.02)
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 100,
      avgDividend: 10,
      dividendCagr: 15.0,
      selicPct: 4.0, // Low discount rate k = 4.0%
      currency: "BRL",
      type: "FII",
    });

    expect(result.gordon).toBeNull();
  });

  it("calculates gordonConfidence: 'high' for regular growth and 'low' for volatile growth", () => {
    // Regular growth: 10%, 11%, 12% YoY -> low volatility
    const regularResult = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.0,
      dividendCagr: 8.0,
      dividendHistory: [
        { year: 2021, amount: 1.0 },
        { year: 2022, amount: 1.1 },
        { year: 2023, amount: 1.21 },
        { year: 2024, amount: 1.33 },
      ],
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(regularResult.gordon).not.toBeNull();
    expect(regularResult.gordonConfidence).toBe("high");

    // Volatile growth: +150%, -60%, +200% YoY -> high volatility
    const volatileResult = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.0,
      dividendCagr: 8.0,
      dividendHistory: [
        { year: 2021, amount: 1.0 },
        { year: 2022, amount: 2.5 },
        { year: 2023, amount: 1.0 },
        { year: 2024, amount: 3.0 },
      ],
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(volatileResult.gordon).not.toBeNull();
    expect(volatileResult.gordonConfidence).toBe("low");
  });

  it("Fallback test: asset without dividendCagr falls back to single-stage Gordon (g = 0)", () => {
    // dividendCagr is null -> single stage fallback avgDividend / k = 2.0 / 0.105 = 19.047
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 20,
      avgDividend: 2.0,
      dividendCagr: null,
      selicPct: 10.5,
      currency: "BRL",
      type: "FII",
    });

    expect(result.gordon).not.toBeNull();
    expect(result.gordon!).toBeCloseTo(19.05, 1);
  });
});
