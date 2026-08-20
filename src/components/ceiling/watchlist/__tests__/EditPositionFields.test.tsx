// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditPositionFields } from "../EditPositionFields";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

const mockUpdateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/watchlist", async () => {
  const actual = await vi.importActual<any>("@/lib/watchlist");
  return {
    ...actual,
    useWatchlist: () => ({ updateAsync: mockUpdateAsync }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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

describe("EditPositionFields — Metas & Premissas (Proposta 1)", () => {
  it("salva targetYield e targetMonthlyIncome exclusivamente sem alterar saldo ou transações", async () => {
    renderFields(baseItem);

    const dyInput = document.getElementById("wl-edit-dy") as HTMLInputElement;
    fireEvent.change(dyInput, { target: { value: "8" } });

    const goalInput = document.getElementById("wl-edit-goal") as HTMLInputElement;
    fireEvent.change(goalInput, { target: { value: "1000" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar metas/i }));

    await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalledTimes(1));
    const [id, patch] = mockUpdateAsync.mock.calls[0];
    expect(id).toBe("1");
    expect(patch.targetYield).toBe(8);
    expect(patch.targetMonthlyIncome).toBe(1000);
    // SSOT: Não deve conter snapshots estáticos de preço-teto nem sobrescrever saldo
    expect(patch.quantity).toBeUndefined();
    expect(patch.averagePrice).toBeUndefined();
    expect(patch.ceilingPrice).toBeUndefined();
    expect(patch.safetyMargin).toBeUndefined();
  });

  it("limpa targetMonthlyIncome para null quando o campo de meta é esvaziado", async () => {
    renderFields({ ...baseItem, targetMonthlyIncome: 500 });

    const goalInput = document.getElementById("wl-edit-goal") as HTMLInputElement;
    fireEvent.change(goalInput, { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar metas/i }));

    await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalledTimes(1));
    const [id, patch] = mockUpdateAsync.mock.calls[0];
    expect(id).toBe("1");
    expect(patch.targetMonthlyIncome).toBeNull();
  });
});
