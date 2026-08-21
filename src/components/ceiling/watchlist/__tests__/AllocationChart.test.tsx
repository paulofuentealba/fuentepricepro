// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AllocationChart } from "../AllocationChart";
import type { WatchlistItem } from "@/lib/watchlist";
import { TooltipProvider } from "@/components/ui/tooltip";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as any;

let mockFxData: { USDBRL?: number } | undefined = { USDBRL: 5.8 };

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
  name: "Petrobras PN",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 38.5,
  quantity: 100,
  targetYield: 0.08,
  ceilingPrice: 43.75,
  safetyMargin: 0.12,
  averagePrice: 30.0,
  annualDividend: 3.5,
  payoutRatio: 0.5,
  paymentMonths: [5, 8, 11],
  sector: "Petróleo e Gás",
  addedAt: 123456789,
  investingSince: 1700000000000,
};

const mockUsdItem: WatchlistItem = {
  id: "item-2",
  ticker: "AAPL",
  name: "Apple Inc.",
  type: "STOCK_US",
  currency: "USD",
  currentPrice: 220.0,
  quantity: 10,
  targetYield: 0.02,
  ceilingPrice: 250.0,
  safetyMargin: 0.12,
  averagePrice: 180.0,
  annualDividend: 1.0,
  payoutRatio: 0.25,
  paymentMonths: [2, 5, 8, 11],
  sector: "Tecnologia",
  addedAt: 123456789,
  investingSince: 1700000000000,
};

describe("AllocationChart", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockFxData = { USDBRL: 5.8 };
  });

  it("renders allocation without contingency badge when real FX rate is present", () => {
    render(
      <TooltipProvider>
        <AllocationChart items={[mockBrlItem, mockUsdItem]} />
      </TooltipProvider>
    );

    expect(screen.getByText("Alocação por Tipo")).toBeDefined();
    expect(screen.queryByTestId("estimated-fx-badge")).toBeNull();
  });

  it("displays estimated FX contingency badge when USD assets exist and FX is unavailable", () => {
    mockFxData = undefined; // Feed cambial falhou
    render(
      <TooltipProvider>
        <AllocationChart items={[mockBrlItem, mockUsdItem]} />
      </TooltipProvider>
    );

    expect(screen.getByText("Alocação por Tipo")).toBeDefined();
    const badge = screen.getByTestId("estimated-fx-badge");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("Câmbio estimado");
  });

  it("does not display estimated FX badge when all assets are BRL even if FX is unavailable", () => {
    mockFxData = undefined; // Feed cambial falhou mas carteira só tem BRL
    render(
      <TooltipProvider>
        <AllocationChart items={[mockBrlItem]} />
      </TooltipProvider>
    );

    expect(screen.getByText("Alocação por Tipo")).toBeDefined();
    expect(screen.queryByTestId("estimated-fx-badge")).toBeNull();
  });
});
