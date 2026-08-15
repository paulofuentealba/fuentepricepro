import { describe, it, expect } from "vitest";
import { valuateETF, getAssetValuation } from "../calculations";

describe("valuateETF - ETFs Especializados (Dividendos e Acumulação)", () => {
  it("should evaluate Dividend ETF (SCHD) with Bogle Model and historical DY Bazin", () => {
    const result = valuateETF({
      ticker: "SCHD",
      type: "ETF",
      targetYield: 3.5,
      currentPrice: 28.0,
      avgDividend: 0.98,
      dividendCagr: 8.0,
      currency: "USD",
      usTreasury10Y: 4.25,
    });

    // 1. Graham and single-stock Gordon are forbidden for ETFs
    expect(result.methods.graham).toBeNull();
    expect(result.methods.gordon).toBeNull();

    // 2. Bogle model and Bazin should be positive
    expect(result.methods.bogleModel).toBeGreaterThan(0);
    expect(result.methods.bazin).toBeGreaterThan(0);
    expect(result.fuenteConsensus).toBeGreaterThan(0);
    expect(result.isUnavailable).toBe(false);

    // 3. Assumptions should contain 4 resolved items with badge 4
    expect(result.assumptions).toHaveLength(4);
    const dyAssumption = result.assumptions.find((a) => a.key === "historicalDividendYield");
    expect(dyAssumption?.confidenceBadge).toBe(4);
  });

  it("should evaluate Accumulation ETF (IVVB11) with Implicit ERP without marking isUnavailable: true", () => {
    const result = valuateETF({
      ticker: "IVVB11",
      type: "ETF",
      targetYield: 8.0,
      currentPrice: 320.0,
      avgDividend: 0, // Accumulation ETF: reinvests dividends automatically
      currency: "BRL",
      selicPct: 10.5,
    });

    // 1. Must NEVER be marked as isUnavailable
    expect(result.isUnavailable).toBe(false);
    expect(result.activeCeiling).toBeGreaterThan(0);
    expect(result.fuenteConsensus).toBeGreaterThan(0);

    // 2. Confidence badge for accumulation ETF is 3 (●●●○)
    const dyAssumption = result.assumptions.find((a) => a.key === "historicalDividendYield");
    expect(dyAssumption?.confidenceBadge).toBe(3);
  });

  it("should be called via getAssetValuation dispatcher when type is ETF", () => {
    const result = getAssetValuation({
      ticker: "BOVA11",
      type: "ETF",
      targetYield: 6.0,
      currentPrice: 125.0,
      avgDividend: 0,
      currency: "BRL",
    });

    expect(result.isUnavailable).toBe(false);
    expect(result.methods.graham).toBeNull();
    expect(result.assumptions).toHaveLength(4);
  });
});
