import { describe, it, expect } from "vitest";
import { calculateRealizedGains } from "../capitalGains";
import { type Transaction } from "@/lib/transactions";

describe("calculateRealizedGains (Prompt 139 / Item 2.1b)", () => {
  it("calculates gain correctly for a single buy followed by a partial sell", () => {
    // Buy 100 shares at R$ 30, with R$ 10 in fees -> avgPrice = 3010 / 100 = 30.10
    // Sell 40 shares at R$ 35, with R$ 5 in fees
    // proceeds = (35 * 40) - 5 = 1395
    // costBasis = 30.10 * 40 = 1204
    // gain = 1395 - 1204 = 191
    const txs: Transaction[] = [
      {
        id: "tx1",
        ticker: "PETR4",
        type: "buy",
        date: 1000,
        quantity: 100,
        pricePerShare: 30,
        fees: 10,
      },
      {
        id: "tx2",
        ticker: "PETR4",
        type: "sell",
        date: 2000,
        quantity: 40,
        pricePerShare: 35,
        fees: 5,
      },
    ];

    const events = calculateRealizedGains(txs, "STOCK_BR");
    expect(events).toHaveLength(1);

    const ev = events[0];
    expect(ev.ticker).toBe("PETR4");
    expect(ev.saleDate).toBe(2000);
    expect(ev.quantity).toBe(40);
    expect(ev.salePrice).toBe(35);
    expect(ev.proceeds).toBe(1395);
    expect(ev.costBasis).toBeCloseTo(1204, 2);
    expect(ev.gain).toBeCloseTo(191, 2);
    expect(ev.fees).toBe(5);
  });

  it("calculates gain correctly for multiple buys with weighted average price", () => {
    // Buy 1: 100 at R$ 20 (fees 0) -> total: 2000, qty: 100
    // Buy 2: 100 at R$ 30 (fees 0) -> total: 2000 + 3000 = 5000, qty: 200 -> avgPrice = 25.00
    // Sell: 50 at R$ 40 (fees 0)
    // proceeds = 50 * 40 = 2000
    // costBasis = 50 * 25.00 = 1250
    // gain = 2000 - 1250 = 750
    const txs: Transaction[] = [
      {
        id: "tx1",
        ticker: "VALE3",
        type: "buy",
        date: 1000,
        quantity: 100,
        pricePerShare: 20,
      },
      {
        id: "tx2",
        ticker: "VALE3",
        type: "buy",
        date: 2000,
        quantity: 100,
        pricePerShare: 30,
      },
      {
        id: "tx3",
        ticker: "VALE3",
        type: "sell",
        date: 3000,
        quantity: 50,
        pricePerShare: 40,
      },
    ];

    const events = calculateRealizedGains(txs, "STOCK_BR");
    expect(events).toHaveLength(1);
    expect(events[0].proceeds).toBe(2000);
    expect(events[0].costBasis).toBe(1250);
    expect(events[0].gain).toBe(750);
  });

  it("calculates negative gain (loss) when sold below cost basis", () => {
    // Buy: 100 at R$ 50 (fees 0) -> avgPrice = 50.00
    // Sell: 50 at R$ 35 (fees 10)
    // proceeds = (50 * 35) - 10 = 1740
    // costBasis = 50 * 50 = 2500
    // gain = 1740 - 2500 = -760 (loss)
    const txs: Transaction[] = [
      {
        id: "tx1",
        ticker: "BBAS3",
        type: "buy",
        date: 1000,
        quantity: 100,
        pricePerShare: 50,
      },
      {
        id: "tx2",
        ticker: "BBAS3",
        type: "sell",
        date: 2000,
        quantity: 50,
        pricePerShare: 35,
        fees: 10,
      },
    ];

    const events = calculateRealizedGains(txs, "STOCK_BR");
    expect(events).toHaveLength(1);
    expect(events[0].proceeds).toBe(1740);
    expect(events[0].costBasis).toBe(2500);
    expect(events[0].gain).toBe(-760);
  });

  it("adjusts cost basis proportionally after a corporate action (split 1:2)", () => {
    // Buy: 100 at R$ 60 (fees 0) -> avgPrice = 60.00, qty = 100
    // Split: factor = 2 -> qty = 200, avgPrice = 30.00
    // Sell: 50 at R$ 35 (fees 0)
    // proceeds = 50 * 35 = 1750
    // costBasis = 50 * 30.00 = 1500
    // gain = 1750 - 1500 = 250
    const txs: Transaction[] = [
      {
        id: "tx1",
        ticker: "WEGE3",
        type: "buy",
        date: 1000,
        quantity: 100,
        pricePerShare: 60,
      },
      {
        id: "tx2",
        ticker: "WEGE3",
        type: "corporate_action",
        date: 2000,
        quantity: 0,
        pricePerShare: 0,
        factor: 2,
      },
      {
        id: "tx3",
        ticker: "WEGE3",
        type: "sell",
        date: 3000,
        quantity: 50,
        pricePerShare: 35,
      },
    ];

    const events = calculateRealizedGains(txs, "STOCK_BR");
    expect(events).toHaveLength(1);
    expect(events[0].proceeds).toBe(1750);
    expect(events[0].costBasis).toBe(1500);
    expect(events[0].gain).toBe(250);
  });

  it("handles out-of-order input transactions identically to sorted input", () => {
    const tx1: Transaction = {
      id: "tx1",
      ticker: "ITUB4",
      type: "buy",
      date: 1000,
      quantity: 100,
      pricePerShare: 20,
    };
    const tx2: Transaction = {
      id: "tx2",
      ticker: "ITUB4",
      type: "buy",
      date: 2000,
      quantity: 100,
      pricePerShare: 30,
    };
    const tx3: Transaction = {
      id: "tx3",
      ticker: "ITUB4",
      type: "sell",
      date: 3000,
      quantity: 100,
      pricePerShare: 35,
    };

    const inOrderEvents = calculateRealizedGains([tx1, tx2, tx3], "STOCK_BR");
    const outOfOrderEvents = calculateRealizedGains([tx3, tx1, tx2], "STOCK_BR");

    expect(outOfOrderEvents).toEqual(inOrderEvents);
  });

  it("calculates sequential sales capturing averagePrice at the exact moment of each sale", () => {
    // Buy 1: 100 at R$ 20 -> avgPrice = 20
    // Sell 1: 50 at R$ 30 -> costBasis = 50 * 20 = 1000, gain = 1500 - 1000 = 500 (remaining: 50 at R$ 20)
    // Buy 2: 50 at R$ 40 -> total cost = (50*20) + (50*40) = 3000, qty = 100 -> new avgPrice = 30
    // Sell 2: 50 at R$ 50 -> costBasis = 50 * 30 = 1500, gain = 2500 - 1500 = 1000
    const txs: Transaction[] = [
      { id: "tx1", ticker: "BBDC4", type: "buy", date: 1000, quantity: 100, pricePerShare: 20 },
      { id: "tx2", ticker: "BBDC4", type: "sell", date: 2000, quantity: 50, pricePerShare: 30 },
      { id: "tx3", ticker: "BBDC4", type: "buy", date: 3000, quantity: 50, pricePerShare: 40 },
      { id: "tx4", ticker: "BBDC4", type: "sell", date: 4000, quantity: 50, pricePerShare: 50 },
    ];

    const events = calculateRealizedGains(txs, "STOCK_BR");
    expect(events).toHaveLength(2);

    expect(events[0].saleDate).toBe(2000);
    expect(events[0].costBasis).toBe(1000);
    expect(events[0].proceeds).toBe(1500);
    expect(events[0].gain).toBe(500);

    expect(events[1].saleDate).toBe(4000);
    expect(events[1].costBasis).toBe(1500);
    expect(events[1].proceeds).toBe(2500);
    expect(events[1].gain).toBe(1000);
  });

  it("CRITICAL: when sale fully closes position (quantity reaches 0), costBasis uses averagePrice BEFORE closing", () => {
    // Buy: 100 at R$ 42.50 (fees R$ 10) -> totalCost = 4260, avgPrice = 42.60
    // Sell: 100 at R$ 50.00 (fees R$ 15) -> closes position completely
    // Hand-calculated expected values:
    // proceeds = (100 * 50) - 15 = 4985.00
    // costBasis = 42.60 * 100 = 4260.00 (NOT 0!)
    // gain = 4985 - 4260 = 725.00
    const txs: Transaction[] = [
      {
        id: "tx1",
        ticker: "EGIE3",
        type: "buy",
        date: 1000,
        quantity: 100,
        pricePerShare: 42.5,
        fees: 10,
      },
      {
        id: "tx2",
        ticker: "EGIE3",
        type: "sell",
        date: 2000,
        quantity: 100,
        pricePerShare: 50.0,
        fees: 15,
      },
    ];

    const events = calculateRealizedGains(txs, "STOCK_BR");
    expect(events).toHaveLength(1);

    const ev = events[0];
    expect(ev.ticker).toBe("EGIE3");
    expect(ev.quantity).toBe(100);
    expect(ev.salePrice).toBe(50.0);
    expect(ev.proceeds).toBe(4985);
    expect(ev.costBasis).toBe(4260); // Must be exactly R$ 4,260.00, NOT 0
    expect(ev.gain).toBe(725);
  });

  it("returns an empty array when there are no sales in the transaction list", () => {
    const txs: Transaction[] = [
      { id: "tx1", ticker: "PETR4", type: "buy", date: 1000, quantity: 100, pricePerShare: 30 },
      { id: "tx2", ticker: "VALE3", type: "buy", date: 2000, quantity: 200, pricePerShare: 60 },
    ];

    expect(calculateRealizedGains(txs, "STOCK_BR")).toEqual([]);
    expect(calculateRealizedGains([])).toEqual([]);
  });

  it("supports multi-ticker transaction arrays without cross-ticker holding contamination", () => {
    const txs: Transaction[] = [
      { id: "tx1", ticker: "PETR4", type: "buy", date: 1000, quantity: 100, pricePerShare: 30 },
      { id: "tx2", ticker: "VALE3", type: "buy", date: 2000, quantity: 100, pricePerShare: 60 },
      { id: "tx3", ticker: "PETR4", type: "sell", date: 3000, quantity: 50, pricePerShare: 40 },
      { id: "tx4", ticker: "VALE3", type: "sell", date: 4000, quantity: 50, pricePerShare: 80 },
    ];

    const events = calculateRealizedGains(txs, "STOCK_BR");
    expect(events).toHaveLength(2);

    expect(events[0].ticker).toBe("PETR4");
    expect(events[0].costBasis).toBe(1500); // 50 * 30
    expect(events[0].gain).toBe(500);       // 2000 - 1500

    expect(events[1].ticker).toBe("VALE3");
    expect(events[1].costBasis).toBe(3000); // 50 * 60
    expect(events[1].gain).toBe(1000);      // 4000 - 3000
  });

  it("is pure and idempotent across consecutive executions", () => {
    const txs: Transaction[] = [
      { id: "tx1", ticker: "TAEE11", type: "buy", date: 1000, quantity: 100, pricePerShare: 35 },
      { id: "tx2", ticker: "TAEE11", type: "sell", date: 2000, quantity: 50, pricePerShare: 40 },
    ];

    const run1 = calculateRealizedGains(txs, "STOCK_BR");
    const run2 = calculateRealizedGains(txs, "STOCK_BR");

    expect(run1).toEqual(run2);
  });
});
