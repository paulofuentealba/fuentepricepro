// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SnowballSimulator } from "../SnowballSimulator";
import type { WatchlistItem } from "@/lib/watchlist";
import React from "react";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as any;

let mockDisplayCurrency: "BRL" | "USD" = "BRL";
let mockItems: WatchlistItem[] = [];
let mockFxData: { USDBRL?: number } | undefined = { USDBRL: 5.0 };

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: {
      displayCurrency: mockDisplayCurrency,
      targetYield: 6,
    },
    updateSettings: vi.fn(),
  }),
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: mockItems,
    isAppLoading: false,
  }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: mockFxData,
      isLoading: false,
    }),
  };
});

const mockBrlItem: WatchlistItem = {
  id: "item-1",
  ticker: "PETR4",
  name: "Petrobras",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 40.0,
  quantity: 100,
  targetYield: 0.08,
  ceilingPrice: 50.0,
  safetyMargin: 0.2,
  averagePrice: 35.0,
  annualDividend: 4.0,
  payoutRatio: 0.5,
  paymentMonths: [5, 8, 11],
  sector: "Petróleo",
  addedAt: 123456789,
  investingSince: 1700000000000,
};

const mockUsdItem: WatchlistItem = {
  id: "item-2",
  ticker: "AAPL",
  name: "Apple Inc.",
  type: "STOCK_US",
  currency: "USD",
  currentPrice: 200.0,
  quantity: 10,
  targetYield: 0.02,
  ceilingPrice: 220.0,
  safetyMargin: 0.1,
  averagePrice: 180.0,
  annualDividend: 10.0,
  payoutRatio: 0.3,
  paymentMonths: [2, 5, 8, 11],
  sector: "Tecnologia",
  addedAt: 123456789,
  investingSince: 1700000000000,
};

describe("SnowballSimulator (Tier 0 / Item 3)", () => {
  beforeEach(() => {
    cleanup();
    mockDisplayCurrency = "BRL";
    mockFxData = { USDBRL: 5.0 };
    mockItems = [];
  });

  it("consolida ativos BRL e USD ao exibir em BRL sem descartar ativos em USD", () => {
    mockDisplayCurrency = "BRL";
    mockItems = [mockBrlItem, mockUsdItem];

    render(<SnowballSimulator />);

    // PETR4: 100 * 40 = R$ 4.000 (div = 100 * 4 = R$ 400)
    // AAPL: 10 * 200 = US$ 2.000 * 5 = R$ 10.000 (div = 10 * 10 = US$ 100 * 5 = R$ 500)
    // Total Base = R$ 14.000, Total Dividend = R$ 900, Blended Yield = 900 / 14000 = 6.43%
    expect(screen.getByText("R$ 14.000,00")).toBeDefined();
    expect(screen.getByText("6.43%")).toBeDefined();
  });

  it("consolida ativos BRL e USD ao exibir em USD sem descartar ativos em BRL", () => {
    mockDisplayCurrency = "USD";
    mockItems = [mockBrlItem, mockUsdItem];

    render(<SnowballSimulator />);

    // PETR4: R$ 4.000 / 5 = US$ 800 (div = R$ 400 / 5 = US$ 80)
    // AAPL: US$ 2.000 (div = US$ 100)
    // Total Base = US$ 2.800, Total Dividend = US$ 180, Blended Yield = 180 / 2800 = 6.43%
    expect(screen.getByText("US$ 2,800.00")).toBeDefined();
    expect(screen.getByText("6.43%")).toBeDefined();
  });

  it("mantém comportamento padrão de 8% de yield e base zero quando a carteira está vazia", () => {
    mockDisplayCurrency = "BRL";
    mockItems = [];

    render(<SnowballSimulator />);

    expect(screen.getByText("R$ 0,00")).toBeDefined();
    expect(screen.getByText("8.00%")).toBeDefined();
  });
});
