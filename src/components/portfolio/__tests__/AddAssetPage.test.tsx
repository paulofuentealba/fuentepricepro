// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AddAssetPage } from "../AddAssetPage";
import { dict, type Locale } from "@/lib/i18n";
import type { Asset } from "@/lib/domain";
import type { LiveQuote } from "@/lib/api/types";

const currentLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const mockUpsertWatchlistItem = vi.fn();
const mockUpsertTransaction = vi.fn();

vi.mock("@/lib/settings", () => ({
  useSettings: () => ({ targetYield: 6 }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: {
      displayCurrency: "BRL",
      smartAllocationTargets: { STOCK_BR: 40 },
    },
  }),
}));

vi.mock("@/lib/watchlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watchlist")>();
  return {
    ...actual,
    useWatchlist: () => ({
      items: [],
      upsert: mockUpsertWatchlistItem,
    }),
  };
});

vi.mock("@/lib/transactions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/transactions")>();
  return {
    ...actual,
    useTransactions: () => ({
      transactions: [],
      upsert: mockUpsertTransaction,
    }),
  };
});

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: [],
  }),
}));

const mockAssets: Record<string, Asset> = {
  TAEE11: {
    ticker: "TAEE11",
    name: "Taesa S.A.",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 34.0,
    sector: "Utilities",
    dividends3y: [2.5, 2.7, 2.6],
    dividendHistory: [],
    exDividendDate: null,
    epsCurrent: 3.8,
    epsNext: 4.0,
    paymentMonths: [5, 11],
    dividendEvents: [],
    metrics: {
      peRatio: 8.9,
      pbRatio: 1.6,
      eps: 3.8,
      bvps: 21.0,
      roe: 18.0,
      currentDy: 7.6,
      capRate: null,
      vacancy: null,
      expenseRatio: null,
      aum: null,
      trackingError: null,
      payoutRatio: 72,
      dividendCagr5y: 5.5,
    },
  },
  PETR4: {
    ticker: "PETR4",
    name: "Petrobras PN",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 38.5,
    sector: "Energy",
    dividends3y: [5.0, 5.5, 5.1],
    dividendHistory: [],
    exDividendDate: null,
    epsCurrent: 7.2,
    epsNext: 7.5,
    paymentMonths: [3, 6, 9, 12],
    dividendEvents: [],
    metrics: {
      peRatio: 5.3,
      pbRatio: 1.1,
      eps: 7.2,
      bvps: 35.0,
      roe: 22.0,
      currentDy: 13.5,
      capRate: null,
      vacancy: null,
      expenseRatio: null,
      aum: null,
      trackingError: null,
      payoutRatio: 65,
      dividendCagr5y: 12.0,
    },
  },
};

const mockQuotes: Record<string, LiveQuote> = {
  TAEE11: { ticker: "TAEE11", price: 34.0, changePct: 0.74 },
  PETR4: { ticker: "PETR4", price: 38.5, changePct: -1.2 },
};

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: any) => {
      const queryKey = options?.queryKey ?? [];
      const [type, ticker] = queryKey;
      if (type === "exchangeRates") {
        return { data: { USDBRL: 5.5 } };
      }
      if (type === "asset" && ticker && mockAssets[ticker]) {
        return { data: mockAssets[ticker], isLoading: false, isSuccess: true };
      }
      if (type === "quote" && ticker && mockQuotes[ticker]) {
        return { data: mockQuotes[ticker], isLoading: false, isSuccess: true };
      }
      return { data: null, isLoading: false, isSuccess: false };
    },
  };
});

vi.mock("@/components/shared/TickerSearchField", () => ({
  TickerSearchField: ({ onPick }: any) => (
    <div data-testid="ticker-search-field">
      <button
        type="button"
        onClick={() =>
          onPick({
            ticker: "TAEE11",
            name: "Taesa S.A.",
            type: "STOCK_BR",
            sector: "Utilities",
          })
        }
      >
        Select TAEE11
      </button>
      <button
        type="button"
        onClick={() =>
          onPick({
            ticker: "PETR4",
            name: "Petrobras PN",
            type: "STOCK_BR",
            sector: "Energy",
          })
        }
      >
        Select PETR4
      </button>
    </div>
  ),
}));

