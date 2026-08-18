import { describe, it, expect } from "vitest";
import { recalculateInvestingSinceFromTransactions, type Transaction } from "../transactionsLogic";
import { buildMonthlyBuckets } from "../cashflow";
import type { WatchlistItem } from "../watchlist";

function mkItem(overrides: Partial<WatchlistItem>): WatchlistItem {
  return {
    id: overrides.ticker ?? "T",
    ticker: "T",
    name: "Test",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 10,
    annualDividend: 12,
    targetYield: 6,
    ceilingPrice: 20,
    safetyMargin: 50,
    quantity: 100,
    averagePrice: 10,
    paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    payoutRatio: null,
    customTaxRate: null,
    sector: null,
    addedAt: Date.now(),
    investingSince: Date.now(), // Recent timestamp
    ...overrides,
  };
}

describe("Canonical investingSince calculations", () => {
  it("recalculateInvestingSinceFromTransactions finds earliest buy transaction date", () => {
    const txs: Transaction[] = [
      {
        id: "tx-3",
        ticker: "VALE3",
        type: "buy",
        date: new Date("2024-05-10").getTime(),
        quantity: 50,
        pricePerShare: 60,
      },
      {
        id: "tx-1",
        ticker: "VALE3",
        type: "buy",
        date: new Date("2022-08-09").getTime(), // Earliest
        quantity: 100,
        pricePerShare: 55,
      },
      {
        id: "tx-2",
        ticker: "VALE3",
        type: "sell",
        date: new Date("2023-01-15").getTime(),
        quantity: 20,
        pricePerShare: 65,
      },
    ];

    const result = recalculateInvestingSinceFromTransactions(txs);
    expect(result).toBe(new Date("2022-08-09").getTime());
  });

  it("recalculateInvestingSinceFromTransactions returns null when no buy transactions exist", () => {
    const txs: Transaction[] = [
      {
        id: "tx-1",
        ticker: "VALE3",
        type: "sell",
        date: new Date("2023-01-15").getTime(),
        quantity: 20,
        pricePerShare: 65,
      },
    ];

    expect(recalculateInvestingSinceFromTransactions(txs)).toBeNull();
    expect(recalculateInvestingSinceFromTransactions([])).toBeNull();
  });

  it("buildMonthlyBuckets in journey mode expands beyond current month when transactions are from previous years", () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Item has investingSince = today (stale data in DB), but transactions exist from 2 years ago
    const item = mkItem({
      ticker: "PETR4",
      investingSince: now.getTime(),
    });

    const txs: Transaction[] = [
      {
        id: "tx-old",
        ticker: "PETR4",
        type: "buy",
        date: new Date(currentYear - 2, 0, 15).getTime(),
        quantity: 100,
        pricePerShare: 30,
      },
    ];

    const monthsLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const buckets = buildMonthlyBuckets([item], "BRL", monthsLabels, {}, "journey", txs);

    // In journey mode with history > 12 months, it should generate rolling 12 months (12 buckets)
    expect(buckets.length).toBe(12);
  });
});
