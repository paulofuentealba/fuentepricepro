import { describe, it, expect } from "vitest";
import { buildDecisionLog } from "../buildDecisionLog";
import type { Transaction } from "@/lib/transactions";
import type { WatchlistItem } from "@/lib/watchlist";

function makeWatchlistItem(overrides: Partial<WatchlistItem>): WatchlistItem {
  return {
    id: "item-1",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 28.5,
    annualDividend: 2.5,
    targetYield: 6,
    ceilingPrice: 41.67,
    safetyMargin: 46.2,
    quantity: 100,
    averagePrice: 25.0,
    paymentMonths: [],
    payoutRatio: 40,
    addedAt: 1700000000000,
    investingSince: 1700000000000,
    ...overrides,
  };
}

describe("buildDecisionLog: per-row currency stays native (never auto-converted to BRL)", () => {
  it("keeps a USD stock's price/fee/tax/total entirely in USD regardless of fxRate", () => {
    const tx: Transaction = {
      id: "tx-aapl",
      ticker: "AAPL",
      type: "buy",
      date: new Date(2025, 4, 1).getTime(),
      quantity: 10,
      pricePerShare: 180,
      fees: 1.5,
      thesisSnapshot: {
        consensusPrice: 190,
        bazinPrice: null,
        grahamPrice: null,
        gordonPrice: null,
        purchasePrice: 180,
        safetyMarginVsConsensus: ((190 - 180) / 180) * 100,
        payoutRatio: 15,
        dividendYield: 0.5,
        dividendCagr5y: null,
        piotroskiScore: null,
        isYieldTrap: false,
        valuationVersion: "fuente-v1",
        capturedAt: Date.now(),
      },
    };
    const watchlist = [
      makeWatchlistItem({ ticker: "AAPL", type: "STOCK_US", currency: "USD", name: "Apple Inc." }),
    ];

    // fxRate is deliberately large (5.4) — if a per-row value were wrongly multiplied by it,
    // these assertions would fail loudly.
    const summary = buildDecisionLog([tx], watchlist, 5.4);
    const entry = summary.entries[0];

    expect(entry.currency).toBe("USD");
    expect(entry.pricePerShare).toBe(180);
    expect(entry.feesNative).toBe(1.5);
    expect(entry.totalNative).toBeCloseTo(180 * 10 + 1.5, 2); // still USD, not R$-scaled
  });
});

describe("buildDecisionLog: buys (reads Transaction.thesisSnapshot)", () => {
  it("marks a purchase above consensus as above_ceiling with a negative effect", () => {
    const tx: Transaction = {
      id: "tx-1",
      ticker: "HGLG11",
      type: "buy",
      date: new Date(2025, 2, 12).getTime(),
      quantity: 50,
      pricePerShare: 181.0,
      fees: 5,
      thesisSnapshot: {
        consensusPrice: 168.2,
        bazinPrice: 165,
        grahamPrice: null,
        gordonPrice: null,
        purchasePrice: 181.0,
        safetyMarginVsConsensus: ((168.2 - 181.0) / 181.0) * 100,
        payoutRatio: 90,
        dividendYield: 8,
        dividendCagr5y: null,
        piotroskiScore: null,
        isYieldTrap: false,
        valuationVersion: "fuente-v1",
        capturedAt: Date.now(),
      },
    };
    const watchlist = [makeWatchlistItem({ ticker: "HGLG11", type: "FII", name: "CSHG Logística" })];

    const summary = buildDecisionLog([tx], watchlist, 5);
    const entry = summary.entries[0];

    expect(entry.verdict).toBe("above_ceiling");
    expect(entry.effectNative).toBeCloseTo((168.2 - 181.0) * 50, 2); // -640
    expect(entry.taxNative).toBe(0);
    expect(entry.feesNative).toBe(5);
    expect(entry.totalNative).toBeCloseTo(181.0 * 50 + 5, 2);
    expect(summary.overpaidCount).toBe(1);
    expect(summary.overpaidTotalBRL).toBeCloseTo(640, 2);
  });

  it("marks a purchase well below consensus as great_entry", () => {
    const tx: Transaction = {
      id: "tx-2",
      ticker: "BBAS3",
      type: "buy",
      date: new Date(2024, 10, 22).getTime(),
      quantity: 120,
      pricePerShare: 24.8,
      fees: 0,
      thesisSnapshot: {
        consensusPrice: 30.4,
        bazinPrice: 29,
        grahamPrice: null,
        gordonPrice: null,
        purchasePrice: 24.8,
        safetyMarginVsConsensus: ((30.4 - 24.8) / 24.8) * 100, // ~22.6%
        payoutRatio: 40,
        dividendYield: 9,
        dividendCagr5y: null,
        piotroskiScore: null,
        isYieldTrap: false,
        valuationVersion: "fuente-v1",
        capturedAt: Date.now(),
      },
    };
    const summary = buildDecisionLog([tx], [makeWatchlistItem({ ticker: "BBAS3" })], 5);
    expect(summary.entries[0].verdict).toBe("great_entry");
    expect(summary.entries[0].effectNative).toBeCloseTo((30.4 - 24.8) * 120, 2);
  });

  it("yield trap overrides above_ceiling wording even when both conditions hold", () => {
    const tx: Transaction = {
      id: "tx-3",
      ticker: "MXRF11",
      type: "buy",
      date: new Date(2025, 0, 8).getTime(),
      quantity: 200,
      pricePerShare: 10.9,
      fees: 0,
      thesisSnapshot: {
        consensusPrice: 10.1,
        bazinPrice: 9.8,
        grahamPrice: null,
        gordonPrice: null,
        purchasePrice: 10.9,
        safetyMarginVsConsensus: ((10.1 - 10.9) / 10.9) * 100,
        payoutRatio: 130,
        dividendYield: 12.6,
        dividendCagr5y: null,
        piotroskiScore: null,
        isYieldTrap: true,
        valuationVersion: "fuente-v1",
        capturedAt: Date.now(),
      },
    };
    const summary = buildDecisionLog([tx], [makeWatchlistItem({ ticker: "MXRF11", type: "FII" })], 5);
    expect(summary.entries[0].verdict).toBe("yield_trap");
  });

  it("reports no_data for a buy without a thesisSnapshot (pre-existing transaction)", () => {
    const tx: Transaction = {
      id: "tx-4",
      ticker: "TAEE11",
      type: "buy",
      date: new Date(2023, 5, 1).getTime(),
      quantity: 100,
      pricePerShare: 31.1,
      fees: 0,
    };
    const summary = buildDecisionLog([tx], [makeWatchlistItem({ ticker: "TAEE11" })], 5);
    expect(summary.entries[0].verdict).toBe("no_data");
    expect(summary.entries[0].consensusAtDecision).toBeNull();
  });
});

