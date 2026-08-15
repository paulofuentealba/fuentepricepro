import { describe, it, expect } from "vitest";
import { valuateREIT, getAssetValuation } from "../calculations";
import { fetchUsTreasury10Y, DEFAULT_US_TREASURY_10Y } from "../api/fred.server";

describe("valuateREIT - REITs Norte-Americanos Especializados", () => {
  it("should have resilient FRED API fetcher with 4.25% default fallback", async () => {
    const rate = await fetchUsTreasury10Y();
    expect(rate).toBe(DEFAULT_US_TREASURY_10Y);
  });

  it("should evaluate Realty Income (O) with Treasury 10Y spread and 30% WHT, forbidding corporate Graham", () => {
    const result = valuateREIT({
      ticker: "O",
      type: "REIT",
      targetYield: 0, // auto calibrated: 4.25% + 2.75% = 7.0%
      currentPrice: 54.0,
      avgDividend: 3.15,
      dividendCagr: 3.2,
      currency: "USD",
      usTreasury10Y: 4.25,
    });

    // 1. Graham is strictly forbidden for REITs
    expect(result.methods.graham).toBeNull();
    expect(result.graham).toBeNull();

    // 2. Net dividend after 30% WHT: 3.15 * 0.70 = 2.205
    // Required Yield: 4.25 + 2.75 = 7.0%
    // Bazin = 2.205 / 0.07 = 31.50
    expect(result.methods.bazin).toBeCloseTo(31.5, 1);

    // 3. Fuente Consensus should be positive
    expect(result.fuenteConsensus).toBeGreaterThan(0);

    // 4. Assumptions should contain 4 resolved items
    expect(result.assumptions).toHaveLength(4);
    const treasuryAssumption = result.assumptions.find((a) => a.key === "treasury10YRate");
    expect(treasuryAssumption?.value).toBe(4.25);
  });

  it("should evaluate AFFO yield ceiling when affo is provided", () => {
    const result = valuateREIT({
      ticker: "PLD",
      type: "REIT",
      targetYield: 6.0,
      currentPrice: 110.0,
      avgDividend: 3.8,
      affo: 4.2,
      currency: "USD",
    });

    expect(result.methods.affoYield).toBeGreaterThan(0);
  });

  it("should be called via getAssetValuation dispatcher for REIT", () => {
    const result = getAssetValuation({
      ticker: "AMT",
      type: "REIT",
      targetYield: 5.5,
      currentPrice: 195.0,
      avgDividend: 6.5,
      currency: "USD",
    });

    expect(result.methods.graham).toBeNull();
    expect(result.assumptions).toHaveLength(4);
  });
});
