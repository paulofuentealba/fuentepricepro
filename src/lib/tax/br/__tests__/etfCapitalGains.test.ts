import { describe, it, expect } from "vitest";
import { calculateEtfCapitalGainsTax } from "../etfCapitalGains";
import { calculateMonthlyCapitalGainsTax } from "../monthlyExemption";
import { calculateFiiCapitalGainsTax } from "../fiiCapitalGains";
import type { RealizedGainEvent } from "../../types";

describe("calculateEtfCapitalGainsTax (Prompt 143 / Item 2.1e)", () => {
  const makeDate = (dateStr: string) => new Date(`${dateStr}T12:00:00`).getTime();

  it("returns empty array for empty events list", () => {
    const results = calculateEtfCapitalGainsTax([]);
    expect(results).toEqual([]);
  });

  it("applies 15% flat tax on ETF gains even when monthly sales are below R$ 20,000 (NO volume exemption)", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "BOVA11",
        saleDate: makeDate("2026-03-10"),
        quantity: 50,
        salePrice: 120,
        proceeds: 6000, // Under R$ 20k!
        costBasis: 5000,
        gain: 1000, // R$ 1,000 gain
        assetType: "ETF",
      },
    ];

    const results = calculateEtfCapitalGainsTax(events);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      month: "2026-03",
      totalSales: 6000,
      totalGain: 1000,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 0,
      taxableGain: 1000,
      taxDue: 150, // 15% of 1000 = 150
    });
  });

  it("accumulates ETF net loss into carryforward and offsets future ETF gains", () => {
    const events: RealizedGainEvent[] = [
      // Month 1: R$ 2,000 loss
      {
        ticker: "IVVB11",
        saleDate: makeDate("2026-01-15"),
        quantity: 10,
        salePrice: 300,
        proceeds: 3000,
        costBasis: 5000,
        gain: -2000,
        assetType: "ETF",
      },
      // Month 2: R$ 5,000 gain
      {
        ticker: "BOVA11",
        saleDate: makeDate("2026-02-15"),
        quantity: 100,
        salePrice: 150,
        proceeds: 15000,
        costBasis: 10000,
        gain: 5000,
        assetType: "ETF",
      },
    ];

    const results = calculateEtfCapitalGainsTax(events);

    expect(results).toHaveLength(2);

    // Month 1
    expect(results[0]).toEqual({
      month: "2026-01",
      totalSales: 3000,
      totalGain: -2000,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 2000,
      taxableGain: 0,
      taxDue: 0,
    });

    // Month 2
    expect(results[1]).toEqual({
      month: "2026-02",
      totalSales: 15000,
      totalGain: 5000,
      lossCarryforwardUsed: 2000,
      lossCarryforwardRemaining: 0,
      taxableGain: 3000, // 5000 - 2000
      taxDue: 450, // 15% of 3000 = 450
    });
  });

  it("initializes with priorLossCarryforward if provided", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "SMAL11",
        saleDate: makeDate("2026-04-10"),
        quantity: 100,
        salePrice: 110,
        proceeds: 11000,
        costBasis: 10000,
        gain: 1000,
        assetType: "ETF",
      },
    ];

    const results = calculateEtfCapitalGainsTax(events, 600);

    expect(results).toHaveLength(1);
    expect(results[0].lossCarryforwardUsed).toBe(600);
    expect(results[0].lossCarryforwardRemaining).toBe(0);
    expect(results[0].taxableGain).toBe(400);
    expect(results[0].taxDue).toBe(60); // 15% of 400 = 60
  });

  it("proves complete carryforward isolation between ETF, Stock and FII tracks", () => {
    // Scenario:
    // Month 1: Stock loss of R$ 5,000 (with sales > 20k), ETF gain of R$ 3,000, FII gain of R$ 2,000
    // Expected:
    // - Stock track: generates R$ 5,000 stock carryforward
    // - ETF track: pays 15% on R$ 3,000 (R$ 450) — cannot use stock loss!
    // - FII track: pays 20% on R$ 2,000 (R$ 400) — cannot use stock loss!

    const mixedEvents: RealizedGainEvent[] = [
      {
        ticker: "VALE3",
        saleDate: makeDate("2026-05-05"),
        quantity: 1000,
        salePrice: 50,
        proceeds: 50000, // > 20k threshold
        costBasis: 55000,
        gain: -5000,
        assetType: "STOCK_BR",
      },
      {
        ticker: "BOVA11",
        saleDate: makeDate("2026-05-10"),
        quantity: 100,
        salePrice: 130,
        proceeds: 13000,
        costBasis: 10000,
        gain: 3000,
        assetType: "ETF",
      },
      {
        ticker: "KNRI11",
        saleDate: makeDate("2026-05-15"),
        quantity: 100,
        salePrice: 160,
        proceeds: 16000,
        costBasis: 14000,
        gain: 2000,
        assetType: "FII",
      },
    ];

    const stockResults = calculateMonthlyCapitalGainsTax(mixedEvents);
    const etfResults = calculateEtfCapitalGainsTax(mixedEvents);
    const fiiResults = calculateFiiCapitalGainsTax(mixedEvents);

    // Stock track: accumulates loss
    expect(stockResults[0].lossCarryforwardRemaining).toBe(5000);
    expect(stockResults[0].taxDue).toBe(0);

    // ETF track: cannot consume stock loss, taxes full R$ 3,000 at 15%
    expect(etfResults[0].lossCarryforwardUsed).toBe(0);
    expect(etfResults[0].lossCarryforwardRemaining).toBe(0);
    expect(etfResults[0].taxableGain).toBe(3000);
    expect(etfResults[0].taxDue).toBe(450);

    // FII track: cannot consume stock loss, taxes full R$ 2,000 at 20%
    expect(fiiResults[0].lossCarryforwardUsed).toBe(0);
    expect(fiiResults[0].lossCarryforwardRemaining).toBe(0);
    expect(fiiResults[0].taxableGain).toBe(2000);
    expect(fiiResults[0].taxDue).toBe(400);
  });

  it("handles unclassified tickers by excluding them and reporting in unclassifiedTickers", () => {
    const events: RealizedGainEvent[] = [
      {
        ticker: "UNKNOWN_ETF",
        saleDate: makeDate("2026-06-10"),
        quantity: 50,
        salePrice: 100,
        proceeds: 5000,
        costBasis: 4000,
        gain: 1000,
      },
      {
        ticker: "BOVA11",
        saleDate: makeDate("2026-06-15"),
        quantity: 50,
        salePrice: 120,
        proceeds: 6000,
        costBasis: 5000,
        gain: 1000,
        assetType: "ETF",
      },
    ];

    const results = calculateEtfCapitalGainsTax(events);

    expect(results).toHaveLength(1);
    expect(results[0].totalSales).toBe(6000);
    expect(results[0].unclassifiedTickers).toEqual(["UNKNOWN_ETF"]);
  });

  it("excludes a USD-denominated ETF (foreign-listed, e.g. QQQ) to avoid double taxation with the foreign module", () => {
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
      {
        ticker: "BOVA11",
        saleDate: makeDate("2026-08-01"),
        quantity: 50,
        salePrice: 120,
        proceeds: 6000,
        costBasis: 5000,
        gain: 1000,
        assetType: "ETF",
      },
    ];
    const currencyByTicker = new Map([
      ["QQQ", "USD" as const],
      ["BOVA11", "BRL" as const],
    ]);

    const results = calculateEtfCapitalGainsTax(events, 0, undefined, currencyByTicker);

    expect(results).toHaveLength(1);
    expect(results[0].totalSales).toBe(6000); // Only BOVA11 — QQQ excluded
    expect(results[0].totalGain).toBe(1000);
  });

  it("treats every ETF as BR when currencyByTicker is not provided (backward compatible)", () => {
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

    const results = calculateEtfCapitalGainsTax(events);

    expect(results).toHaveLength(1);
    expect(results[0].totalSales).toBe(2500);
  });
});
