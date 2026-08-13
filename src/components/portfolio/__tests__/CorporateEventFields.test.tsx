// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { CorporateEventFields } from "../CorporateEventFields";
import type { WatchlistItem } from "@/lib/watchlist";

const mockUpsertAsync = vi.fn().mockResolvedValue(undefined);
const mockUpsertTransaction = vi.fn().mockResolvedValue(undefined);
let mockTransactions: any[] = [];

vi.mock("@/lib/watchlist", async () => {
  const actual = await vi.importActual<any>("@/lib/watchlist");
  return {
    ...actual,
    useWatchlist: () => ({ upsertAsync: mockUpsertAsync }),
  };
});

vi.mock("@/lib/transactions", async () => {
  const actual = await vi.importActual<any>("@/lib/transactions");
  return {
    ...actual,
    useTransactions: () => ({ transactions: mockTransactions, upsert: mockUpsertTransaction }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockTransactions = [];
});

const item: WatchlistItem = {
  id: "1",
  ticker: "VALE3",
  name: "Vale",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 60,
  annualDividend: 4,
  targetYield: 6,
  ceilingPrice: 66,
  safetyMargin: 5,
  quantity: 100,
  averagePrice: 50,
  paymentMonths: [],
  payoutRatio: null,
  addedAt: Date.now(),
  investingSince: Date.now(),
};

describe("CorporateEventFields — Evento Corporativo (inline, migrado de CorporateEventModal)", () => {
  it("calcula o factor correto para um split e persiste item + evento pendente aplicado (sem ledger de transações)", async () => {
    mockTransactions = [];
    render(
      <CorporateEventFields
        item={item}
        pendingEvent={{ eventId: "ev1", date: 123, type: "split", ratio: 4 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /aplicar/i }));

    await waitFor(() => expect(mockUpsertAsync).toHaveBeenCalledTimes(1));
    const updatedItem = mockUpsertAsync.mock.calls[0][0];
    // Split 1:4 → quantity *4, averagePrice /4
    expect(updatedItem.quantity).toBe(400);
    expect(updatedItem.averagePrice).toBeCloseTo(12.5, 2);
    expect(updatedItem.appliedEvents).toEqual([
      { eventId: "ev1", date: 123, type: "split", ratio: 4 },
    ]);
    expect(mockUpsertTransaction).not.toHaveBeenCalled();
  });

  it("cria uma transação corporate_action idempotente (id corp-<eventId>) quando o ticker já possui lançamentos no ledger", async () => {
    mockTransactions = [
      { id: "tx1", ticker: "VALE3", type: "buy", date: 100, quantity: 100, pricePerShare: 50 },
    ];
    render(
      <CorporateEventFields
        item={item}
        pendingEvent={{ eventId: "ev2", date: 456, type: "split", ratio: 4 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /aplicar/i }));

    await waitFor(() => expect(mockUpsertTransaction).toHaveBeenCalledTimes(1));
    const tx = mockUpsertTransaction.mock.calls[0][0];
    expect(tx.id).toBe("corp-ev2");
    expect(tx.type).toBe("corporate_action");
    expect(tx.factor).toBe(4);

    await waitFor(() => expect(mockUpsertAsync).toHaveBeenCalledTimes(1));
  });

  it("calcula o factor inverso (1/ratio) para um grupamento", async () => {
    mockTransactions = [];
    render(
      <CorporateEventFields
        item={item}
        pendingEvent={{ eventId: "ev3", date: 789, type: "grouping", ratio: 10 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /aplicar/i }));

    await waitFor(() => expect(mockUpsertAsync).toHaveBeenCalledTimes(1));
    const updatedItem = mockUpsertAsync.mock.calls[0][0];
    // Grouping 10:1 → quantity /10, averagePrice *10
    expect(updatedItem.quantity).toBe(10);
    expect(updatedItem.averagePrice).toBeCloseTo(500, 2);
  });
});
