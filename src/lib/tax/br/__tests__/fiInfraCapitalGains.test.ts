import { describe, it, expect } from "vitest";
import { calculateFiInfraCapitalGainsTax } from "../fiInfraCapitalGains";
import type { RealizedGainEvent } from "../../types";

describe("calculateFiInfraCapitalGainsTax (Prompt 143 / Item 2.1e)", () => {
  // Helper to create timestamp for a specific date in 2026
  const makeDate = (dateStr: string) => new Date(`${dateStr}T12:00:00`).getTime();

  it("returns empty array for empty events list", () => {
    const results = calculateFiInfraCapitalGainsTax([]);
    expect(results).toEqual([]);
  });

  it("returns taxDue=0 for FII_INFRA sales even with massive capital gains (Lei 12.431/2011)", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "JURO11",
        saleDate: makeDate("2026-03-15"),
        quantity: 5000,
        salePrice: 110,
        proceeds: 550000,
        costBasis: 450000,
        gain: 100000, // R$ 100k profit
        assetType: "FII_INFRA",
      },
    ];

    const results = calculateFiInfraCapitalGainsTax(events);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-03",
      totalSales: 550000,
      totalGain: 100000,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 0,
      taxableGain: 0,
      taxDue: 0,
    });
  });

  it("returns lossCarryforwardRemaining=0 on capital losses (no tax credit generated for exempt assets)", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "BDIF11",
        saleDate: makeDate("2026-04-10"),
        quantity: 1000,
        salePrice: 80,
        proceeds: 80000,
        costBasis: 100000,
        gain: -20000, // R$ 20k loss
        assetType: "FII_INFRA",
      },
    ];

    const results = calculateFiInfraCapitalGainsTax(events, 0);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-04",
      totalSales: 80000,
      totalGain: -20000,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 0,
      taxableGain: 0,
      taxDue: 0,
    });
  });

  it("priorLossCarryforward does not affect FI-Infra calculation (remains 0 in all outputs)", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "CPTI11",
        saleDate: makeDate("2026-05-20"),
        quantity: 1000,
        salePrice: 105,
        proceeds: 105000,
        costBasis: 100000,
        gain: 5000,
        assetType: "FII_INFRA",
      },
    ];

    const results = calculateFiInfraCapitalGainsTax(events, 50000);

    expect(results).toHaveLength(1);
    expect(results[0].lossCarryforwardUsed).toBe(0);
    expect(results[0].lossCarryforwardRemaining).toBe(0);
    expect(results[0].taxDue).toBe(0);
  });

  it("resolves assetType from dictionary when event.assetType is missing", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "JURO11",
        saleDate: makeDate("2026-06-10"),
        quantity: 500,
        salePrice: 102,
        proceeds: 51000,
        costBasis: 50000,
        gain: 1000,
      },
    ];

    const assetTypeMap = new Map<string, any>([["JURO11", "FII_INFRA"]]);
    const results = calculateFiInfraCapitalGainsTax(events, 0, assetTypeMap);

    expect(results).toHaveLength(1);
    expect(results[0].month).toBe("2026-06");
    expect(results[0].totalSales).toBe(51000);
    expect(results[0].taxDue).toBe(0);
  });

  it("excludes non-FI-Infra assets (STOCK_BR, FII, ETF) from the calculation", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "PETR4",
        saleDate: makeDate("2026-07-05"),
        quantity: 1000,
        salePrice: 38,
        proceeds: 38000,
        costBasis: 30000,
        gain: 8000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "HGLG11",
        saleDate: makeDate("2026-07-10"),
        quantity: 100,
        salePrice: 165,
        proceeds: 16500,
        costBasis: 16000,
        gain: 500,
        assetType: "FII",
      },
      {
        ticker: "BOVA11",
        saleDate: makeDate("2026-07-15"),
        quantity: 200,
        salePrice: 120,
        proceeds: 24000,
        costBasis: 20000,
        gain: 4000,
        assetType: "ETF",
      },
      {
        ticker: "JURO11",
        saleDate: makeDate("2026-07-20"),
        quantity: 200,
        salePrice: 102,
        proceeds: 20400,
        costBasis: 20000,
        gain: 400,
        assetType: "FII_INFRA",
      },
    ];

    const results = calculateFiInfraCapitalGainsTax(events);

    expect(results).toHaveLength(1);
    expect(results[0].month).toBe("2026-07");
    expect(results[0].totalSales).toBe(20400);
    expect(results[0].totalGain).toBe(400);
    expect(results[0].taxDue).toBe(0);
  });

  it("excludes unclassified tickers and reports them in unclassifiedTickers", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "UNKNOWN_TICKER",
        saleDate: makeDate("2026-08-10"),
        quantity: 100,
        salePrice: 50,
        proceeds: 5000,
        costBasis: 4000,
        gain: 1000,
      },
      {
        ticker: "JURO11",
        saleDate: makeDate("2026-08-15"),
        quantity: 100,
        salePrice: 102,
        proceeds: 10200,
        costBasis: 10000,
        gain: 200,
        assetType: "FII_INFRA",
      },
    ];

    const results = calculateFiInfraCapitalGainsTax(events);

    expect(results).toHaveLength(1);
    expect(results[0].totalSales).toBe(10200);
    expect(results[0].unclassifiedTickers).toEqual(["UNKNOWN_TICKER"]);
  });
});
