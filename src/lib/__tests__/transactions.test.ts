import { describe, it, expect } from "vitest";
import { recalculateHoldingFromTransactions, getQuantityAtDate, Transaction } from "../transactions";

describe("recalculateHoldingFromTransactions", () => {
  it("should calculate average price for only buys (including fees)", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        ticker: "AAPL",
        type: "buy",
        date: 1000,
        quantity: 10,
        pricePerShare: 150,
        fees: 10,
      }, // Cost: (10 * 150) + 10 = 1510. Avg: 151
      {
        id: "2",
        ticker: "AAPL",
        type: "buy",
        date: 2000,
        quantity: 5,
        pricePerShare: 160,
        fees: 5,
      }, // Prev cost: 1510. New cost: (5 * 160) + 5 = 805. Total cost: 2315. Qty: 15. Avg: 2315 / 15 = 154.3333
    ];

    const result = recalculateHoldingFromTransactions(transactions);
    expect(result.quantity).toBe(15);
    expect(result.averagePrice).toBeCloseTo(154.3333, 4);
  });

  it("should handle buys without fees correctly", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "BBAS3", type: "buy", date: 1, quantity: 100, pricePerShare: 20 },
      { id: "2", ticker: "BBAS3", type: "buy", date: 2, quantity: 50, pricePerShare: 26 },
    ];
    // Cost: 2000 + 1300 = 3300. Qty = 150. Avg = 3300 / 150 = 22.
    const result = recalculateHoldingFromTransactions(transactions);
    expect(result.quantity).toBe(150);
    expect(result.averagePrice).toBe(22);
  });

  it("should not change average price on sell, only reduce quantity", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "ITSA4", type: "buy", date: 1, quantity: 100, pricePerShare: 10 },
      { id: "2", ticker: "ITSA4", type: "buy", date: 2, quantity: 100, pricePerShare: 12 },
      // Avg price here is 11, Qty 200
      { id: "3", ticker: "ITSA4", type: "sell", date: 3, quantity: 50, pricePerShare: 15 },
      // Qty should be 150, Avg price should still be 11
    ];

    const result = recalculateHoldingFromTransactions(transactions);
    expect(result.quantity).toBe(150);
    expect(result.averagePrice).toBe(11);
  });

  it("should reset average price to 0 when completely sold", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "O", type: "buy", date: 1, quantity: 10, pricePerShare: 50 },
      { id: "2", ticker: "O", type: "sell", date: 2, quantity: 10, pricePerShare: 60 },
    ];

    const result = recalculateHoldingFromTransactions(transactions);
    expect(result.quantity).toBe(0);
    expect(result.averagePrice).toBe(0);
  });

  it("should recalculate from scratch if buying after fully selling the position", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "WEGE3", type: "buy", date: 1, quantity: 100, pricePerShare: 30 },
      { id: "2", ticker: "WEGE3", type: "sell", date: 2, quantity: 100, pricePerShare: 35 },
      // Position is 0, average price is 0
      { id: "3", ticker: "WEGE3", type: "buy", date: 3, quantity: 200, pricePerShare: 40 },
    ];

    const result = recalculateHoldingFromTransactions(transactions);
    expect(result.quantity).toBe(200);
    expect(result.averagePrice).toBe(40);
  });
});

describe("getQuantityAtDate", () => {
  it("should calculate correct quantity at a specific historical date", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "VALE3", type: "buy", date: 100, quantity: 50, pricePerShare: 60 },
      { id: "2", ticker: "VALE3", type: "buy", date: 200, quantity: 50, pricePerShare: 65 },
      { id: "3", ticker: "VALE3", type: "sell", date: 300, quantity: 20, pricePerShare: 70 },
      { id: "4", ticker: "VALE3", type: "buy", date: 400, quantity: 10, pricePerShare: 75 },
    ];



    // Before any transactions
    expect(getQuantityAtDate(transactions, 50)).toBe(0);
    // After first buy
    expect(getQuantityAtDate(transactions, 150)).toBe(50);
    // Exactly at second buy
    expect(getQuantityAtDate(transactions, 200)).toBe(100);
    // After sell
    expect(getQuantityAtDate(transactions, 350)).toBe(80);
    // After final buy
    expect(getQuantityAtDate(transactions, 500)).toBe(90);
  });
});
