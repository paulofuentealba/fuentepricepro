// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AddToWatchlistDialog } from "../AddToWatchlistDialog";
import type { Asset } from "@/lib/domain";
import { toast } from "sonner";

const mockUpsert = vi.fn();
const mockOpenAuthModal = vi.fn();
let mockUser: { uid: string } | null = { uid: "user-123" };
let mockWatchlistItems: any[] = [];

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

vi.mock("@/lib/auth-modal", () => ({
  useAuthModal: () => ({
    openAuthModal: mockOpenAuthModal,
  }),
}));

vi.mock("@/lib/watchlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watchlist")>();
  return {
    ...actual,
    useWatchlist: () => ({
      items: mockWatchlistItems,
      upsert: mockUpsert,
    }),
  };
});

vi.mock("@/lib/useFeatureGate", () => ({
  useFeatureGate: () => 20,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAsset: Asset = {
  ticker: "BBAS3",
  name: "Banco do Brasil",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 28.5,
  dividends3y: [2.5, 2.7, 3.0],
  dividendHistory: [],
  dividendEvents: [],
  exDividendDate: null,
  epsCurrent: 5.0,
  epsNext: 5.5,
  paymentMonths: [3, 6, 9, 12],
  metrics: {
    peRatio: 4.5,
    pbRatio: 0.8,
    eps: 5.0,
    bvps: 35.0,
    roe: 0.2,
    currentDy: 0.1,
    capRate: null,
    vacancy: null,
    expenseRatio: null,
    aum: null,
    trackingError: null,
    payoutRatio: 0.4,
    dividendCagr5y: 0.08,
  },
  sector: "Financeiro",
};

describe("AddToWatchlistDialog", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUser = { uid: "user-123" };
    mockWatchlistItems = [];
  });

  it("opens dialog when clicking Add button", () => {
    render(
      <AddToWatchlistDialog
        asset={mockAsset}
        targetYield={0.06}
        averagePrice={null}
      />
    );

    const addBtn = screen.getByRole("button", { name: /adicionar/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByLabelText(/quantidade/i)).toBeDefined();
  });

  it("rejects invalid or non-positive quantity", () => {
    render(
      <AddToWatchlistDialog
        asset={mockAsset}
        targetYield={0.06}
        averagePrice={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    const qtyInput = screen.getByLabelText(/quantidade/i);
    fireEvent.change(qtyInput, { target: { value: "0" } });

    const saveBtn = screen.getByRole("button", { name: /salvar/i });
    fireEvent.click(saveBtn);

    expect(toast.error).toHaveBeenCalledWith("Insira uma quantidade válida maior que zero.");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects negative average price with dedicated toast", () => {
    render(
      <AddToWatchlistDialog
        asset={mockAsset}
        targetYield={0.06}
        averagePrice={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    fireEvent.change(screen.getByLabelText(/quantidade/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText(/preço médio/i), { target: { value: "-15.50" } });

    const saveBtn = screen.getByRole("button", { name: /salvar/i });
    fireEvent.click(saveBtn);

    expect(toast.error).toHaveBeenCalledWith("Insira um preço médio válido (zero ou positivo).");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects negative target monthly income with dedicated toast", () => {
    render(
      <AddToWatchlistDialog
        asset={mockAsset}
        targetYield={0.06}
        averagePrice={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    fireEvent.change(screen.getByLabelText(/quantidade/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText(/preço médio/i), { target: { value: "25.00" } });
    fireEvent.change(screen.getByLabelText(/meta de renda mensal/i), { target: { value: "-50" } });

    const saveBtn = screen.getByRole("button", { name: /salvar/i });
    fireEvent.click(saveBtn);

    expect(toast.error).toHaveBeenCalledWith("Insira uma meta de renda mensal válida (zero ou positiva).");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("allows zero averagePrice and zero targetMonthlyIncome legitimately", () => {
    render(
      <AddToWatchlistDialog
        asset={mockAsset}
        targetYield={0.06}
        averagePrice={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    fireEvent.change(screen.getByLabelText(/quantidade/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText(/preço médio/i), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText(/meta de renda mensal/i), { target: { value: "0" } });

    const saveBtn = screen.getByRole("button", { name: /salvar/i });
    fireEvent.click(saveBtn);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 100,
        averagePrice: 0,
        targetMonthlyIncome: null,
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Ativo adicionado com sucesso.");
  });

  it("successfully saves valid positive inputs to watchlist", () => {
    render(
      <AddToWatchlistDialog
        asset={mockAsset}
        targetYield={0.06}
        averagePrice={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    fireEvent.change(screen.getByLabelText(/quantidade/i), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText(/preço médio/i), { target: { value: "26.40" } });
    fireEvent.change(screen.getByLabelText(/meta de renda mensal/i), { target: { value: "150" } });

    const saveBtn = screen.getByRole("button", { name: /salvar/i });
    fireEvent.click(saveBtn);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: "BBAS3",
        quantity: 200,
        averagePrice: 26.4,
        targetMonthlyIncome: 150,
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Ativo adicionado com sucesso.");
  });
});