describe("buildDecisionLog: sells (real marginal tax, chronological replay)", () => {
  it("attributes tax to whichever sale tips the R$20k/month stock exemption, in transaction date order", () => {
    const buy: Transaction = {
      id: "tx-buy",
      ticker: "BBAS3",
      type: "buy",
      date: new Date(2024, 0, 1).getTime(),
      quantity: 1000,
      pricePerShare: 20,
      fees: 0,
    };
    const sell1: Transaction = {
      id: "tx-sell-1",
      ticker: "BBAS3",
      type: "sell",
      date: new Date(2026, 7, 5).getTime(),
      quantity: 500,
      pricePerShare: 30,
      fees: 2,
    }; // proceeds 15,000 (within exemption alone)
    const sell2: Transaction = {
      id: "tx-sell-2",
      ticker: "BBAS3",
      type: "sell",
      date: new Date(2026, 7, 10).getTime(),
      quantity: 300,
      pricePerShare: 33.33,
      fees: 3,
    }; // proceeds 9,999 — combined with sell1, tips month over R$20k

    const summary = buildDecisionLog([buy, sell1, sell2], [makeWatchlistItem({ ticker: "BBAS3" })], 5);
    const sellEntries = summary.entries.filter((e) => e.kind === "sell").sort((a, b) => a.date - b.date);

    expect(sellEntries[0].taxNative).toBe(0); // alone, within exemption
    expect(sellEntries[1].taxNative).toBeGreaterThan(0); // this one tips the month over 20k
  });

  it("realized gain/loss verdict reflects the actual sale outcome", () => {
    const buy: Transaction = {
      id: "tx-buy",
      ticker: "MXRF11",
      type: "buy",
      date: new Date(2024, 0, 1).getTime(),
      quantity: 100,
      pricePerShare: 10,
      fees: 0,
    };
    const sell: Transaction = {
      id: "tx-sell",
      ticker: "MXRF11",
      type: "sell",
      date: new Date(2026, 5, 1).getTime(),
      quantity: 100,
      pricePerShare: 8,
      fees: 0,
    };
    const summary = buildDecisionLog([buy, sell], [makeWatchlistItem({ ticker: "MXRF11", type: "FII" })], 5);
    const sellEntry = summary.entries.find((e) => e.kind === "sell")!;
    expect(sellEntry.verdict).toBe("realized_loss");
    expect(sellEntry.realizedGainNative).toBeCloseTo(-200, 2);
  });
});
