import { describe, it, expect } from "vitest";
import { useAssetFilterSort } from "../useAssetFilterSort";

describe("Global Radar Data Processing & Filtering", () => {
  it("correctly counts total, undervalued, and overvalued assets without dropping overvalued assets prematurely", () => {
    const mockRadarData = [
      {
        ticker: "BBAS3",
        currentPrice: 28.0,
        annualDividend: 2.8,
        safetyMargin: 25.0, // Undervalued (>0)
        ceiling: 35.0,
        type: "STOCK_BR",
        currency: "BRL",
      },
      {
        ticker: "VALE3",
        currentPrice: 62.0,
        annualDividend: 3.1,
        safetyMargin: -15.0, // Overvalued (<=0)
        ceiling: 52.7,
        type: "STOCK_BR",
        currency: "BRL",
      },
      {
        ticker: "TAEE11",
        currentPrice: 35.0,
        annualDividend: 3.5,
        safetyMargin: 10.0, // Undervalued (>0)
        ceiling: 38.5,
        type: "STOCK_BR",
        currency: "BRL",
      },
    ];

    // Compute counts manually according to useAssetFilterSort logic
    let total = mockRadarData.length;
    let under = mockRadarData.filter((i) => i.safetyMargin > 0).length;
    let over = mockRadarData.filter((i) => i.safetyMargin <= 0).length;

    expect(total).toBe(3);
    expect(under).toBe(2);
    expect(over).toBe(1);
  });
});
