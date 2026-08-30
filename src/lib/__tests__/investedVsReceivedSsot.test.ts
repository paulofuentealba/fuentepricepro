import { describe, it, expect } from "vitest";
import { computeInvestedVsReceived } from "../cashflow";
import type { WatchlistItem } from "../watchlist";
import type { DividendEvent } from "../domain";
import type { Transaction } from "../transactions";

function createItem(overrides: Partial<WatchlistItem>): WatchlistItem {
  return {
    id: overrides.ticker ?? "AFHI11",
    ticker: overrides.ticker ?? "AFHI11",
    name: "Test Asset",
    type: overrides.type ?? "FII",
    currency: overrides.currency ?? "BRL",
    currentPrice: 100,
    annualDividend: 12,
    targetYield: 6,
    ceilingPrice: 200,
    safetyMargin: 50,
    quantity: overrides.quantity ?? 100,
    averagePrice: overrides.averagePrice ?? 95,
    paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    payoutRatio: null,
    customTaxRate: overrides.customTaxRate ?? null,
    sector: "Real Estate",
    addedAt: overrides.addedAt ?? new Date("2024-01-01").getTime(),
    investingSince: overrides.investingSince ?? new Date("2024-01-01").getTime(),
    ...overrides,
  };
}

describe("computeInvestedVsReceived SSOT parity with calculateRealizedIncome", () => {
  it("calculates FII dividends accurately (tax-exempt, amountNet == amountGross)", () => {
    const item = createItem({ ticker: "AFHI11", type: "FII", quantity: 100, averagePrice: 100 });
    const events: DividendEvent[] = [
      { exDate: "2024-05-15", paymentDate: "2024-05-22", amountPerShare: 1.0, isJCP: false },
      { exDate: "2024-06-15", paymentDate: "2024-06-22", amountPerShare: 1.2, isJCP: false },
    ];
    const txs: Transaction[] = [
      {
        id: "tx-1",
        ticker: "AFHI11",
        type: "buy",
        date: new Date("2024-01-10").getTime(),
        quantity: 100,
        pricePerShare: 100,
        fees: 0,
        notes: "",
      },
    ];

    const result = computeInvestedVsReceived([item], { AFHI11: events }, txs);

    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("AFHI11");
    expect(result[0].invested).toBe(10000); // 100 * 100
    // 100 * 1.00 + 100 * 1.20 = 220.00 (FII has 0% tax)
    expect(result[0].received).toBe(220);
  });

  it("calculates Brazilian Stock JCP dividends with 15% WHT deducted", () => {
    const item = createItem({ ticker: "BBAS3", type: "STOCK_BR", quantity: 200, averagePrice: 25 });
    const events: DividendEvent[] = [
      { exDate: "2024-05-15", paymentDate: "2024-05-22", amountPerShare: 1.0, isJCP: true },
    ];
    const txs: Transaction[] = [
      {
        id: "tx-1",
        ticker: "BBAS3",
        type: "buy",
        date: new Date("2024-01-10").getTime(),
        quantity: 200,
        pricePerShare: 25,
        fees: 0,
        notes: "",
      },
    ];

    const result = computeInvestedVsReceived([item], { BBAS3: events }, txs);

    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("BBAS3");
    expect(result[0].invested).toBe(5000); // 200 * 25
    // 200 * 1.00 * (1 - 0.15) = 170.00
    expect(result[0].received).toBe(170);
  });

  it("calculates US Stock dividends with 30% US withholding tax deducted", () => {
    const item = createItem({ ticker: "AAPL", type: "STOCK_US", currency: "USD", quantity: 50, averagePrice: 150 });
    const events: DividendEvent[] = [
      { exDate: "2024-05-15", paymentDate: "2024-05-22", amountPerShare: 2.0 },
    ];
    const txs: Transaction[] = [
      {
        id: "tx-1",
        ticker: "AAPL",
        type: "buy",
        date: new Date("2024-01-10").getTime(),
        quantity: 50,
        pricePerShare: 150,
        fees: 0,
        notes: "",
      },
    ];

    const result = computeInvestedVsReceived([item], { AAPL: events }, txs);

    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("AAPL");
    expect(result[0].invested).toBe(7500); // 50 * 150
    // Gross: 50 * 2.0 = 100. Net after 30% WHT = 70.00
    expect(result[0].received).toBe(70);
  });

  it("prevents the R$0 bug when item.investingSince is recent but transaction history is older", () => {
    // Scenario: item was recently edited in watchlist so investingSince = 2026-08-01,
    // but the user bought in 2024-01-01. The old computeInvestedVsReceived filtered by
    // date >= item.investingSince and returned 0. The SSOT calculateRealizedIncome uses transactions.
    const item = createItem({
      ticker: "AFHI11",
      type: "FII",
      quantity: 1000,
      averagePrice: 98.5,
      investingSince: new Date("2026-08-01").getTime(), // Recent timestamp
    });
    const events: DividendEvent[] = [
      { exDate: "2024-05-15", paymentDate: "2024-05-22", amountPerShare: 1.05, isJCP: false },
      { exDate: "2024-06-15", paymentDate: "2024-06-22", amountPerShare: 1.10, isJCP: false },
    ];
    const txs: Transaction[] = [
      {
        id: "tx-1",
        ticker: "AFHI11",
        type: "buy",
        date: new Date("2024-01-10").getTime(),
        quantity: 1000,
        pricePerShare: 98.5,
        fees: 0,
        notes: "",
      },
    ];

    const result = computeInvestedVsReceived([item], { AFHI11: events }, txs);

    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("AFHI11");
    // Should NOT be 0!
    // 1000 * 1.05 + 1000 * 1.10 = 2150.00
    expect(result[0].received).toBe(2150);
  });

  it("uses synthetic transaction fallback when transactions array is empty", () => {
    // User hasn't registered individual trade orders in transactions tab,
    // but has 100 shares registered in the watchlist since 2024-01-01.
    const item = createItem({
      ticker: "AFHI11",
      type: "FII",
      quantity: 100,
      averagePrice: 100,
      investingSince: new Date("2024-01-01").getTime(),
    });
    const events: DividendEvent[] = [
      { exDate: "2024-05-15", paymentDate: "2024-05-22", amountPerShare: 1.0, isJCP: false },
    ];

    // Passing empty transactions array
    const result = computeInvestedVsReceived([item], { AFHI11: events }, []);

    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("AFHI11");
    expect(result[0].invested).toBe(10000);
    expect(result[0].received).toBe(100);
  });

  it("never converts a mixed BRL/USD portfolio — each item stays in its own native currency", () => {
    const brlItem = createItem({ ticker: "BBAS3", type: "STOCK_BR", currency: "BRL", quantity: 100, averagePrice: 25 });
    const usdItem = createItem({ ticker: "AAPL", type: "STOCK_US", currency: "USD", quantity: 10, averagePrice: 150 });

    const result = computeInvestedVsReceived([brlItem, usdItem], {}, []);

    const bbas3 = result.find((r) => r.ticker === "BBAS3")!;
    const aapl = result.find((r) => r.ticker === "AAPL")!;
    expect(bbas3.currency).toBe("BRL");
    expect(bbas3.invested).toBe(2500); // 100 * 25, no fx applied
    expect(aapl.currency).toBe("USD");
    expect(aapl.invested).toBe(1500); // 10 * 150, no fx applied — NOT multiplied by fxRate
  });

  it("ranks top-10 fairly across currencies instead of favoring BRL's structurally larger raw numbers", () => {
    // Economically, this USD position (10 * 300 = US$3,000 ≈ R$16,500 at the 5.5 fallback rate)
    // is worth far more than the BRL position (100 * 25 = R$2,500) — a raw-BRL-amount comparison
    // would wrongly rank the BRL position higher just because "2500 > 1500" in raw digits.
    const smallBrlItem = createItem({ ticker: "BBAS3", type: "STOCK_BR", currency: "BRL", quantity: 100, averagePrice: 25 });
    const largeUsdItem = createItem({ ticker: "AAPL", type: "STOCK_US", currency: "USD", quantity: 10, averagePrice: 300 });

    const result = computeInvestedVsReceived([smallBrlItem, largeUsdItem], {}, []);

    expect(result[0].ticker).toBe("AAPL"); // Ranked first — genuinely the larger position
    expect(result[0].invested).toBe(3000); // Still reported natively in USD, not the BRL ranking value
    expect(result[0].currency).toBe("USD");
  });
});
