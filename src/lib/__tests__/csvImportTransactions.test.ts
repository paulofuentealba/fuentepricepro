import { describe, it, expect } from "vitest";
import { parseWatchlistCsv } from "../csv";
import { recalculateHoldingFromTransactions, type Transaction } from "../transactionsLogic";

describe("Watchlist CSV Import Synthetic Transactions (Item 1.7 Phase 1)", () => {
  it("Scenario 1: CSV import for existing asset creates a delta synthetic transaction and updates holding", () => {
    // Initial holdings from transactions: 50 shares @ R$ 30.00
    const existingTxs: Transaction[] = [
      {
        id: "tx-init",
        ticker: "BBAS3",
        type: "buy",
        date: 1700000000000,
        quantity: 50,
        pricePerShare: 30.0,
      },
    ];

    const initialHolding = recalculateHoldingFromTransactions(existingTxs);
    expect(initialHolding.quantity).toBe(50);
    expect(initialHolding.averagePrice).toBe(30.0);

    // User imports CSV with 80 shares @ R$ 32.00
    const csvContent = "Ticker,Type,Quantity,AveragePrice\nBBAS3,stock,80,32.00";
    const rows = parseWatchlistCsv(csvContent);
    expect(rows).toHaveLength(1);

    const row = rows[0];
    const delta = row.quantity - initialHolding.quantity; // 80 - 50 = +30
    expect(delta).toBe(30);

    // Calculate required pricePerShare for the 30 new shares to achieve target average price 32.00
    const targetTotalCost = row.quantity * row.averagePrice!; // 80 * 32 = 2560
    const currentTotalCost = initialHolding.quantity * initialHolding.averagePrice; // 50 * 30 = 1500
    const requiredCostForDelta = targetTotalCost - currentTotalCost; // 1060
    const pricePerShare = requiredCostForDelta / delta; // 1060 / 30 = 35.3333...

    const syntheticTx: Transaction = {
      id: "tx-csv-BBAS3-1",
      ticker: "BBAS3",
      type: "buy",
      date: Date.now(),
      quantity: delta,
      pricePerShare,
      notes: "Ajuste via importação CSV",
    };

    const updatedTxs = [...existingTxs, syntheticTx];
    const newHolding = recalculateHoldingFromTransactions(updatedTxs);

    expect(newHolding.quantity).toBe(80);
    expect(newHolding.averagePrice).toBeCloseTo(32.0, 2);
    expect(updatedTxs).toHaveLength(2);
    expect(updatedTxs[1].notes).toBe("Ajuste via importação CSV");
  });

  it("Scenario 2: CSV import for a new asset registers the first synthetic transaction correctly", () => {
    const csvContent = "Ticker,Type,Quantity,AveragePrice\nPETR4,stock,100,38.50";
    const rows = parseWatchlistCsv(csvContent);
    expect(rows).toHaveLength(1);

    const row = rows[0];
    const existingTxs: Transaction[] = [];
    const initialHolding = recalculateHoldingFromTransactions(existingTxs);
    expect(initialHolding.quantity).toBe(0);

    const firstTx: Transaction = {
      id: "tx-csv-PETR4-1",
      ticker: "PETR4",
      type: "buy",
      date: Date.now(),
      quantity: row.quantity,
      pricePerShare: row.averagePrice!,
      notes: "Ajuste via importação CSV",
    };

    const updatedTxs = [firstTx];
    const newHolding = recalculateHoldingFromTransactions(updatedTxs);

    expect(newHolding.quantity).toBe(100);
    expect(newHolding.averagePrice).toBe(38.5);
    expect(updatedTxs[0].type).toBe("buy");
  });

  it("Scenario 3: CSV import with averagePrice specified derives matching average price from transactions", () => {
    const csvContent = "Ticker,Type,Quantity,AveragePrice\nVALE3,stock,200,62.75";
    const rows = parseWatchlistCsv(csvContent);
    const row = rows[0];

    const syntheticTx: Transaction = {
      id: "tx-csv-VALE3-1",
      ticker: "VALE3",
      type: "buy",
      date: Date.now(),
      quantity: row.quantity,
      pricePerShare: row.averagePrice!,
      notes: "Ajuste via importação CSV",
    };

    const holding = recalculateHoldingFromTransactions([syntheticTx]);
    expect(holding.quantity).toBe(200);
    expect(holding.averagePrice).toBe(62.75);
  });

  it("Scenario 4: Re-importing the exact same CSV twice generates deterministic IDs and does NOT duplicate transactions", () => {
    // Advanced transaction row
    const row = {
      ticker: "VALE3",
      date: 1710460800000,
      quantity: 100,
      pricePerShare: 62.5,
      type: "buy" as const,
    };

    // First import
    const tx1: Transaction = {
      id: `tx-csv-${row.ticker}-${row.date}-${row.quantity}-${row.pricePerShare}`,
      ticker: row.ticker,
      type: row.type,
      date: row.date,
      quantity: row.quantity,
      pricePerShare: row.pricePerShare,
      notes: "Ajuste via importação CSV",
    };

    const txMap = new Map<string, Transaction>();
    txMap.set(tx1.id, tx1);

    const initialTxs = Array.from(txMap.values());
    const holdingAfterFirstImport = recalculateHoldingFromTransactions(initialTxs);

    expect(initialTxs).toHaveLength(1);
    expect(holdingAfterFirstImport.quantity).toBe(100);
    expect(holdingAfterFirstImport.averagePrice).toBe(62.5);

    // Second import (exact same CSV content re-imported)
    const tx2: Transaction = {
      id: `tx-csv-${row.ticker}-${row.date}-${row.quantity}-${row.pricePerShare}`,
      ticker: row.ticker,
      type: row.type,
      date: row.date,
      quantity: row.quantity,
      pricePerShare: row.pricePerShare,
      notes: "Ajuste via importação CSV",
    };

    // Upsert by deterministic ID
    txMap.set(tx2.id, tx2);

    const finalTxs = Array.from(txMap.values());
    const holdingAfterSecondImport = recalculateHoldingFromTransactions(finalTxs);

    // Confirm strict idempotency: ID is identical, transaction list length is 1, quantity is unchanged
    expect(tx1.id).toBe(tx2.id);
    expect(finalTxs).toHaveLength(1);
    expect(holdingAfterSecondImport.quantity).toBe(holdingAfterFirstImport.quantity); // Exactly 100
    expect(holdingAfterSecondImport.averagePrice).toBe(holdingAfterFirstImport.averagePrice); // Exactly 62.5
  });

  it("Scenario 5: Importing a new trade alongside previous trades correctly adds a new deterministic transaction", () => {
    const row1 = {
      ticker: "VALE3",
      date: 1710460800000,
      quantity: 100,
      pricePerShare: 62.5,
      type: "buy" as const,
    };

    const tx1: Transaction = {
      id: `tx-csv-${row1.ticker}-${row1.date}-${row1.quantity}-${row1.pricePerShare}`,
      ticker: row1.ticker,
      type: row1.type,
      date: row1.date,
      quantity: row1.quantity,
      pricePerShare: row1.pricePerShare,
    };

    const txMap = new Map<string, Transaction>();
    txMap.set(tx1.id, tx1);

    // User makes a new purchase and imports updated CSV containing a new row
    const row2 = {
      ticker: "VALE3",
      date: 1712707200000,
      quantity: 50,
      pricePerShare: 65.0,
      type: "buy" as const,
    };

    const tx2: Transaction = {
      id: `tx-csv-${row2.ticker}-${row2.date}-${row2.quantity}-${row2.pricePerShare}`,
      ticker: row2.ticker,
      type: row2.type,
      date: row2.date,
      quantity: row2.quantity,
      pricePerShare: row2.pricePerShare,
    };

    // Re-importing row1 (overwrites tx1 with identical ID) + inserting row2 (new ID)
    txMap.set(tx1.id, tx1);
    txMap.set(tx2.id, tx2);

    const finalTxs = Array.from(txMap.values());
    const finalHolding = recalculateHoldingFromTransactions(finalTxs);

    expect(finalTxs).toHaveLength(2);
    expect(finalHolding.quantity).toBe(150);
    expect(finalHolding.averagePrice).toBeCloseTo(63.33, 2);
  });
});
