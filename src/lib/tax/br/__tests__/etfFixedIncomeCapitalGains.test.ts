import { describe, it, expect } from "vitest";
import {
  computeFifoLotSaleSlices,
  calculateEtfFixedIncomeCapitalGainsTax,
} from "../etfFixedIncomeCapitalGains";
import type { Transaction } from "@/lib/transactionsLogic";

describe("computeFifoLotSaleSlices", () => {
  const makeDate = (dateStr: string) => new Date(`${dateStr}T12:00:00`).getTime();

  it("returns empty array for empty transactions", () => {
    expect(computeFifoLotSaleSlices([])).toEqual([]);
  });

  it("matches a sell against a single prior buy lot, computing holding days", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "LFTS11", type: "buy", date: makeDate("2026-01-01"), quantity: 100, pricePerShare: 10 },
      { id: "2", ticker: "LFTS11", type: "sell", date: makeDate("2026-04-01"), quantity: 100, pricePerShare: 11 },
    ];

    const slices = computeFifoLotSaleSlices(transactions);

    expect(slices).toHaveLength(1);
    expect(slices[0]).toMatchObject({
      ticker: "LFTS11",
      quantity: 100,
      proceeds: 1100,
      costBasis: 1000,
      gain: 100,
      holdingDays: 90, // Jan 1 -> Apr 1
    });
  });

  it("consumes multiple lots oldest-first (FIFO) when a sell spans them", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "IMAB11", type: "buy", date: makeDate("2025-01-01"), quantity: 50, pricePerShare: 10 }, // old lot
      { id: "2", ticker: "IMAB11", type: "buy", date: makeDate("2026-06-01"), quantity: 50, pricePerShare: 12 }, // recent lot
      { id: "3", ticker: "IMAB11", type: "sell", date: makeDate("2026-07-01"), quantity: 80, pricePerShare: 13 },
    ];

    const slices = computeFifoLotSaleSlices(transactions);

    expect(slices).toHaveLength(2);
    // First slice: consumes all 50 units from the OLD lot (Jan 2025)
    expect(slices[0]).toMatchObject({ quantity: 50, costBasis: 500, acquisitionDate: makeDate("2025-01-01") });
    expect(slices[0].holdingDays).toBeGreaterThan(360); // > 1 year held
    // Second slice: consumes the remaining 30 units from the RECENT lot (Jun 2026)
    expect(slices[1]).toMatchObject({ quantity: 30, costBasis: 360, acquisitionDate: makeDate("2026-06-01") });
    expect(slices[1].holdingDays).toBe(30); // Jun 1 -> Jul 1
  });

  it("applies a corporate_action factor to open lots, preserving acquisition date", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "B5P211", type: "buy", date: makeDate("2026-01-01"), quantity: 100, pricePerShare: 10 },
      { id: "2", ticker: "B5P211", type: "corporate_action", date: makeDate("2026-02-01"), quantity: 0, pricePerShare: 0, factor: 2 }, // 2-for-1 split
      { id: "3", ticker: "B5P211", type: "sell", date: makeDate("2026-03-01"), quantity: 200, pricePerShare: 6 },
    ];

    const slices = computeFifoLotSaleSlices(transactions);

    expect(slices).toHaveLength(1);
    expect(slices[0]).toMatchObject({
      quantity: 200,
      costBasis: 1000, // 200 units at post-split price of 5 = 1000, unchanged invested capital
      acquisitionDate: makeDate("2026-01-01"), // Lot date preserved through the split
    });
  });
});

