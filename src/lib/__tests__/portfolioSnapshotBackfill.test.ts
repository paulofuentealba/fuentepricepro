import { describe, it, expect } from "vitest";
import { computeBackfillSnapshots } from "../portfolioSnapshotBackfill";
import type { Transaction } from "../transactionsLogic";

function tx(overrides: Partial<Transaction> & { date: number }): Transaction {
  return {
    id: `tx-${overrides.date}-${overrides.ticker ?? "TICK"}`,
    ticker: "TICK3",
    type: "buy",
    quantity: 10,
    pricePerShare: 10,
    fees: null,
    notes: null,
    ...overrides,
  };
}

const DAY = 86_400_000;
const JAN_1_2026 = Date.UTC(2026, 0, 1);

describe("computeBackfillSnapshots", () => {
  it("reconstructs totalInvestedBRL day by day from a single buy transaction, with no market value (totalValueBRL null)", () => {
    const transactions: Transaction[] = [
      tx({ date: JAN_1_2026, ticker: "TICK3", type: "buy", quantity: 100, pricePerShare: 10 }),
    ];

    const asOfDate = new Date(JAN_1_2026 + 3 * DAY); // "today" = Jan 4th
    const result = computeBackfillSnapshots(transactions, new Set(), { asOfDate });

    // Days covered: Jan 1, 2, 3 (asOfDate itself / "today" is excluded —
    // that day is usePortfolioSnapshot's responsibility).
    expect(result.map((r) => r.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
    for (const point of result) {
      expect(point.totalInvestedBRL).toBeCloseTo(1000, 2); // 100 * 10
      expect(point.totalValueBRL).toBeNull();
      expect(point.backfilled).toBe(true);
    }
  });

  it("skips dates that already have a snapshot", () => {
    const transactions: Transaction[] = [
      tx({ date: JAN_1_2026, quantity: 100, pricePerShare: 10 }),
    ];
    const asOfDate = new Date(JAN_1_2026 + 3 * DAY);
    const existingDates = new Set(["2026-01-02"]);

    const result = computeBackfillSnapshots(transactions, existingDates, { asOfDate });

    expect(result.map((r) => r.date)).toEqual(["2026-01-01", "2026-01-03"]);
  });

  it("reflects a sell reducing the reconstructed cost basis on days after the sell", () => {
    const transactions: Transaction[] = [
      tx({ date: JAN_1_2026, type: "buy", quantity: 100, pricePerShare: 10 }), // cost 1000
      tx({ date: JAN_1_2026 + DAY, type: "sell", quantity: 40, pricePerShare: 15 }), // qty 60, avg unaffected by sell
    ];
    const asOfDate = new Date(JAN_1_2026 + 3 * DAY);

    const result = computeBackfillSnapshots(transactions, new Set(), { asOfDate });
    const day1 = result.find((r) => r.date === "2026-01-01")!;
    const day2 = result.find((r) => r.date === "2026-01-02")!;

    expect(day1.totalInvestedBRL).toBeCloseTo(1000, 2);
    // Sell doesn't change average price (BR revenue rule): 60 * 10 = 600
    expect(day2.totalInvestedBRL).toBeCloseTo(600, 2);
  });

  it("sums cost basis across multiple tickers and converts USD positions using the provided rate", () => {
    const transactions: Transaction[] = [
      tx({ date: JAN_1_2026, ticker: "TICK3", quantity: 100, pricePerShare: 10 }), // BRL 1000
      tx({ date: JAN_1_2026, ticker: "AAPL", quantity: 10, pricePerShare: 20 }), // USD 200
    ];
    const asOfDate = new Date(JAN_1_2026 + DAY);

    const result = computeBackfillSnapshots(transactions, new Set(), {
      asOfDate,
      currencyByTicker: { TICK3: "BRL", AAPL: "USD" },
      usdRate: 5,
    });

    expect(result).toHaveLength(1);
    // 1000 (BRL) + 200 * 5 (USD->BRL) = 2000
    expect(result[0].totalInvestedBRL).toBeCloseTo(2000, 2);
  });

  it("returns an empty array when there are no transactions", () => {
    expect(computeBackfillSnapshots([], new Set())).toEqual([]);
  });

  it("returns an empty array when the first transaction happened today (nothing to backfill yet)", () => {
    const transactions: Transaction[] = [tx({ date: JAN_1_2026, quantity: 10, pricePerShare: 10 })];
    const asOfDate = new Date(JAN_1_2026); // same day as the transaction

    expect(computeBackfillSnapshots(transactions, new Set(), { asOfDate })).toEqual([]);
  });

  it("does not emit a day where the position was fully closed (totalInvestedBRL would be 0)", () => {
    const transactions: Transaction[] = [
      tx({ date: JAN_1_2026, type: "buy", quantity: 10, pricePerShare: 10 }),
      tx({ date: JAN_1_2026 + DAY, type: "sell", quantity: 10, pricePerShare: 10 }),
    ];
    const asOfDate = new Date(JAN_1_2026 + DAY * 3);

    const result = computeBackfillSnapshots(transactions, new Set(), { asOfDate });

    expect(result.map((r) => r.date)).toEqual(["2026-01-01"]);
  });
});
