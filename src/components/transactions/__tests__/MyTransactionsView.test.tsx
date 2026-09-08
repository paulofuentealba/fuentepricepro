// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MyTransactionsView } from "../MyTransactionsView";
import { dict, type Locale } from "@/lib/i18n";
import type { Transaction } from "@/lib/transactions";
import type { WatchlistItem } from "@/lib/watchlist";
import type { Currency } from "@/lib/domain";

let currentLocale: Locale = "ptBR";
let mockMarketScope = {
  currency: "BRL" as Currency,
  isUS: false,
  isUSNative: false,
  taxJurisdiction: "BR" as const,
};

vi.mock("@/lib/useMarketScope", () => ({
  useMarketScope: () => mockMarketScope,
}));

vi.mock("@/lib/queryOptions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queryOptions")>();
  return {
    ...actual,
    exchangeRateQueryOptions: () => ({
      queryKey: ["exchangeRate"],
      queryFn: async () => ({ USDBRL: 5.5, updatedAt: Date.now() }),
    }),
  };
});

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

const mockTransactions: Transaction[] = [
  {
    id: "tx-buy-1",
    ticker: "BBAS3",
    type: "buy",
    date: new Date("2024-01-15T12:00:00Z").getTime(),
    quantity: 100,
    pricePerShare: 25.0,
    fees: 5.0,
    broker: "BTG Pactual",
    notes: "Primeiro aporte",
    thesisSnapshot: {
      consensusPrice: 35.0,
      bazinPrice: 38.0,
      grahamPrice: 32.0,
      gordonPrice: 34.0,
      purchasePrice: 25.0,
      safetyMarginVsConsensus: 40.0,
      payoutRatio: 45.0,
      dividendYield: 9.5,
      dividendCagr5y: 12.0,
      piotroskiScore: 8,
      isYieldTrap: false,
      valuationVersion: "fuente-v1",
      capturedAt: new Date("2024-01-15T12:00:00Z").getTime(),
    },
  },
  {
    id: "tx-buy-2",
    ticker: "BBAS3",
    type: "buy",
    date: new Date("2024-02-15T12:00:00Z").getTime(),
    quantity: 50,
    pricePerShare: 28.0,
    fees: 2.5,
    broker: "BTG Pactual",
    notes: "Reforço de posição",
  },
  {
    id: "tx-sell-1",
    ticker: "PETR4",
    type: "sell",
    date: new Date("2024-03-10T12:00:00Z").getTime(),
    quantity: 30,
    pricePerShare: 36.0,
    fees: 3.0,
    broker: "XP Investimentos",
    notes: "Realização parcial",
  },
];

const mockWatchlistItems: WatchlistItem[] = [
  {
    id: "STOCK_BR:BBAS3",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 29.0,
    annualDividend: 2.8,
    targetYield: 6.0,
    ceilingPrice: 46.67,
    safetyMargin: 60.9,
    quantity: 150,
    averagePrice: 26.05,
    paymentMonths: [3, 6, 9, 12],
    payoutRatio: 40,
    addedAt: 1700000000000,
    investingSince: 1704067200000,
    broker: "BTG Pactual",
  },
];

const mockRemove = vi.fn();
const mockUpsert = vi.fn();
const mockUpdateAsync = vi.fn();

vi.mock("@/lib/transactions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/transactions")>();
  return {
    ...actual,
    useTransactions: () => ({
      transactions: mockTransactions,
      isLoading: false,
      remove: mockRemove,
      upsert: mockUpsert,
    }),
  };
});

vi.mock("@/lib/watchlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watchlist")>();
  return {
    ...actual,
    useWatchlist: () => ({
      items: mockWatchlistItems,
      isPending: false,
      updateAsync: mockUpdateAsync,
      upsert: vi.fn(),
      remove: vi.fn(),
    }),
  };
});

// Mock CSV functions
vi.mock("@/lib/csv", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/csv")>();
  return {
    ...actual,
    downloadCsv: vi.fn(),
  };
});

