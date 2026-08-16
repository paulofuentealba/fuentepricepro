import { describe, it, expect } from "vitest";
import {
  calculateConsolidatedPosition,
  reconcileAllPositions,
} from "../api/positions.server";
import { recalculateHoldingFromTransactions, type Transaction } from "../transactionsLogic";

describe("positions.server - Read Model Consolidation & Reconciliation", () => {
  it("should be strictly idempotent (running multiple times produces bit-identical results)", () => {
    const txs: Transaction[] = [
      { id: "1", ticker: "PETR4", type: "buy", date: 1700000000000, quantity: 100, pricePerShare: 30.0 },
      { id: "2", ticker: "PETR4", type: "buy", date: 1705000000000, quantity: 50, pricePerShare: 36.0 },
      { id: "3", ticker: "PETR4", type: "sell", date: 1710000000000, quantity: 30, pricePerShare: 40.0 },
    ];

    const timestamp = 1715000000000;
    const run1 = calculateConsolidatedPosition("PETR4", txs, timestamp);
    const run2 = calculateConsolidatedPosition("PETR4", txs, timestamp);

    expect(run1).toEqual(run2);
    expect(run1.quantity).toBe(120);
    expect(run1.averageCost).toBe(32.0);
    expect(run1.totalInvested).toBe(120 * 32.0);
    expect(run1.firstBuyDate).toBe(1700000000000);
    expect(run1.lastBuyDate).toBe(1710000000000);
    expect(run1.isClosed).toBe(false);
  });

  it("should match recalculateHoldingFromTransactions exactly across 1,000+ synthetic transactions", () => {
    const tickers = ["PETR4", "VALE3", "BBSE3", "ITUB4", "WEGE3", "HGLG11", "KNIP11", "AAPL", "MSFT", "O"];
    const allSyntheticTxs: Transaction[] = [];

    let txCounter = 0;
    const baseDate = 1600000000000; // Sept 2020

    // Generate 1,200 realistic transactions (120 per ticker)
    for (const ticker of tickers) {
      let runningQty = 0;
      let currentPrice = ticker.includes("11") ? 100.0 : ticker.length === 4 && !ticker.includes("11") ? 150.0 : 30.0;

      for (let i = 0; i < 120; i++) {
        txCounter++;
        const date = baseDate + txCounter * 86400000 * 2; // every 2 days
        const isSell = runningQty > 20 && Math.random() < 0.25;
        const isCorporateAction = runningQty > 10 && i === 60; // 1 split event per ticker

        if (isCorporateAction) {
          allSyntheticTxs.push({
            id: `tx_${txCounter}`,
            ticker,
            type: "corporate_action",
            date,
            quantity: 0,
            pricePerShare: 0,
            factor: 2.0, // 2-for-1 split
          });
          runningQty *= 2;
        } else if (isSell) {
          const qtyToSell = Math.min(runningQty, Math.floor(Math.random() * 15) + 1);
          allSyntheticTxs.push({
            id: `tx_${txCounter}`,
            ticker,
            type: "sell",
            date,
            quantity: qtyToSell,
            pricePerShare: currentPrice * (1 + (Math.random() * 0.1 - 0.05)),
          });
          runningQty -= qtyToSell;
        } else {
          const qtyToBuy = Math.floor(Math.random() * 20) + 1;
          const price = currentPrice * (1 + (Math.random() * 0.1 - 0.05));
          allSyntheticTxs.push({
            id: `tx_${txCounter}`,
            ticker,
            type: "buy",
            date,
            quantity: qtyToBuy,
            pricePerShare: price,
            fees: Number((Math.random() * 2).toFixed(2)),
          });
          runningQty += qtyToBuy;
        }
      }
    }

    expect(allSyntheticTxs.length).toBe(1200);

    // Reconcile all positions using the read model service
    const reconciledMap = reconcileAllPositions(allSyntheticTxs);

    // Verify 0 divergences for every ticker
    for (const ticker of tickers) {
      const tickerTxs = allSyntheticTxs.filter((t) => t.ticker === ticker);
      const directHolding = recalculateHoldingFromTransactions(tickerTxs);
      const position = reconciledMap.get(ticker);

      expect(position).toBeDefined();
      expect(position!.quantity).toBe(directHolding.quantity);
      expect(position!.averageCost).toBe(directHolding.averagePrice);

      if (directHolding.quantity > 0) {
        expect(position!.isClosed).toBe(false);
        expect(position!.totalInvested).toBeCloseTo(directHolding.quantity * directHolding.averagePrice, 4);
      } else {
        expect(position!.isClosed).toBe(true);
        expect(position!.totalInvested).toBe(0);
      }
    }
  });

  it("should handle fully closed and re-opened positions cleanly", () => {
    const txs: Transaction[] = [
      { id: "1", ticker: "TAEE11", type: "buy", date: 1000, quantity: 100, pricePerShare: 35.0 },
      { id: "2", ticker: "TAEE11", type: "sell", date: 2000, quantity: 100, pricePerShare: 40.0 }, // Closed
      { id: "3", ticker: "TAEE11", type: "buy", date: 3000, quantity: 50, pricePerShare: 33.0 }, // Reopened
    ];

    const pos = calculateConsolidatedPosition("TAEE11", txs);
    expect(pos.quantity).toBe(50);
    expect(pos.averageCost).toBe(33.0);
    expect(pos.isClosed).toBe(false);
    expect(pos.firstBuyDate).toBe(1000);
    expect(pos.lastBuyDate).toBe(3000);
  });
});
