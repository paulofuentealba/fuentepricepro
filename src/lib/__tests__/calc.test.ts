import { describe, it, expect } from "vitest";
import {
  avgDividend,
  ceilingPrice,
  safetyMargin,
  netAfterTax,
  dividendTaxRate,
  isUsAsset,
} from "../calc";

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
});
