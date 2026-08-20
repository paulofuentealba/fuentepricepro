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

    // Passo 1: Clicar em Aplicar Evento para abrir o modal de confirmação
    fireEvent.click(screen.getByRole("button", { name: /^aplicar evento$/i }));

    // Passo 2: Confirmar no modal de 2 passos
    fireEvent.click(screen.getByRole("button", { name: /confirmar e aplicar/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /^aplicar evento$/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirmar e aplicar/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /^aplicar evento$/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirmar e aplicar/i }));

    await waitFor(() => expect(mockUpsertAsync).toHaveBeenCalledTimes(1));
    const updatedItem = mockUpsertAsync.mock.calls[0][0];
    // Grouping 10:1 → quantity /10, averagePrice *10
    expect(updatedItem.quantity).toBe(10);
    expect(updatedItem.averagePrice).toBeCloseTo(500, 2);
  });

  it("não executa o submit sem passar pela confirmação do modal de 2 passos", async () => {
    mockTransactions = [];
    render(
      <CorporateEventFields
        item={item}
        pendingEvent={{ eventId: "ev4", date: 111, type: "split", ratio: 2 }}
      />,
    );

    // Clica apenas no botão principal de abrir o modal
    fireEvent.click(screen.getByRole("button", { name: /^aplicar evento$/i }));

    // O modal deve estar aberto exibindo o botão de confirmação
    expect(screen.getByRole("button", { name: /confirmar e aplicar/i })).toBeInTheDocument();

    // Nada deve ter sido persistido ainda
    expect(mockUpsertAsync).not.toHaveBeenCalled();
    expect(mockUpsertTransaction).not.toHaveBeenCalled();
  });

  it("cancela a operação e não grava nada quando o usuário clica em Cancelar no modal", async () => {
    mockTransactions = [];
    render(
      <CorporateEventFields
        item={item}
        pendingEvent={{ eventId: "ev5", date: 222, type: "split", ratio: 2 }}
      />,
    );

    // Passo 1: Abrir modal
    fireEvent.click(screen.getByRole("button", { name: /^aplicar evento$/i }));

    // Passo 2: Clicar em Cancelar
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    // Persistência não pode ter sido chamada
    expect(mockUpsertAsync).not.toHaveBeenCalled();
    expect(mockUpsertTransaction).not.toHaveBeenCalled();
  });
});
