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
  it("guards Gordon model when (k - g) < GORDON_MIN_DISCOUNT_MARGIN (e.g. Selic 10.5%, CAGR 10.3%)", () => {
    // k = 0.105, g = 0.103 => k - g = 0.002 (< 0.02)
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.4, // Bazin = 2.4 / 0.06 = 40
      dividendCagr: 10.3,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.gordon).toBeNull();
    expect(result.bazin).toBeCloseTo(40);
    expect(result.consensus).toBeCloseTo(40);
    expect(result.margin).toBeCloseTo(0);
  });

  it("calculates Gordon model when (k - g) >= GORDON_MIN_DISCOUNT_MARGIN (e.g. Selic 10.5%, CAGR 5.0%)", () => {
    // k = 0.105, g = 0.05 => k - g = 0.055 (>= 0.02)
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.4,
      dividendCagr: 5.0,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    // nextYearDiv = 2.4 * 1.05 = 2.52; gordon = 2.52 / 0.055 = 45.818...
    expect(result.gordon).not.toBeNull();
    expect(result.gordon!).toBeCloseTo(45.82, 1);
  });

  it("uses median consensus to prevent single outlier from distorting active ceiling", () => {
    // bazin = 40, graham = 30, gordon = 50 => sorted [30, 40, 50] => median = 40
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.4,
      eps: 2,
      bvps: 20, // Graham = sqrt(22.5 * 2 * 20) = sqrt(900) = 30
      dividendCagr: 4.25, // k = 0.105, g = 0.0425 => k - g = 0.0625 => nextDiv = 2.4 * 1.0425 = 2.502 => Gordon = 2.502 / 0.0625 = 40.032
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.bazin).toBeCloseTo(40);
    expect(result.graham).toBeCloseTo(30);
    expect(result.gordon).toBeCloseTo(40.03, 1);
    // Median of [30, 40, 40.032] is 40
    expect(result.consensus).toBeCloseTo(40);
    expect(result.activeCeiling).toBeCloseTo(40);
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
