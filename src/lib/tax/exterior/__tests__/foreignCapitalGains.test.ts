import { describe, it, expect } from "vitest";
import { simulateForeignCapitalGainsTax } from "../foreignCapitalGains";
import type { RealizedGainEvent } from "../../types";

describe("simulateForeignCapitalGainsTax (Lei 14.754/2023 / Item 2.1e — ações no exterior)", () => {
  const makeDate = (dateStr: string) => new Date(`${dateStr}T12:00:00`).getTime();

  it("returns empty array for empty events list", () => {
    expect(simulateForeignCapitalGainsTax([])).toEqual([]);
  });

  it("applies flat 15% tax on net annual gain with NO small-value exemption", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "AAPL",
        saleDate: makeDate("2026-03-10"),
        quantity: 10,
        salePrice: 200,
        proceeds: 2000, // Small sale — would be exempt under the old R$35k/month rule
        costBasis: 1000,
        gain: 1000,
        assetType: "STOCK_US",
      },
    ];

    const results = simulateForeignCapitalGainsTax(events);

    expect(results).toEqual([
      {
        year: "2026",
        totalSales: 2000,
        totalGain: 1000,
        taxableGain: 1000,
        taxDue: 150, // 15% flat, no exemption threshold applied
      },
    ]);
  });

  it("nets gains and losses within the same calendar year before taxing", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "O",
        saleDate: makeDate("2026-02-01"),
        quantity: 20,
        salePrice: 60,
        proceeds: 1200,
        costBasis: 2000,
        gain: -800,
        assetType: "REIT",
      },
      {
        ticker: "AAPL",
        saleDate: makeDate("2026-09-15"),
        quantity: 10,
        salePrice: 250,
        proceeds: 2500,
        costBasis: 1000,
        gain: 1500,
        assetType: "STOCK_US",
      },
    ];

    const results = simulateForeignCapitalGainsTax(events);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      year: "2026",
      totalSales: 3700,
      totalGain: 700, // 1500 - 800 netted within the year
      taxableGain: 700,
      taxDue: 105, // 15% of 700
    });
  });

  it("does NOT carry a net loss forward to a later year", () => {
    const events: RealizedGainEvent[] = [
      // 2026: net loss
      {
        ticker: "AAPL",
        saleDate: makeDate("2026-05-01"),
        quantity: 10,
        salePrice: 100,
        proceeds: 1000,
        costBasis: 3000,
        gain: -2000,
        assetType: "STOCK_US",
      },
      // 2027: net gain — must NOT be reduced by 2026's loss
      {
        ticker: "AAPL",
        saleDate: makeDate("2027-05-01"),
        quantity: 10,
        salePrice: 300,
        proceeds: 3000,
        costBasis: 1000,
        gain: 2000,
        assetType: "STOCK_US",
      },
    ];

    const results = simulateForeignCapitalGainsTax(events);

    expect(results).toEqual([
      {
        year: "2026",
        totalSales: 1000,
        totalGain: -2000,
        taxableGain: 0,
        taxDue: 0,
      },
      {
        year: "2027",
        totalSales: 3000,
        totalGain: 2000,
        taxableGain: 2000, // Full gain taxed — no carryforward from 2026's loss
        taxDue: 300,
      },
    ]);
  });

  it("excludes non-foreign asset types (STOCK_BR, FII, ETF) from the calculation", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "PETR4",
        saleDate: makeDate("2026-04-01"),
        quantity: 100,
        salePrice: 30,
        proceeds: 3000,
        costBasis: 2000,
        gain: 1000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "HGLG11",
        saleDate: makeDate("2026-04-02"),
        quantity: 10,
        salePrice: 150,
        proceeds: 1500,
        costBasis: 1000,
        gain: 500,
        assetType: "FII",
      },
      {
        ticker: "BOVA11",
        saleDate: makeDate("2026-04-03"),
        quantity: 10,
        salePrice: 100,
        proceeds: 1000,
        costBasis: 800,
        gain: 200,
        assetType: "ETF",
      },
    ];

    expect(simulateForeignCapitalGainsTax(events)).toEqual([]);
  });

  it("reports unclassified tickers separately and excludes them from the taxable calculation", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "UNKNOWNTICKER",
        saleDate: makeDate("2026-06-01"),
        quantity: 5,
        salePrice: 100,
        proceeds: 500,
        costBasis: 300,
        gain: 200,
        // No assetType set, and no assetTypeByTicker entry provided
      },
    ];

    const results = simulateForeignCapitalGainsTax(events);

    expect(results).toEqual([
      {
        year: "2026",
        totalSales: 0,
        totalGain: 0,
        taxableGain: 0,
        taxDue: 0,
        unclassifiedTickers: ["UNKNOWNTICKER"],
      },
    ]);
  });

  it("resolves assetType from the assetTypeByTicker map when the event lacks assetType", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "MSFT",
        saleDate: makeDate("2026-07-01"),
        quantity: 5,
        salePrice: 400,
        proceeds: 2000,
        costBasis: 1000,
        gain: 1000,
      },
    ];
    const assetTypeByTicker = new Map([["MSFT", "STOCK_US" as const]]);

    const results = simulateForeignCapitalGainsTax(events, assetTypeByTicker);

    expect(results).toEqual([
      {
        year: "2026",
        totalSales: 2000,
        totalGain: 1000,
        taxableGain: 1000,
        taxDue: 150,
      },
    ]);
  });

  it("includes a USD-denominated ETF (foreign-listed, e.g. QQQ) in the calculation", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "QQQ",
        saleDate: makeDate("2026-08-01"),
        quantity: 5,
        salePrice: 500,
        proceeds: 2500,
        costBasis: 2000,
        gain: 500,
        assetType: "ETF",
      },
    ];
    const currencyByTicker = new Map([["QQQ", "USD" as const]]);

    const results = simulateForeignCapitalGainsTax(events, undefined, currencyByTicker);

    expect(results).toEqual([
      {
        year: "2026",
        totalSales: 2500,
        totalGain: 500,
        taxableGain: 500,
        taxDue: 75,
      },
    ]);
  });

  it("excludes a BRL-denominated ETF (BR-listed, e.g. BOVA11) from the calculation", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "BOVA11",
        saleDate: makeDate("2026-08-01"),
        quantity: 10,
        salePrice: 100,
        proceeds: 1000,
        costBasis: 800,
        gain: 200,
        assetType: "ETF",
      },
    ];
    const currencyByTicker = new Map([["BOVA11", "BRL" as const]]);

    expect(simulateForeignCapitalGainsTax(events, undefined, currencyByTicker)).toEqual([]);
  });

  it("excludes an ETF when currencyByTicker is not provided (defaults to out-of-scope)", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "QQQ",
        saleDate: makeDate("2026-08-01"),
        quantity: 5,
        salePrice: 500,
        proceeds: 2500,
        costBasis: 2000,
        gain: 500,
        assetType: "ETF",
      },
    ];

    expect(simulateForeignCapitalGainsTax(events)).toEqual([]);
  });
});
