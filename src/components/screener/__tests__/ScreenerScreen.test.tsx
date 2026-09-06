// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ScreenerScreen } from "../ScreenerScreen";
import { dict } from "@/lib/i18n";

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

const mockRadarData = {
  br: [
    {
      ticker: "PETR4",
      name: "Petrobras PN",
      type: "STOCK_BR",
      currency: "BRL",
      currentPrice: 38.5,
      annualDividend: 4.5,
      dividends: [{ amount: 4.5, date: "2024-05-01" }],
      metrics: {
        eps: 8.0,
        bvps: 35.0,
        pbRatio: 1.1,
        dividendCagr5y: 12.0,
      },
    },
    {
      ticker: "BBAS3",
      name: "Banco do Brasil",
      type: "STOCK_BR",
      currency: "BRL",
      currentPrice: 28.0,
      annualDividend: 3.2,
      dividends: [{ amount: 3.2, date: "2024-06-01" }],
      metrics: {
        eps: 6.0,
        bvps: 34.0,
        pbRatio: 0.82,
        dividendCagr5y: 10.0,
      },
    },
  ],
  us: [
    {
      ticker: "AAPL",
      name: "Apple Inc.",
      type: "STOCK_US",
      currency: "USD",
      currentPrice: 220.0,
      annualDividend: 1.0,
      dividends: [{ amount: 1.0, date: "2024-05-01" }],
      metrics: {
        eps: 6.5,
        bvps: 4.5,
        pbRatio: 48.0,
      },
    },
  ],
};

const mockValuedItems = [
  {
    id: "item-petr",
    ticker: "PETR4",
    name: "Petrobras PN",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 38.5,
    livePrice: 38.5,
    annualDividend: 4.5,
    quantity: 100,
    averagePrice: 30.0,
    targetYield: 6,
    safetyMargin: 25.0,
    ceilingPrice: 50.0,
    valuation: {
      activeCeiling: 50.0,
      margin: 25.0,
      dividendYield: 11.6,
      fuenteConsensus: 52.0,
    },
  },
];

const mockSettings = {
  targetYield: 6,
  classTargetYields: {
    STOCK_BR: 6.0,
    FII: 8.5,
    STOCK_US: 4.0,
  },
  displayCurrency: "BRL",
};

const mockUpdateSettings = vi.fn().mockResolvedValue(undefined);

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, onClick, className, ...props }: any) => {
    const searchStr = search ? `?tab=${search.tab}&ticker=${search.ticker || ""}` : "";
    return (
      <a href={`${to}${searchStr}`} onClick={onClick} className={className} {...props}>
        {children}
      </a>
    );
  },
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: dict.ptBR,
    locale: "ptBR",
  }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: mockSettings,
    updateSettings: mockUpdateSettings,
  }),
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: mockValuedItems,
    isAppLoading: false,
    fx: { USDBRL: 5.5 },
  }),
}));

vi.mock("@/lib/useSelic", () => ({
  useSelic: () => ({ data: 10.5 }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: ({ queryKey }: any) => {
      const key = queryKey?.[0];
      if (key === "dividend-radar") {
        return { data: mockRadarData, isLoading: false, isError: false };
      }
      if (key === "ipcaFiveYearAverage") {
        return { data: 4.5, isLoading: false };
      }
      return { data: null, isLoading: false };
    },
    useQueryClient: () => ({
      ensureQueryData: vi.fn(),
    }),
  };
});

describe("ScreenerScreen Component (Fase 9)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the screener title, KPIs, and table of market assets", () => {
    render(<ScreenerScreen />);

    expect(screen.getByText(dict.ptBR.screenerScreen.title)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.screenerScreen.subtitle)).toBeInTheDocument();

    expect(screen.getByText(dict.ptBR.screenerScreen.kpis.totalAnalyzed)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.screenerScreen.kpis.undervaluedCount)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.screenerScreen.kpis.avgMargin)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.screenerScreen.kpis.avgDy)).toBeInTheDocument();

    expect(screen.getByText(dict.ptBR.screenerScreen.table.asset)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.screenerScreen.table.class)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.screenerScreen.table.currentPrice)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.screenerScreen.table.ceilingPrice)).toBeInTheDocument();
    expect(screen.getAllByText(dict.ptBR.screenerScreen.table.safetyMargin).length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getAllByText("B3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("US").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 'Em Carteira' badge for assets already in the user's portfolio", () => {
    render(<ScreenerScreen />);

    expect(screen.getByText(dict.ptBR.screenerScreen.table.inPortfolio)).toBeInTheDocument();
  });

  it("filters assets by ticker or name using the text filter", () => {
    render(<ScreenerScreen />);

    const searchInput = screen.getByPlaceholderText(/Filtrar por ticker ou nome/i);
    fireEvent.change(searchInput, { target: { value: "BBAS" } });

    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.queryByText("PETR4")).not.toBeInTheDocument();
  });

  it("renders direct link to Raio-X for each asset", () => {
    render(<ScreenerScreen />);

    const raioXLinks = screen.getAllByText(dict.ptBR.screenerScreen.table.viewDeepDive);
    expect(raioXLinks.length).toBeGreaterThan(0);

    const firstLink = raioXLinks[0].closest("a");
    expect(firstLink).toHaveAttribute("href", expect.stringContaining("tab=deepdive"));
  });

  it("opens the contribution simulation modal when clicking 'Simular'", async () => {
    render(<ScreenerScreen />);

    const simularBtns = screen.getAllByRole("button", {
      name: new RegExp(dict.ptBR.screenerScreen.table.simulateContribution, "i"),
    });
    expect(simularBtns.length).toBeGreaterThan(0);

    fireEvent.click(simularBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(dict.ptBR.screenerScreen.simulatorModal.title)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(dict.ptBR.screenerScreen.simulatorModal.amountLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.screenerScreen.allocLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.screenerScreen.incomeLabel)).toBeInTheDocument();
  });
});
