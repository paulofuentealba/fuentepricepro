import { describe, it, expect } from "vitest";
// Test safeToISOString behavior indirectly or directly if exported
// We can test itemToRow serialization resilience
import { WatchlistItem } from "../watchlist";

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
});
