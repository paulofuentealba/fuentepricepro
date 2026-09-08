import { describe, it, expect } from "vitest";
import { computeAssetTaxLots } from "../taxLots";
import type { Transaction } from "@/lib/transactionsLogic";

describe("computeAssetTaxLots", () => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const asOf = new Date("2026-06-01T12:00:00Z").getTime();

  it("handles a single recent buy lot (short-term)", () => {
    const txs: Transaction[] = [
      {
        id: "tx-1",
        ticker: "AAPL",
        type: "buy",
        date: asOf - 30 * MS_PER_DAY, // 30 days ago
        quantity: 10,
        pricePerShare: 150,
        fees: 5,
        accountType: "taxable",
      },
    ];

    const summary = computeAssetTaxLots(txs, "AAPL", 180, asOf);
    expect(summary.totalQuantity).toBe(10);
    expect(summary.totalCostBasis).toBe(1505); // (150 + 0.5) * 10 = 1505
    expect(summary.totalCurrentValue).toBe(1800);
    expect(summary.totalUnrealizedGainLoss).toBe(295);
    expect(summary.shortTermQuantity).toBe(10);
    expect(summary.longTermQuantity).toBe(0);
    expect(summary.shortTermPct).toBe(100);
    expect(summary.longTermPct).toBe(0);

    expect(summary.lots).toHaveLength(1);
    const lot = summary.lots[0];
    expect(lot.term).toBe("SHORT_TERM");
    expect(lot.isLongTerm).toBe(false);
    expect(lot.daysHeld).toBe(30);
    expect(lot.daysUntilLongTerm).toBe(336); // 366 - 30
    expect(lot.accountType).toBe("taxable");
  });

  it("identifies long-term lots (> 365 days held)", () => {
    const txs: Transaction[] = [
      {
        id: "tx-old",
        ticker: "KO",
        type: "buy",
        date: asOf - 400 * MS_PER_DAY, // 400 days ago
        quantity: 50,
        pricePerShare: 55,
        accountType: "roth_ira",
      },
    ];

    const summary = computeAssetTaxLots(txs, "KO", 65, asOf);
    expect(summary.totalQuantity).toBe(50);
    expect(summary.shortTermQuantity).toBe(0);
    expect(summary.longTermQuantity).toBe(50);
    expect(summary.shortTermPct).toBe(0);
    expect(summary.longTermPct).toBe(100);

    const lot = summary.lots[0];
    expect(lot.term).toBe("LONG_TERM");
    expect(lot.isLongTerm).toBe(true);
    expect(lot.daysHeld).toBe(400);
    expect(lot.daysUntilLongTerm).toBe(0);
    expect(lot.accountType).toBe("roth_ira");
  });

  it("consumes lots using IRS FIFO when sales occur", () => {
    const txs: Transaction[] = [
      {
        id: "buy-1",
        ticker: "MSFT",
        type: "buy",
        date: asOf - 200 * MS_PER_DAY,
        quantity: 20,
        pricePerShare: 300,
      },
      {
        id: "buy-2",
        ticker: "MSFT",
        type: "buy",
        date: asOf - 50 * MS_PER_DAY,
        quantity: 15,
        pricePerShare: 400,
      },
      {
        id: "sell-1",
        ticker: "MSFT",
        type: "sell",
        date: asOf - 20 * MS_PER_DAY,
        quantity: 25, // Consumes all 20 of buy-1 + 5 of buy-2
        pricePerShare: 420,
      },
    ];

    const summary = computeAssetTaxLots(txs, "MSFT", 450, asOf);
    expect(summary.totalQuantity).toBe(10);
    expect(summary.lots).toHaveLength(1);
    expect(summary.lots[0].quantity).toBe(10);
    expect(summary.lots[0].costBasisPerShare).toBe(400);
    expect(summary.totalCostBasis).toBe(4000);
    expect(summary.totalCurrentValue).toBe(4500);
    expect(summary.totalUnrealizedGainLoss).toBe(500);
  });

  it("adjusts lots for stock splits / corporate actions", () => {
    const txs: Transaction[] = [
      {
        id: "buy-pre-split",
        ticker: "NVDA",
        type: "buy",
        date: asOf - 100 * MS_PER_DAY,
        quantity: 10,
        pricePerShare: 1000,
      },
      {
        id: "split-10-1",
        ticker: "NVDA",
        type: "corporate_action",
        date: asOf - 50 * MS_PER_DAY,
        quantity: 0,
        pricePerShare: 0,
        factor: 10, // 10-for-1 split
      },
    ];

    const summary = computeAssetTaxLots(txs, "NVDA", 120, asOf);
    expect(summary.totalQuantity).toBe(100);
    expect(summary.lots[0].costBasisPerShare).toBe(100);
    expect(summary.totalCostBasis).toBe(10000);
    expect(summary.totalCurrentValue).toBe(12000);
    expect(summary.totalUnrealizedGainLoss).toBe(2000);
  });

  it("computes mixed short-term and long-term allocations", () => {
    const txs: Transaction[] = [
      {
        id: "buy-long",
        ticker: "JNJ",
        type: "buy",
        date: asOf - 500 * MS_PER_DAY,
        quantity: 30,
        pricePerShare: 150,
      },
      {
        id: "buy-short",
        ticker: "JNJ",
        type: "buy",
        date: asOf - 100 * MS_PER_DAY,
        quantity: 70,
        pricePerShare: 160,
      },
    ];

    const summary = computeAssetTaxLots(txs, "JNJ", 170, asOf);
    expect(summary.totalQuantity).toBe(100);
    expect(summary.longTermQuantity).toBe(30);
    expect(summary.shortTermQuantity).toBe(70);
    expect(summary.longTermPct).toBe(30);
    expect(summary.shortTermPct).toBe(70);
  });
});
