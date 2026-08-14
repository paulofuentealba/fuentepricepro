// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePortfolioRisk } from "../usePortfolioRisk";
import type { ValuedWatchlistItem } from "../useValuedPortfolio";

// Mock dependencies
const mockValuedItems: ValuedWatchlistItem[] = [];
vi.mock("../useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({ valuedItems: mockValuedItems }),
}));

vi.mock("../auth-provider", () => ({
  useAuth: () => ({ user: { uid: "test-user" } }),
}));

vi.mock(import("@tanstack/react-query"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQuery: () => ({ data: { USDBRL: 5.0 } } as any),
  };
});

vi.mock("../i18n-provider", () => ({
  useI18n: () => ({
    t: {
      common: { other: "Outro" },
    },
  }),
}));

describe("usePortfolioRisk (Currency Exposure SSOT - Prompt 106)", () => {
  it("correctly identifies USD currency for STOCK_US and REIT assets using item.currency", () => {
    mockValuedItems.length = 0;
    mockValuedItems.push(
      {
        id: "item-1",
        ticker: "AAPL",
        name: "Apple Inc.",
        type: "STOCK_US",
        currency: "USD",
        currentPrice: 200,
        annualDividend: 1,
        targetYield: 1,
        ceilingPrice: 250,
        safetyMargin: 25,
        quantity: 10, // 10 * 200 = 2000 USD -> 10,000 BRL (fx: 5.0)
        averagePrice: 150,
        paymentMonths: [],
        payoutRatio: 20,
        customTaxRate: null,
        sector: "Technology",
        addedAt: Date.now(),
        investingSince: Date.now(),
        valuation: {
          ceilingPrice: 250,
          safetyMargin: 25,
          dividendYield: 0.5,
          projectedDividend: 10,
        },
      } as unknown as ValuedWatchlistItem,
      {
        id: "item-2",
        ticker: "HGLG11",
        name: "CSHG Logística",
        type: "FII",
        currency: "BRL",
        currentPrice: 100,
        annualDividend: 10,
        targetYield: 10,
        ceilingPrice: 120,
        safetyMargin: 20,
        quantity: 100, // 100 * 100 = 10,000 BRL
        averagePrice: 90,
        paymentMonths: [],
        payoutRatio: 95,
        customTaxRate: null,
        sector: "Real Estate",
        addedAt: Date.now(),
        investingSince: Date.now(),
        valuation: {
          ceilingPrice: 120,
          safetyMargin: 20,
          dividendYield: 10,
          projectedDividend: 1000,
        },
      } as unknown as ValuedWatchlistItem,
    );

    const { result } = renderHook(() => usePortfolioRisk());

    expect(result.current.totalEquity).toBe(20000); // 10,000 BRL (from USD) + 10,000 BRL
    const usd = result.current.currencies.find((c) => c.currency === "USD");
    const brl = result.current.currencies.find((c) => c.currency === "BRL");

    expect(usd).toBeDefined();
    expect(usd?.valueBase).toBe(10000);
    expect(usd?.weightPct).toBe(50);

    expect(brl).toBeDefined();
    expect(brl?.valueBase).toBe(10000);
    expect(brl?.weightPct).toBe(50);
  });
});
