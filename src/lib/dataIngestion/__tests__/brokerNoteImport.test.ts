import { describe, it, expect } from "vitest";
import { consolidateTradesToWatchlistItems } from "../brokerNoteImport";
import type { WatchlistItem } from "@/lib/watchlist";

describe("consolidateTradesToWatchlistItems — broker persistence", () => {
  const trade = { ticker: "BBAS3", quantity: 100, price: 25.5, date: "01/06/2024" };

  it("sets broker from the label map when detectedBroker is provided", () => {
    const items = consolidateTradesToWatchlistItems([trade], [], [], {}, "BTG");
    expect(items).toHaveLength(1);
    expect(items[0].broker).toBe("BTG Pactual");
  });

  it("sets broker to null when detectedBroker is omitted", () => {
    const items = consolidateTradesToWatchlistItems([trade], [], []);
    expect(items).toHaveLength(1);
    expect(items[0].broker).toBeNull();
  });
});

describe("consolidateTradesToWatchlistItems — preserving customizations on re-import (Item 5)", () => {
  const trade = { ticker: "BBAS3", quantity: 100, price: 25.5, date: "01/06/2024" };

  // Regression for the bug where re-importing a PDF for an already-watchlisted ticker
  // silently wiped targetYield/payoutRatio/customTaxRate/targetMonthlyIncome back to
  // their defaults, because the payload always included these keys and Firestore's
  // `merge: true` overwrites fields present in the payload even when null.
  const existing: WatchlistItem = {
    id: "STOCK_BR:BBAS3",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 25,
    annualDividend: 2,
    targetYield: 8,
    ceilingPrice: 0,
    safetyMargin: 0,
    quantity: 50,
    averagePrice: 20,
    paymentMonths: [],
    targetMonthlyIncome: 500,
    payoutRatio: 45,
    customTaxRate: 12,
    sector: "Financeiro",
    broker: "XP",
    addedAt: 1700000000000,
    investingSince: 1600000000000,
  };

  it("preserves targetYield, payoutRatio, customTaxRate and targetMonthlyIncome from the existing watchlist item", () => {
    const items = consolidateTradesToWatchlistItems([trade], [], [], {}, undefined, [existing]);
    expect(items).toHaveLength(1);
    expect(items[0].targetYield).toBe(8);
    expect(items[0].payoutRatio).toBe(45);
    expect(items[0].customTaxRate).toBe(12);
    expect(items[0].targetMonthlyIncome).toBe(500);
    expect(items[0].sector).toBe("Financeiro");
  });

  it("falls back to defaults (6, null, null, null) when there is no existing watchlist item", () => {
    const items = consolidateTradesToWatchlistItems([trade], [], [], {}, undefined, []);
    expect(items).toHaveLength(1);
    expect(items[0].targetYield).toBe(6);
    expect(items[0].payoutRatio).toBeNull();
    expect(items[0].customTaxRate).toBeNull();
    expect(items[0].targetMonthlyIncome).toBeNull();
  });

  it("does not let an existing item for a different ticker leak into an unrelated import", () => {
    const otherTicker: WatchlistItem = { ...existing, id: "STOCK_BR:PETR4", ticker: "PETR4" };
    const items = consolidateTradesToWatchlistItems([trade], [], [], {}, undefined, [otherTicker]);
    expect(items).toHaveLength(1);
    expect(items[0].targetYield).toBe(6);
    expect(items[0].payoutRatio).toBeNull();
  });
});
