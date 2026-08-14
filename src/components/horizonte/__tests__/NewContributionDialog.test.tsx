// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NewContributionDialog } from "../NewContributionDialog";

const mockUpsertWatchlistItem = vi.fn();
const mockUpsertTransaction = vi.fn();
let mockAssetData: any = null;

vi.mock("@/lib/watchlist", () => ({
  useWatchlist: () => ({
    items: [],
    upsert: mockUpsertWatchlistItem,
  }),
}));

vi.mock("@/lib/transactions", () => ({
  useTransactions: () => ({
    transactions: [],
    upsert: mockUpsertTransaction,
  }),
  recalculateHoldingFromTransactions: () => ({ quantity: 10, averagePrice: 30 }),
}));

vi.mock("@/lib/settings", () => ({
  useSettings: () => ({ targetYield: 6 }),
}));

vi.mock("@/lib/queryOptions", () => ({
  assetQueryOptions: (ticker: string) => ({
    queryKey: ["asset", ticker],
    queryFn: () => mockAssetData,
  }),
}));

let onPickCallback: ((hit: any) => void) | null = null;
vi.mock("@/components/shared/TickerSearchField", () => ({
  TickerSearchField: ({ onPick }: any) => {
    onPickCallback = onPick;
    return <div data-testid="ticker-search-field" />;
  },
}));

let onSaveCallback: ((tx: any) => void) | null = null;
vi.mock("@/components/ceiling/watchlist/TransactionFormFields", () => ({
  TransactionFormFields: ({ item, onSave, disabled }: any) => {
    onSaveCallback = onSave;
    return (
      <div data-testid="transaction-form-fields" data-disabled={disabled}>
        {item ? `Item: ${item.ticker}` : "No item"}
      </div>
    );
  },
}));

function renderDialog(open = true, onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NewContributionDialog open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
}

describe("NewContributionDialog (Prompt 99)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssetData = {
      ticker: "PETR4",
      name: "Petrobras",
      type: "STOCK_BR",
      currency: "BRL",
      currentPrice: 35.5,
      annualDividend: 3.5,
      dividends3y: [3.0, 3.5, 4.0],
      paymentMonths: [5, 8, 12],
    };
  });

  it("NÃO chama upsertWatchlistItem ao selecionar um ticker (apenas armazena no estado local)", async () => {
    renderDialog();

    expect(screen.getByTestId("ticker-search-field")).toBeInTheDocument();

    // Simula seleção de um ticker na busca
    await act(async () => {
      onPickCallback?.({
        ticker: "PETR4",
        name: "Petrobras",
        type: "STOCK_BR",
        currency: "BRL",
      });
    });

    // Garante que o documento NÃO foi salvo prematuramente no Firestore/Watchlist
    expect(mockUpsertWatchlistItem).not.toHaveBeenCalled();
    expect(mockUpsertTransaction).not.toHaveBeenCalled();
  });

  it("chama upsertWatchlistItem e upsertTransaction apenas ao salvar a transação", async () => {
    const handleOpenChange = vi.fn();
    renderDialog(true, handleOpenChange);

    await act(async () => {
      onPickCallback?.({
        ticker: "PETR4",
        name: "Petrobras",
        type: "STOCK_BR",
        currency: "BRL",
      });
    });

    // Simula clique em Salvar no formulário
    await act(async () => {
      onSaveCallback?.({
        id: "tx-1",
        ticker: "PETR4",
        type: "BUY",
        quantity: 10,
        price: 35.5,
        costs: 0,
        date: Date.now(),
      });
    });

    // Agora sim deve salvar a transação e o item da watchlist atualizado
    expect(mockUpsertTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpsertWatchlistItem).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
