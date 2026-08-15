import { describe, it, expect } from "vitest";
import { valuateStockUS, getAssetValuation } from "../calculations";

describe("valuateStockUS - Ações Norte-Americanas Especializadas", () => {
  it("should calculate Bazin, Shareholder Yield, and Peter Lynch for AAPL", () => {
    const result = valuateStockUS({
      ticker: "AAPL",
      targetYield: 3.5,
      currentPrice: 220.0,
      avgDividend: 1.0,
      eps: 6.6,
      dividendCagr: 7.5,
      shareholderYield: 4.8, // 4.8% total shareholder return (dividends + buybacks)
      currency: "USD",
      type: "STOCK_US",
    });

    // 1. Net Dividend with 30% WHT: 1.0 * (1 - 0.3) = 0.70
    // Bazin = 0.70 / 0.035 = 20.0
    expect(result.methods.bazin).toBeCloseTo(20.0, 1);

    // 2. Shareholder Yield ceiling: 220.0 * (4.8 / 3.5) = 301.71
    expect(result.methods.shareholderYield).toBeCloseTo(301.71, 1);

    // 3. Peter Lynch Price: EPS * (growth + DY) = 6.6 * (7.5 + 0.318) = 51.6
    expect(result.methods.graham).toBeGreaterThan(40);

    // 4. Fuente Consensus should be positive
    expect(result.fuenteConsensus).toBeGreaterThan(0);

    // 5. Assumptions array contains 4 resolved items
    expect(result.assumptions).toHaveLength(4);
    const whtAssumption = result.assumptions.find((a) => a.key === "withholdingTax");
    expect(whtAssumption?.value).toBe(30);
    expect(whtAssumption?.confidenceBadge).toBe(4);
  });

  it("should evaluate Dividend Aristocrat (KO) with multi-stage Gordon and strong consensus", () => {
    const result = valuateStockUS({
      ticker: "KO",
      targetYield: 3.0,
      currentPrice: 65.0,
      avgDividend: 1.94,
      eps: 2.8,
      dividendCagr: 5.5,
      dividendHistory: [
        { year: 2024, amount: 1.94 },
        { year: 2023, amount: 1.84 },
        { year: 2022, amount: 1.76 },
        { year: 2021, amount: 1.68 },
        { year: 2020, amount: 1.64 },
      ],
      shareholderYield: 3.8,
      currency: "USD",
      type: "STOCK_US",
    });

    // Net dividend after 30% tax = 1.94 * 0.7 = 1.358
    // Bazin = 1.358 / 0.03 = 45.26
    expect(result.methods.bazin).toBeCloseTo(45.27, 1);
    expect(result.methods.gordon).toBeGreaterThan(20);
    expect(result.fuenteConsensus).toBeGreaterThan(0);
  });

  it("should be called via getAssetValuation dispatcher when type is STOCK_US", () => {
    const result = getAssetValuation({
      ticker: "MSFT",
      targetYield: 2.5,
      currentPrice: 420.0,
      avgDividend: 3.0,
      eps: 11.8,
      dividendCagr: 10.0,
      currency: "USD",
      type: "STOCK_US",
    });

    expect(result.ticker).toBe("MSFT");
    expect(result.assumptions).toHaveLength(4);
  });
});
