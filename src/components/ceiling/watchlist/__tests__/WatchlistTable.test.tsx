// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { WatchlistTable } from "../WatchlistTable";
import type { WatchlistItem } from "@/lib/watchlist";
import { toast } from "sonner";

const mockUpdateAsync = vi.fn();

vi.mock("@/lib/watchlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watchlist")>();
  return {
    ...actual,
    useWatchlist: () => ({
      updateAsync: mockUpdateAsync,
    }),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockItems: WatchlistItem[] = [
  {
    id: "item-petr",
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
  },
  {
    id: "item-aapl",
    ticker: "AAPL",
    name: "Apple Inc.",
    type: "STOCK_US",
    currency: "USD",
    currentPrice: 220.0,
    quantity: 10.5,
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
  },
];

describe("WatchlistTable Batch Edit", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("preserves fractional share quantities during batch edit", async () => {
    mockUpdateAsync.mockResolvedValueOnce(undefined);

    render(<WatchlistTable items={mockItems} quotes={{}} />);

    // Click bulk edit ("Edição Rápida")
    fireEvent.click(screen.getByRole("button", { name: /edição rápida/i }));

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    // inputs[0] is avg for PETR4, inputs[1] is qty for PETR4
    // inputs[2] is avg for AAPL, inputs[3] is qty for AAPL
    const aaplQtyInput = inputs[3];
    expect(aaplQtyInput.value).toBe("10.5");

    fireEvent.change(aaplQtyInput, { target: { value: "15.75" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(mockUpdateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdateAsync).toHaveBeenCalledWith("item-aapl", {
      quantity: 15.75,
      averagePrice: 180.0,
    });
    expect(toast.success).toHaveBeenCalledWith("1 ativo(s) atualizado(s).");
  });

  it("does not silently zero out position when quantity input is invalid or empty, and notifies user", async () => {
    render(<WatchlistTable items={mockItems} quotes={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /edição rápida/i }));

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    const petrQtyInput = inputs[1];

    // Typo: user clears field
    fireEvent.change(petrQtyInput, { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "1 ativo(s) com valores inválidos foram ignorados e não foram alterados."
      );
    });

    // Does NOT update with quantity 0
    expect(mockUpdateAsync).not.toHaveBeenCalled();
  });

  it("rejects negative average price during batch edit and skips invalid asset", async () => {
    render(<WatchlistTable items={mockItems} quotes={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /edição rápida/i }));

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    const petrAvgInput = inputs[0];

    fireEvent.change(petrAvgInput, { target: { value: "-12.50" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "1 ativo(s) com valores inválidos foram ignorados e não foram alterados."
      );
    });

    expect(mockUpdateAsync).not.toHaveBeenCalled();
  });

  it("accepts zero averagePrice as valid number during batch edit", async () => {
    mockUpdateAsync.mockResolvedValueOnce(undefined);

    render(<WatchlistTable items={mockItems} quotes={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /edição rápida/i }));

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    const petrAvgInput = inputs[0];

    fireEvent.change(petrAvgInput, { target: { value: "0" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(mockUpdateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdateAsync).toHaveBeenCalledWith("item-petr", {
      quantity: 100,
      averagePrice: 0,
    });
  });
});
