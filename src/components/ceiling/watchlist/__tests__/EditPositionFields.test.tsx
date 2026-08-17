// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditPositionFields } from "../EditPositionFields";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

const mockUpdateAsync = vi.fn().mockResolvedValue(undefined);
const mockUpsertTransaction = vi.fn().mockResolvedValue(undefined);
let mockTransactions: any[] = [];

vi.mock("@/lib/watchlist", async () => {
  const actual = await vi.importActual<any>("@/lib/watchlist");
  return {
    ...actual,
    useWatchlist: () => ({ updateAsync: mockUpdateAsync }),
  };
});

vi.mock("@/lib/transactions", async () => {
  const actual = await vi.importActual<any>("@/lib/transactions");
  return {
    ...actual,
    useTransactions: () => ({ transactions: mockTransactions, upsert: mockUpsertTransaction }),
  };
});

vi.mock("@/lib/queryOptions", async () => {
  const actual = await vi.importActual<any>("@/lib/queryOptions");
  return {
    ...actual,
    ipcaFiveYearAverageQueryOptions: () => ({
      queryKey: ["ipca-test"],
      queryFn: async () => null,
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockTransactions = [];
});

beforeEach(() => {
  window.matchMedia = window.matchMedia ?? (vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as any);
});

const baseItem: ValuedWatchlistItem = {
  id: "1",
  ticker: "PETR4",
  name: "Petrobras",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 35,
  annualDividend: 3,
  targetYield: 6,
  ceilingPrice: 50,
  safetyMargin: 10,
  quantity: 100,
  averagePrice: 30,
  paymentMonths: [],
  payoutRatio: null,
  addedAt: Date.now(),
  investingSince: Date.now(),
  valuation: {
    activeCeiling: 50,
    margin: 10,
    bazin: 50,
    graham: 50,
    gordon: 50,
    consensus: null,
    isUnavailable: false,
    yieldTrapWarning: false,
  } as any,
} as unknown as ValuedWatchlistItem;

function renderFields(item: ValuedWatchlistItem) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditPositionFields item={item} />
    </QueryClientProvider>,
  );
}

describe("EditPositionFields — Editar Posição (inline, migrado de EditItemDialog)", () => {
  it("gera o patch e a transação sintética de compra ao aumentar a quantidade manualmente (sem lançamentos existentes)", async () => {
    mockTransactions = [];
    renderFields({ ...baseItem, quantity: 0, averagePrice: null });

    const qtyInput = document.getElementById("wl-edit-qty") as HTMLInputElement;
    fireEvent.change(qtyInput, { target: { value: "100" } });

    const avgInput = document.getElementById("wl-edit-avg") as HTMLInputElement;
    fireEvent.change(avgInput, { target: { value: "30" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalledTimes(1));
    const [id, patch] = mockUpdateAsync.mock.calls[0];
    expect(id).toBe("1");
    expect(patch.quantity).toBe(100);
    expect(patch.averagePrice).toBe(30);

    await waitFor(() => expect(mockUpsertTransaction).toHaveBeenCalledTimes(1));
    const tx = mockUpsertTransaction.mock.calls[0][0];
    expect(tx.type).toBe("buy");
    expect(tx.ticker).toBe("PETR4");
    expect(tx.quantity).toBe(100);
  });

  it("trava os campos de quantidade e preço médio quando já existem transações para o ticker", () => {
    mockTransactions = [
      { id: "tx1", ticker: "PETR4", type: "buy", date: Date.now(), quantity: 100, pricePerShare: 30 },
    ];
    renderFields(baseItem);

    const qtyInput = document.getElementById("wl-edit-qty") as HTMLInputElement;
    const avgInput = document.getElementById("wl-edit-avg") as HTMLInputElement;
    expect(qtyInput).toBeDisabled();
    expect(avgInput).toBeDisabled();
  });

  it("rejeita salvar com quantidade inválida (<=0) sem persistir nada", async () => {
    mockTransactions = [];
    renderFields({ ...baseItem, quantity: 0, averagePrice: null });

    const qtyInput = document.getElementById("wl-edit-qty") as HTMLInputElement;
    fireEvent.change(qtyInput, { target: { value: "0" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(mockUpdateAsync).not.toHaveBeenCalled());
    expect(mockUpsertTransaction).not.toHaveBeenCalled();
  });
});
