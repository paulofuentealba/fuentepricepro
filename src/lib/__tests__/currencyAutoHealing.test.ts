// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePortfolioRisk } from "../usePortfolioRisk";
import type { ValuedWatchlistItem } from "../useValuedPortfolio";

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

describe("Currency In-Memory Resolution & Auto-Healing (Prompt 107)", () => {
  it("resolves US stocks and REITs to USD in Risk Radar", () => {
    mockValuedItems.length = 0;
    mockValuedItems.push(
      {
        id: "stock_br:bbse3",
        ticker: "BBSE3",
        name: "BB Seguridade",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 38.0,
        annualDividend: 3.5,
        targetYield: 6,
        ceilingPrice: 58.33,
        safetyMargin: 53.5,
        quantity: 100, // 3,800 BRL
        averagePrice: 30.0,
        paymentMonths: [2, 8],
        targetMonthlyIncome: null,
        payoutRatio: 80,
        customTaxRate: null,
        sector: "Financeiro",
        addedAt: Date.now(),
        investingSince: Date.now(),
        livePrice: 38.0,
        isClosedPosition: false,
        isBffMode: true,
        valuation: {} as any,
      },
      {
        id: "stock_us:aapl",
        ticker: "AAPL",
        name: "Apple Inc.",
        type: "STOCK_US",
        currency: "USD",
        currentPrice: 200.0,
        annualDividend: 1.0,
        targetYield: 3,
        ceilingPrice: 33.33,
        safetyMargin: -83.3,
        quantity: 10, // 10 * 200 * 5.0 = 10,000 BRL
        averagePrice: 150.0,
        paymentMonths: [2, 5, 8, 11],
        targetMonthlyIncome: null,
        payoutRatio: 15,
        customTaxRate: null,
        sector: "Tecnologia",
        addedAt: Date.now(),
        investingSince: Date.now(),
        livePrice: 200.0,
        isClosedPosition: false,
        isBffMode: true,
        valuation: {} as any,
      },
    );

    // Total Equity = 13,800 BRL
    // USD exposure = 10,000 / 13,800 = 72.46%
    // BRL exposure = 3,800 / 13,800 = 27.54%
    const { result } = renderHook(() => usePortfolioRisk());

    expect(result.current.currencies.length).toBe(2);

    const usd = result.current.currencies.find((c) => c.currency === "USD");
    const brl = result.current.currencies.find((c) => c.currency === "BRL");

    expect(usd).toBeDefined();
    expect(brl).toBeDefined();
    expect(usd?.weightPct).toBeCloseTo(72.46, 1);
    expect(brl?.weightPct).toBeCloseTo(27.54, 1);
  });

  it("handles BDR exception where type is STOCK_US but currency is BRL", () => {
    mockValuedItems.length = 0;
    mockValuedItems.push({
      id: "stock_us:aapl34",
      ticker: "AAPL34",
      name: "Apple BDR",
      type: "STOCK_US",
      currency: "BRL",
      currentPrice: 50.0,
      annualDividend: 0.5,
      targetYield: 6,
      ceilingPrice: 8.33,
      safetyMargin: -83.3,
      quantity: 100, // 5,000 BRL
      averagePrice: 40.0,
      paymentMonths: [2, 5, 8, 11],
      targetMonthlyIncome: null,
      payoutRatio: 15,
      customTaxRate: null,
      sector: "Tecnologia",
      addedAt: Date.now(),
      investingSince: Date.now(),
      livePrice: 50.0,
      isClosedPosition: false,
      isBffMode: true,
      valuation: {} as any,
    });

    const { result } = renderHook(() => usePortfolioRisk());
    expect(result.current.currencies.length).toBe(1);
    expect(result.current.currencies[0].currency).toBe("BRL");
    expect(result.current.currencies[0].weightPct).toBe(100);
  });
});