describe("AddAssetPage", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the page and reacts to asset picking with automatic price and calculations", async () => {
    render(<AddAssetPage />);

    expect(screen.getByText("Adicionar ativo")).toBeInTheDocument();

    // Initially, no asset is picked
    expect(screen.getByText("Escolha um ativo e preencha quantidade e preço para ver a prévia.")).toBeInTheDocument();

    // Pick TAEE11
    fireEvent.click(screen.getByRole("button", { name: "Select TAEE11" }));

    // Ticker card appears with TAEE11 info and live price
    await waitFor(() => expect(screen.getByText("TAEE11")).toBeInTheDocument());
    expect(screen.getAllByText(/34,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/0\.74%/)).toBeInTheDocument();

    // Price input is automatically populated with 34 and quantity defaults to 100
    const priceInput = screen.getByLabelText(/Preço/i) as HTMLInputElement;
    expect(priceInput.value).toContain("34");

    // Impact preview and consensus are calculated immediately!
    await waitFor(() => {
      // 100 * 34 = 3400. Novo custo médio = 34,00
      expect(screen.getByText(/3\.400,00/)).toBeInTheDocument();
    });

    // Consenso card is populated with registration badge
    expect(screen.getByText(/registrado/i)).toBeInTheDocument();
  });

  it("reactively updates price and all calculations when switching from one asset to another", async () => {
    render(<AddAssetPage />);

    // 1. Pick TAEE11
    fireEvent.click(screen.getByRole("button", { name: "Select TAEE11" }));
    await waitFor(() => expect(screen.getByText("TAEE11")).toBeInTheDocument());

    const priceInput = screen.getByLabelText(/Preço/i) as HTMLInputElement;
    expect(priceInput.value).toContain("34");
    expect(screen.getByText(/3\.400,00/)).toBeInTheDocument();

    // 2. Switch asset to PETR4
    fireEvent.click(screen.getByRole("button", { name: "Select PETR4" }));

    // Asset card switches to PETR4
    await waitFor(() => expect(screen.getByText("PETR4")).toBeInTheDocument());
    expect(screen.queryByText("TAEE11")).not.toBeInTheDocument();

    // Price input updates to PETR4 price (38.5) — not stuck on 34!
    await waitFor(() => {
      expect(priceInput.value).toContain("38,5");
    });

    // Impact calculation immediately updates to PETR4: 100 * 38.50 = 3850
    await waitFor(() => {
      expect(screen.getByText(/3\.850,00/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/3\.400,00/)).not.toBeInTheDocument();
  });

  it("dynamically recalculates impact when user edits price or quantity", async () => {
    render(<AddAssetPage />);

    fireEvent.click(screen.getByRole("button", { name: "Select TAEE11" }));
    await waitFor(() => expect(screen.getByText("TAEE11")).toBeInTheDocument());

    const qtyInput = screen.getByLabelText("Quantidade") as HTMLInputElement;
    const priceInput = screen.getByLabelText(/Preço/i) as HTMLInputElement;

    // Change quantity to 200
    fireEvent.change(qtyInput, { target: { value: "200" } });
    await waitFor(() => {
      // 200 * 34 = 6800
      expect(screen.getByText(/6\.800,00/)).toBeInTheDocument();
    });

    // Change price to 30.00
    fireEvent.change(priceInput, { target: { value: "30,00" } });
    await waitFor(() => {
      // 200 * 30 = 6000
      expect(screen.getByText(/6\.000,00/)).toBeInTheDocument();
    });
  });

  it("submits the transaction with thesis snapshot and redirects to /app/myportfolio", async () => {
    render(<AddAssetPage />);

    fireEvent.click(screen.getByRole("button", { name: "Select TAEE11" }));
    await waitFor(() => expect(screen.getByText("TAEE11")).toBeInTheDocument());

    const submitBtn = screen.getByRole("button", { name: "Adicionar à carteira" });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpsertTransaction).toHaveBeenCalledTimes(1);
      expect(mockUpsertWatchlistItem).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/app/myportfolio" });
    });

    const savedTx = mockUpsertTransaction.mock.calls[0][0];
    expect(savedTx.ticker).toBe("TAEE11");
    expect(savedTx.quantity).toBe(100);
    expect(savedTx.pricePerShare).toBe(34.0);
    expect(savedTx.thesisSnapshot).toBeDefined();
    expect(savedTx.thesisSnapshot.consensusPrice).toBeGreaterThan(0);
  });
});
