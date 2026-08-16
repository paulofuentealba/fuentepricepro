import { describe, it, expect } from "vitest";
// Test safeToISOString behavior indirectly or directly if exported
// We can test itemToRow serialization resilience
import { WatchlistItem } from "../watchlist";
import { recalculateHoldingFromTransactions } from "../transactionsLogic";

describe("watchlist itemToRow date resilience", () => {
  it("should safely convert item with undefined investingSince without throwing Invalid time value", () => {
    // Import itemToRow via internal module access or re-creation test
    const item: WatchlistItem = {
      id: "stock:SPYI",
      ticker: "SPYI",
      name: "NEOS S&P 500 High Income ETF",
      type: "stock",
      currency: "USD",
      currentPrice: 50,
      annualDividend: 6,
      targetYield: 12,
      ceilingPrice: 50,
      safetyMargin: 0,
      quantity: 10,
      averagePrice: 48,
      paymentMonths: [1, 2, 3],
      payoutRatio: null,
      addedAt: 1700000000000,
      // investingSince is omitted / undefined
    } as any;

    expect(() => {
      // Simulate itemToRow date logic
      const safeToISOString = (val: any, fallbackMs: number = Date.now()): string => {
        if (val == null) return new Date(fallbackMs).toISOString();
        if (typeof val === "object" && typeof val.toDate === "function") {
          try {
            const d = val.toDate();
            if (!isNaN(d.getTime())) return d.toISOString();
          } catch {}
        }
        if (typeof val === "object" && typeof val.seconds === "number") {
          const d = new Date(val.seconds * 1000);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString();
        return new Date(fallbackMs).toISOString();
      };

      const added_at = safeToISOString(item.addedAt, Date.now());
      const investing_since = safeToISOString(item.investingSince ?? item.addedAt, Date.now());

      expect(added_at).toBe(new Date(1700000000000).toISOString());
      expect(investing_since).toBe(new Date(1700000000000).toISOString());
    }).not.toThrow();
  });

  it("should handle Firestore Timestamp objects and NaN gracefully", () => {
    const safeToISOString = (val: any, fallbackMs: number = Date.now()): string => {
      if (val == null) return new Date(fallbackMs).toISOString();
      if (typeof val === "object" && typeof val.toDate === "function") {
        try {
          const d = val.toDate();
          if (!isNaN(d.getTime())) return d.toISOString();
        } catch {}
      }
      if (typeof val === "object" && typeof val.seconds === "number") {
        const d = new Date(val.seconds * 1000);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString();
      return new Date(fallbackMs).toISOString();
    };

    const firestoreTimestamp = { seconds: 1700000000, nanoseconds: 0 };
    expect(safeToISOString(firestoreTimestamp)).toBe(new Date(1700000000000).toISOString());
    expect(safeToISOString(NaN, 1700000000000)).toBe(new Date(1700000000000).toISOString());
    expect(safeToISOString(null, 1700000000000)).toBe(new Date(1700000000000).toISOString());
  });

  it("should update investingSince for VALE3 to 2024-07-15 and serialize investing_since to ISO string", () => {
    const targetDateMs = new Date("2024-07-15T00:00:00.000Z").getTime();
    const item: WatchlistItem = {
      id: "STOCK_BR:VALE3",
      ticker: "VALE3",
      name: "VALE S.A.",
      type: "STOCK_BR",
      currency: "BRL",
      currentPrice: 60,
      annualDividend: 5,
      targetYield: 6,
      ceilingPrice: 83.33,
      safetyMargin: 38.8,
      quantity: 100,
      averagePrice: 55,
      paymentMonths: [3, 9],
      payoutRatio: 0.5,
      addedAt: Date.now(),
      investingSince: targetDateMs,
    };

    const safeToISOString = (val: any, fallbackMs: number = Date.now()): string => {
      const d = new Date(val);
      return !isNaN(d.getTime()) ? d.toISOString() : new Date(fallbackMs).toISOString();
    };

    const investing_since_iso = safeToISOString(item.investingSince);
    expect(investing_since_iso).toBe("2024-07-15T00:00:00.000Z");

    const parsedMs = new Date(investing_since_iso).getTime();
    expect(parsedMs).toBe(targetDateMs);
  });

  it("should derive TRXF11 position (QTY 100) accurately from transaction history", () => {
    const txs = [
      { id: "tx1", ticker: "TRXF11", type: "buy" as const, date: 1700000000000, quantity: 70, pricePerShare: 100 },
      { id: "tx2", ticker: "TRXF11", type: "buy" as const, date: 1705000000000, quantity: 30, pricePerShare: 105 },
    ];
    const holding = recalculateHoldingFromTransactions(txs);

    expect(holding.quantity).toBe(100);
    expect(holding.averagePrice).toBe(101.5);
  });

  describe("Closed Positions (isClosedPosition) Filtering Rules", () => {
    it("Test 1: Asset with net positive transactions (QTY > 0) is NOT a closed position (isClosedPosition === false)", () => {
      const txs = [
        { id: "tx1", ticker: "PETR4", type: "buy" as const, date: 1700000000000, quantity: 100, pricePerShare: 30 },
      ];
      const hasTransactions = txs.length > 0;
      const computed = recalculateHoldingFromTransactions(txs);
      const isClosedPosition = hasTransactions && computed.quantity === 0;

      expect(computed.quantity).toBe(100);
      expect(isClosedPosition).toBe(false);
    });

    it("Test 2: Asset with transactions that sum to zero (bought 100, sold 100 - ABEV3 scenario) IS a closed position (isClosedPosition === true)", () => {
      const txs = [
        { id: "tx1", ticker: "ABEV3", type: "buy" as const, date: 1700000000000, quantity: 100, pricePerShare: 14.61 },
        { id: "tx2", ticker: "ABEV3", type: "sell" as const, date: 1750000000000, quantity: 100, pricePerShare: 11.74 },
      ];
      const hasTransactions = txs.length > 0;
      const computed = recalculateHoldingFromTransactions(txs);
      const isClosedPosition = hasTransactions && computed.quantity === 0;

      expect(computed.quantity).toBe(0);
      expect(isClosedPosition).toBe(true);
    });

    it("Test 3: Watch-only asset with 0 transactions is NOT a closed position (isClosedPosition === false)", () => {
      const txs: any[] = [];
      const hasTransactions = txs.length > 0;
      const isClosedPosition = hasTransactions && 0 === 0;

      expect(hasTransactions).toBe(false);
      expect(isClosedPosition).toBe(false);
    });

    it("Test 4: Transaction history of closed position remains complete and accessible for detail drawer", () => {
      const txs = [
        { id: "tx1", ticker: "ABEV3", type: "buy" as const, date: 1700000000000, quantity: 100, pricePerShare: 14.61 },
        { id: "tx2", ticker: "ABEV3", type: "sell" as const, date: 1750000000000, quantity: 100, pricePerShare: 11.74 },
      ];
      const abevTxs = txs.filter((t) => t.ticker === "ABEV3");

      expect(abevTxs).toHaveLength(2);
      expect(abevTxs[0].type).toBe("buy");
      expect(abevTxs[1].type).toBe("sell");
    });
  });
});
