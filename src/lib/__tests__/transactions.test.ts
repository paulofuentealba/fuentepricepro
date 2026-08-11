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

describe("Synthetic transaction emission on manual position edit (EditItemDialog / handleDialogSave)", () => {
  function processManualEdit(
    editing: { ticker: string; quantity: number; averagePrice: number; investingSince?: number; currentPrice: number },
    patch: { quantity?: number; averagePrice?: number; investingSince?: number },
    existingTxs: Transaction[],
    manualNote: string = "Ajuste manual de posição"
  ): Transaction[] {
    const targetQty = patch.quantity ?? editing.quantity;
    const targetAvgPrice = patch.averagePrice ?? editing.averagePrice;
    const workingTxs = [...existingTxs];

    if (targetQty != null && targetQty >= 0) {
      const existingAssetTxs = workingTxs.filter((tx) => tx.ticker === editing.ticker);
      const currentHolding = recalculateHoldingFromTransactions(existingAssetTxs);
      const currentQty = currentHolding.quantity;
      const currentAvgPrice = currentHolding.averagePrice;

      const delta = targetQty - currentQty;
      const txTimestamp = 1700000000000;

      if (existingAssetTxs.length === 0 && targetQty > 0) {
        const txDate = patch.investingSince ?? editing.investingSince ?? txTimestamp;
        workingTxs.push({
          id: `tx-manual-${editing.ticker}-${txTimestamp}`,
          ticker: editing.ticker,
          type: "buy",
          date: txDate,
          quantity: targetQty,
          pricePerShare: targetAvgPrice && targetAvgPrice > 0 ? targetAvgPrice : editing.currentPrice,
          fees: null,
          notes: manualNote,
        });
      } else if (delta > 0) {
        const targetTotalCost = targetQty * (targetAvgPrice && targetAvgPrice > 0 ? targetAvgPrice : currentAvgPrice);
        const currentTotalCost = currentQty * currentAvgPrice;
        const requiredCostForDelta = targetTotalCost - currentTotalCost;
        const pricePerShare = requiredCostForDelta > 0 ? requiredCostForDelta / delta : (targetAvgPrice || currentAvgPrice);
        const buyPrice = pricePerShare > 0 ? pricePerShare : (targetAvgPrice || currentAvgPrice);

        workingTxs.push({
          id: `tx-manual-${editing.ticker}-${txTimestamp}`,
          ticker: editing.ticker,
          type: "buy",
          date: txTimestamp,
          quantity: delta,
          pricePerShare: buyPrice,
          fees: null,
          notes: manualNote,
        });
      } else if (delta < 0) {
        const absDelta = Math.abs(delta);
        const sellPrice = targetAvgPrice && targetAvgPrice > 0 ? targetAvgPrice : currentAvgPrice;
        workingTxs.push({
          id: `tx-manual-${editing.ticker}-${txTimestamp}`,
          ticker: editing.ticker,
          type: "sell",
          date: txTimestamp,
          quantity: absDelta,
          pricePerShare: sellPrice,
          fees: null,
          notes: manualNote,
        });
      }
    }
    return workingTxs;
  }

  it("emits a synthetic buy transaction when quantity is increased manually", () => {
    const initialTxs: Transaction[] = [
      { id: "tx1", ticker: "PETR4", type: "buy", date: 1000, quantity: 100, pricePerShare: 30 },
    ];
    const editing = { ticker: "PETR4", quantity: 100, averagePrice: 30, currentPrice: 35 };
    const patch = { quantity: 150, averagePrice: 32 };

    const updatedTxs = processManualEdit(editing, patch, initialTxs);

    expect(updatedTxs).toHaveLength(2);
    const syntheticTx = updatedTxs[1];
    expect(syntheticTx.type).toBe("buy");
    expect(syntheticTx.quantity).toBe(50);
    expect(syntheticTx.notes).toBe("Ajuste manual de posição");

    // Target total cost: 150 * 32 = 4800. Initial cost: 100 * 30 = 3000. Delta cost: 1800 / 50 = 36.
    expect(syntheticTx.pricePerShare).toBe(36);

    const finalHolding = recalculateHoldingFromTransactions(updatedTxs);
    expect(finalHolding.quantity).toBe(150);
    expect(finalHolding.averagePrice).toBeCloseTo(32, 2);
  });

  it("emits a synthetic sell transaction when quantity is decreased manually", () => {
    const initialTxs: Transaction[] = [
      { id: "tx1", ticker: "VALE3", type: "buy", date: 1000, quantity: 200, pricePerShare: 60 },
    ];
    const editing = { ticker: "VALE3", quantity: 200, averagePrice: 60, currentPrice: 65 };
    const patch = { quantity: 120 };

    const updatedTxs = processManualEdit(editing, patch, initialTxs);

    expect(updatedTxs).toHaveLength(2);
    const syntheticTx = updatedTxs[1];
    expect(syntheticTx.type).toBe("sell");
    expect(syntheticTx.quantity).toBe(80);
    expect(syntheticTx.notes).toBe("Ajuste manual de posição");

    const finalHolding = recalculateHoldingFromTransactions(updatedTxs);
    expect(finalHolding.quantity).toBe(120);
    expect(finalHolding.averagePrice).toBe(60);
  });

  it("creates initial buy transaction when asset has 0 prior transactions", () => {
    const editing = { ticker: "WEGE3", quantity: 0, averagePrice: 0, currentPrice: 40 };
    const patch = { quantity: 50, averagePrice: 42 };

    const updatedTxs = processManualEdit(editing, patch, []);

    expect(updatedTxs).toHaveLength(1);
    expect(updatedTxs[0].type).toBe("buy");
    expect(updatedTxs[0].quantity).toBe(50);
    expect(updatedTxs[0].pricePerShare).toBe(42);

    const finalHolding = recalculateHoldingFromTransactions(updatedTxs);
    expect(finalHolding.quantity).toBe(50);
    expect(finalHolding.averagePrice).toBe(42);
  });
});

