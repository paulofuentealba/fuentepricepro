// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import {
  useValuedTotals,
  useValuedItem,
  useValuedItems,
  ValuedPortfolioProvider,
  type ValuedWatchlistItem,
} from "../useValuedPortfolio";

// Mock dependent hooks for ValuedPortfolioProvider
vi.mock("../watchlist", () => ({
  useWatchlist: () => ({
    items: [
      {
        id: "item-1",
        ticker: "PETR4",
        name: "Petrobras",
        type: "STOCK_BR",
        currency: "BRL",
        quantity: 100,
        averagePrice: 30,
        currentPrice: 38,
        annualDividend: 3.5,
        targetYield: 0.08,
      },
    ],
    isPending: false,
  }),
}));

vi.mock("../transactions", () => ({
  useTransactions: () => ({
    transactions: [],
    isLoading: false,
  }),
}));

vi.mock("../auth-provider", () => ({
  useAuth: () => ({
    user: { uid: "test-user" },
    loading: false,
  }),
}));

vi.mock("../useUserSettings", () => ({
  useUserSettings: () => ({
    settings: { targetYield: 0.08, classTargetYields: {} },
    updateSettings: vi.fn(),
  }),
}));

vi.mock("../i18n-provider", () => ({
  useI18n: () => ({
    t: { common: { other: "Outros" } },
    locale: "ptBR",
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: { USDBRL: 5.5 },
    isLoading: false,
    dataUpdatedAt: 123456,
  }),
  createContext: vi.fn(),
}));

describe("useValuedPortfolio Selectors", () => {
  it("exports useValuedTotals, useValuedItem, and useValuedItems functions", () => {
    expect(typeof useValuedTotals).toBe("function");
    expect(typeof useValuedItem).toBe("function");
    expect(typeof useValuedItems).toBe("function");
  });
});
