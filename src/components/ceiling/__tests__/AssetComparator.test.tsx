// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AssetComparator } from "../AssetComparator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { dict } from "@/lib/i18n";
import type { WatchlistItem } from "@/lib/watchlist";
import type { Asset } from "@/lib/domain";

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

let mockWatchlistItems: WatchlistItem[] = [];
let mockQueriesData: Asset[] = [];

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: dict.ptBR,
    locale: "ptBR",
  }),
}));

vi.mock("@/lib/useSelic", () => ({
  useSelic: () => ({ data: 10.5 }),
}));

vi.mock("@/lib/settings", () => ({
  useSettings: () => ({
    settings: { targetYield: 6, displayCurrency: "BRL" },
    updateSettings: vi.fn(),
  }),
}));

vi.mock("@/lib/watchlist", () => ({
  useWatchlist: () => ({
    items: mockWatchlistItems,
    upsert: vi.fn(),
    remove: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: null,
      isLoading: false,
    }),
    useQueries: () => mockQueriesData.map((d) => ({ data: d, isLoading: false })),
  };
});

afterEach(() => {
  cleanup();
  mockWatchlistItems = [];
  mockQueriesData = [];
});

describe("AssetComparator — isSimulation logic (Tier 1 / Item 4)", () => {
  it("does NOT display simulation badge for a new asset not present in saved watchlist", () => {
    // PETR4 is searched but not in saved watchlist
    mockWatchlistItems = [];
    mockQueriesData = [
      {
        ticker: "PETR4",
        name: "Petrobras",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 35,
        dividendHistory: [{ year: 2024, amount: 3.5 }],
        payoutRatio: 0.5,
        paymentMonths: [5, 8],
        dy: 10,
        pvp: 1.2,
        pl: 5.5,
      } as unknown as Asset,
    ];

    render(
      <TooltipProvider>
        <AssetComparator />
      </TooltipProvider>
    );

    // Simulation badge should NOT be present for newly searched asset
    const simulationBadge = screen.queryByText(dict.ptBR.watchlist.simulationBadge);
    expect(simulationBadge).toBeNull();
  });
});
