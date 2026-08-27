import { describe, it, expect } from "vitest";
import { getMonthlyNetContribution, getNetContributionInWindow } from "../monthlyContribution";
import type { Transaction } from "@/lib/transactions";

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "tx-1",
    ticker: "VALE3",
    type: "buy",
    date: new Date(2026, 7, 10).getTime(), // Aug 10, 2026
    quantity: 1,
    pricePerShare: 100,
    ...overrides,
  };
}

const REFERENCE = new Date(2026, 7, 15); // Aug 15, 2026 — same month as fixtures above

describe("getMonthlyNetContribution", () => {
  it("sums only buys when there are no sells in the month", () => {
    const txs = [
      makeTx({ id: "1", type: "buy", quantity: 10, pricePerShare: 20 }), // 200
      makeTx({ id: "2", type: "buy", quantity: 5, pricePerShare: 30 }), // 150
    ];

    expect(getMonthlyNetContribution(txs, REFERENCE)).toBe(350);
  });

  it("nets buy and sell in the same month (rebalancing understates true new capital, by design)", () => {
    const txs = [
      makeTx({ id: "1", type: "sell", quantity: 10, pricePerShare: 20 }), // -200
      makeTx({ id: "2", type: "buy", quantity: 10, pricePerShare: 25 }), // +250
    ];

    expect(getMonthlyNetContribution(txs, REFERENCE)).toBe(50);
  });

  it("returns 0 for a month with no transactions, without throwing", () => {
    const txs = [makeTx({ date: new Date(2026, 5, 1).getTime() })]; // June, out of range

    expect(getMonthlyNetContribution(txs, REFERENCE)).toBe(0);
  });

  it("returns 0 when the transactions array is empty", () => {
    expect(getMonthlyNetContribution([], REFERENCE)).toBe(0);
  });

  it("ignores transactions from other months/years", () => {
    const txs = [
      makeTx({ id: "1", date: new Date(2025, 7, 10).getTime(), quantity: 10, pricePerShare: 20 }), // last year, same month/day
      makeTx({ id: "2", date: new Date(2026, 6, 10).getTime(), quantity: 10, pricePerShare: 20 }), // previous month
    ];

    expect(getMonthlyNetContribution(txs, REFERENCE)).toBe(0);
  });

  it("applies currency conversion per ticker via the injected convertToBRL + currencyByTicker map", () => {
    const txs = [
      makeTx({ id: "1", ticker: "AAPL", type: "buy", quantity: 2, pricePerShare: 100 }), // 200 USD
    ];
    const convertToBRL = (value: number, currency: string) =>
      currency === "USD" ? value * 5 : value;

    const result = getMonthlyNetContribution(txs, REFERENCE, convertToBRL, { AAPL: "USD" });

    expect(result).toBe(1000); // 200 USD * 5
  });

  it("defaults untracked tickers to BRL (no conversion) when currencyByTicker is omitted", () => {
    const txs = [makeTx({ ticker: "VALE3", type: "buy", quantity: 3, pricePerShare: 10 })]; // 30

    expect(getMonthlyNetContribution(txs, REFERENCE)).toBe(30);
  });
});

describe("getNetContributionInWindow", () => {
  const windowStart = new Date(2023, 7, 1).getTime(); // Aug 1, 2023
  const windowEnd = new Date(2024, 7, 1).getTime(); // Aug 1, 2024

  it("sums buys minus sells across the full window, spanning multiple months", () => {
    const txs = [
      makeTx({ id: "1", date: new Date(2023, 9, 1).getTime(), type: "buy", quantity: 10, pricePerShare: 20 }), // 200
      makeTx({ id: "2", date: new Date(2024, 2, 1).getTime(), type: "sell", quantity: 5, pricePerShare: 20 }), // -100
    ];
    expect(getNetContributionInWindow(txs, windowStart, windowEnd)).toBe(100);
  });

  it("excludes transactions outside the window on either side", () => {
    const txs = [
      makeTx({ id: "1", date: new Date(2023, 6, 1).getTime(), quantity: 10, pricePerShare: 20 }), // before window
      makeTx({ id: "2", date: new Date(2024, 8, 1).getTime(), quantity: 10, pricePerShare: 20 }), // after window
    ];
    expect(getNetContributionInWindow(txs, windowStart, windowEnd)).toBe(0);
  });

  it("applies currency conversion per ticker via the injected convertToBRL + currencyByTicker map", () => {
    const txs = [
      makeTx({ id: "1", ticker: "AAPL", date: new Date(2024, 0, 1).getTime(), quantity: 2, pricePerShare: 100 }), // 200 USD
    ];
    const convertToBRL = (value: number, currency: string) =>
      currency === "USD" ? value * 5 : value;

    const result = getNetContributionInWindow(txs, windowStart, windowEnd, convertToBRL, { AAPL: "USD" });
    expect(result).toBe(1000);
  });
});