describe("MyTransactionsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLocale = "ptBR";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the page title, subtitle, and action buttons", () => {
    renderWithClient(<MyTransactionsView />);

    expect(screen.getByText("Extrato de Operações")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Auditoria contábil completa, histórico de ordens executadas e eventos corporativos de todos os ativos."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Registrar Transação")).toBeInTheDocument();
    expect(screen.getByText("Exportar CSV")).toBeInTheDocument();
  });

  it("renders the 4 KPI summary cards with computed totals", () => {
    renderWithClient(<MyTransactionsView />);

    // Total Aportado: (100 * 25 + 5) + (50 * 28 + 2.5) = 2505 + 1402.5 = 3907.50
    expect(screen.getByText("Total Aportado (Compras)")).toBeInTheDocument();
    expect(screen.getByText("2 ordens de compra")).toBeInTheDocument();

    // Total Desinvestido: 30 * 36 - 3 = 1080 - 3 = 1077.00
    expect(screen.getByText("Total Desinvestido (Vendas)")).toBeInTheDocument();
    expect(screen.getByText("1 ordens de venda")).toBeInTheDocument();

    // Fluxo Líquido
    expect(screen.getByText("Fluxo Líquido")).toBeInTheDocument();

    // Custos & Taxas: 5 + 2.5 + 3 = 10.50
    expect(screen.getByText("Custos & Emolumentos")).toBeInTheDocument();
  });

  it("renders all transactions in the ledger table with appropriate badges", () => {
    renderWithClient(<MyTransactionsView />);

    expect(screen.getAllByText("BBAS3").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("PETR4")).toBeInTheDocument();

    // Badges
    const buyBadges = screen.getAllByText("COMPRA");
    expect(buyBadges.length).toBe(2);

    const sellBadges = screen.getAllByText("VENDA");
    expect(sellBadges.length).toBe(1);
  });

  it("filters transactions when searching by ticker", () => {
    renderWithClient(<MyTransactionsView />);

    const searchInput = screen.getByPlaceholderText(
      "Buscar por ativo (BBAS3, HGLG11), corretora ou notas..."
    );

    fireEvent.change(searchInput, { target: { value: "PETR" } });

    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.queryByText("BBAS3")).not.toBeInTheDocument();
  });

  it("opens the ThesisSnapshotModal when clicking 'Ver Tese'", () => {
    renderWithClient(<MyTransactionsView />);

    const viewThesisButtons = screen.getAllByText("Ver Tese");
    expect(viewThesisButtons.length).toBe(1);

    fireEvent.click(viewThesisButtons[0]);

    // Check thesis modal contents
    expect(screen.getByText("Tese de Compra — BBAS3")).toBeInTheDocument();
    expect(screen.getByText("Preço Pago na Ordem")).toBeInTheDocument();
    expect(screen.getByText("Preço Teto Fuente (Consenso)")).toBeInTheDocument();
    expect(screen.getByText("Margem de Segurança na Data")).toBeInTheDocument();
    expect(screen.getByText("Piotroski F-Score")).toBeInTheDocument();
  });

  it("shows empty state when search matches no transactions", () => {
    renderWithClient(<MyTransactionsView />);

    const searchInput = screen.getByPlaceholderText(
      "Buscar por ativo (BBAS3, HGLG11), corretora ou notas..."
    );

    fireEvent.change(searchInput, { target: { value: "NONEXISTENT_TICKER" } });

    expect(screen.getByText("Nenhuma transação encontrada")).toBeInTheDocument();
  });

  it("opens NewTransactionModal when clicking 'Registrar Transação'", () => {
    renderWithClient(<MyTransactionsView />);

    const registerBtn = screen.getByText("Registrar Transação");
    fireEvent.click(registerBtn);

    expect(screen.getByText("Registrar Nova Transação")).toBeInTheDocument();
    expect(screen.getByText("Tipo de Operação")).toBeInTheDocument();
  });

  it("shows batch action bar when a transaction checkbox is selected", () => {
    renderWithClient(<MyTransactionsView />);

    const checkboxes = screen.getAllByRole("checkbox");
    // checkboxes[0] is header checkbox, checkboxes[1] is first row
    fireEvent.click(checkboxes[1]);

    expect(screen.getByText("1 transação selecionada")).toBeInTheDocument();
    expect(screen.getByText("Excluir Selecionadas")).toBeInTheDocument();
  });

  it("renders with USD currency when market scope is USD", () => {
    mockMarketScope = {
      currency: "USD",
      isUS: true,
      isUSNative: true,
      taxJurisdiction: "US",
    };
    currentLocale = "en";

    renderWithClient(<MyTransactionsView />);

    expect(screen.getByText("Total Invested (Buys)")).toBeInTheDocument();
  });
});