describe("calculateEtfFixedIncomeCapitalGainsTax (IN RFB 1.585/2015, art. 31 — tabela regressiva)", () => {
  const makeDate = (dateStr: string) => new Date(`${dateStr}T12:00:00`).getTime();

  it("returns empty array for empty transactions", () => {
    expect(calculateEtfFixedIncomeCapitalGainsTax([])).toEqual([]);
  });

  it("applies the 22.5% bracket for a lot held up to 180 days", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "LFTS11", type: "buy", date: makeDate("2026-01-01"), quantity: 100, pricePerShare: 10 },
      { id: "2", ticker: "LFTS11", type: "sell", date: makeDate("2026-03-01"), quantity: 100, pricePerShare: 11 }, // 59 days
    ];
    const assetTypeByTicker = new Map([["LFTS11", "ETF" as const]]);
    const isFixedIncomeEtfByTicker = new Map([["LFTS11", true]]);

    const results = calculateEtfFixedIncomeCapitalGainsTax(
      transactions,
      0,
      assetTypeByTicker,
      isFixedIncomeEtfByTicker,
    );

    expect(results).toHaveLength(1);
    expect(results[0].totalGain).toBe(100);
    expect(results[0].taxDue).toBe(22.5); // 100 * 22.5%
  });

  it("applies the 15% bracket for a lot held beyond 720 days", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "IMAB11", type: "buy", date: makeDate("2023-01-01"), quantity: 100, pricePerShare: 10 },
      { id: "2", ticker: "IMAB11", type: "sell", date: makeDate("2026-03-01"), quantity: 100, pricePerShare: 20 }, // >720 days
    ];
    const assetTypeByTicker = new Map([["IMAB11", "ETF" as const]]);
    const isFixedIncomeEtfByTicker = new Map([["IMAB11", true]]);

    const results = calculateEtfFixedIncomeCapitalGainsTax(
      transactions,
      0,
      assetTypeByTicker,
      isFixedIncomeEtfByTicker,
    );

    expect(results).toHaveLength(1);
    expect(results[0].totalGain).toBe(1000);
    expect(results[0].taxDue).toBe(150); // 1000 * 15%
  });

  it("uses each lot's OWN bracket rate when a single sell spans lots of different ages", () => {
    const transactions: Transaction[] = [
      // Old lot: will be held >720 days at sale -> 15% bracket
      { id: "1", ticker: "B5P211", type: "buy", date: makeDate("2023-01-01"), quantity: 50, pricePerShare: 10 },
      // Recent lot: will be held <180 days at sale -> 22.5% bracket
      { id: "2", ticker: "B5P211", type: "buy", date: makeDate("2026-02-01"), quantity: 50, pricePerShare: 10 },
      { id: "3", ticker: "B5P211", type: "sell", date: makeDate("2026-03-01"), quantity: 100, pricePerShare: 12 },
    ];
    const assetTypeByTicker = new Map([["B5P211", "ETF" as const]]);
    const isFixedIncomeEtfByTicker = new Map([["B5P211", true]]);

    const results = calculateEtfFixedIncomeCapitalGainsTax(
      transactions,
      0,
      assetTypeByTicker,
      isFixedIncomeEtfByTicker,
    );

    expect(results).toHaveLength(1);
    // Old-lot slice: 50 * (12-10) = 100 gain @ 15% = 15
    // Recent-lot slice: 50 * (12-10) = 100 gain @ 22.5% = 22.5
    expect(results[0].totalGain).toBe(200);
    expect(results[0].taxDue).toBe(37.5);
  });

  it("carries a loss forward in R$ and applies it before each slice's own bracket rate", () => {
    const transactions: Transaction[] = [
      // Month 1: loss of 500 on LFTS11
      { id: "1", ticker: "LFTS11", type: "buy", date: makeDate("2026-01-01"), quantity: 100, pricePerShare: 10 },
      { id: "2", ticker: "LFTS11", type: "sell", date: makeDate("2026-01-15"), quantity: 100, pricePerShare: 5 }, // -500
      // Month 2: gain of 1000 on a DIFFERENT ticker (IMAB11), held long enough for 15% bracket.
      // Using a separate ticker avoids FIFO-queue interference with LFTS11's lots — the R$
      // carryforward still pools across both, since it is tracked globally, not per ticker.
      { id: "3", ticker: "IMAB11", type: "buy", date: makeDate("2023-01-01"), quantity: 100, pricePerShare: 10 },
      { id: "4", ticker: "IMAB11", type: "sell", date: makeDate("2026-02-15"), quantity: 100, pricePerShare: 20 }, // +1000, >720 days
    ];
    const assetTypeByTicker = new Map([
      ["LFTS11", "ETF" as const],
      ["IMAB11", "ETF" as const],
    ]);
    const isFixedIncomeEtfByTicker = new Map([
      ["LFTS11", true],
      ["IMAB11", true],
    ]);

    const results = calculateEtfFixedIncomeCapitalGainsTax(
      transactions,
      0,
      assetTypeByTicker,
      isFixedIncomeEtfByTicker,
    );

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      month: "2026-01",
      totalGain: -500,
      taxableGain: 0,
      taxDue: 0,
      lossCarryforwardRemaining: 500,
    });
    expect(results[1]).toMatchObject({
      month: "2026-02",
      totalGain: 1000,
      lossCarryforwardUsed: 500,
      taxableGain: 500,
      taxDue: 75, // (1000 - 500) * 15%
      lossCarryforwardRemaining: 0,
    });
  });

  it("excludes an ETF NOT marked isFixedIncomeEtf (defaults to equity, out of scope)", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "BOVA11", type: "buy", date: makeDate("2026-01-01"), quantity: 100, pricePerShare: 10 },
      { id: "2", ticker: "BOVA11", type: "sell", date: makeDate("2026-03-01"), quantity: 100, pricePerShare: 12 },
    ];
    const assetTypeByTicker = new Map([["BOVA11", "ETF" as const]]);
    // No isFixedIncomeEtfByTicker entry — defaults to equity ETF, out of scope here.

    expect(calculateEtfFixedIncomeCapitalGainsTax(transactions, 0, assetTypeByTicker)).toEqual([]);
  });

  it("excludes non-ETF asset types even if isFixedIncomeEtf is somehow set", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "PETR4", type: "buy", date: makeDate("2026-01-01"), quantity: 100, pricePerShare: 10 },
      { id: "2", ticker: "PETR4", type: "sell", date: makeDate("2026-03-01"), quantity: 100, pricePerShare: 12 },
    ];
    const assetTypeByTicker = new Map([["PETR4", "STOCK_BR" as const]]);
    const isFixedIncomeEtfByTicker = new Map([["PETR4", true]]);

    expect(
      calculateEtfFixedIncomeCapitalGainsTax(transactions, 0, assetTypeByTicker, isFixedIncomeEtfByTicker),
    ).toEqual([]);
  });

  it("reports unclassified tickers (missing assetType) separately, excluded from the calculation", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "UNKNOWN", type: "buy", date: makeDate("2026-01-01"), quantity: 100, pricePerShare: 10 },
      { id: "2", ticker: "UNKNOWN", type: "sell", date: makeDate("2026-03-01"), quantity: 100, pricePerShare: 12 },
    ];

    const results = calculateEtfFixedIncomeCapitalGainsTax(transactions);

    expect(results).toHaveLength(1);
    expect(results[0].unclassifiedTickers).toEqual(["UNKNOWN"]);
    expect(results[0].totalGain).toBe(0);
    expect(results[0].taxDue).toBe(0);
  });
});
