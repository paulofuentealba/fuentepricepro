// @vitest-environment jsdom
/**
 * Integration test for prompt 83 — exercises the REAL hook flow
 * (`useWatchlistCsvImport().handleFile`), not just the parser in isolation.
 * This is the test that was missing from prompt 81: it validates the format
 * *detection* layer that runs before `parseTransactionTemplateCsv`, which is
 * exactly where the regex-vs-parser drift bug lived.
 *
 * The header below ("Ativo,Data do lançamento,...,Preço unitário,...") is a
 * synthetic reproduction of the real broker export header that triggered the
 * bug (see docs/Prompts/83 — Corrigir Deteccao de Formato CSV.md). The real
 * personal CSV file is never committed to the repo.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useWatchlistCsvImport } from "@/components/ceiling/watchlist/useWatchlistCsvImport";
import type { Asset } from "@/lib/domain";
import type { WatchlistItem } from "@/lib/watchlist";
import type { Transaction } from "@/lib/transactions";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const upsertTransactionMock = vi.fn(async (tx: Transaction) => tx);
let mockTransactions: Transaction[] = [];

vi.mock("@/lib/transactions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/transactions")>("@/lib/transactions");
  return {
    ...actual,
    useTransactions: () => ({
      transactions: mockTransactions,
      upsert: upsertTransactionMock,
    }),
  };
});

function makeAsset(ticker: string): Asset {
  return {
    ticker,
    name: ticker,
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 100,
    epsCurrent: null,
    metrics: {},
    paymentMonths: [],
    dividendHistory: [],
    dividends3y: [],
  } as unknown as Asset;
}

function buildQueryClient(tickers: string[]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  for (const ticker of tickers) {
    qc.setQueryData(["asset", ticker.toUpperCase()], makeAsset(ticker));
  }
  qc.setQueryData(["ipcaFiveYearAverage"], 0.04);
  return qc;
}

function makeCsvFile(text: string): File {
  return new File([text], "import.csv", { type: "text/csv" });
}

describe("useWatchlistCsvImport — end-to-end handleFile (prompt 83 regression)", () => {
  beforeEach(() => {
    upsertTransactionMock.mockClear();
    mockTransactions = [];
  });

  it("imports a real-shaped PT-BR broker export (advanced template, non-standard headers) through the full hook flow", async () => {
    const csv = [
      "Ativo,Data do lançamento,Quantidade,Preço unitário,Tipo de ordem",
      "PETR4,17-06-26,10,\"R$ 8,65\",Compra",
      "VALE3,08-06-26,5,\"R$ 105,80\",Compra",
      "ITUB4,01-06-26,20,\"R$ 30,10\",Venda",
    ].join("\r\n");

    const items: WatchlistItem[] = [];
    const onImport = vi.fn((item: WatchlistItem) => items.push(item));
    const qc = buildQueryClient(["PETR4", "VALE3", "ITUB4"]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useWatchlistCsvImport([], onImport), { wrapper });

    let importSuccess: boolean | undefined;
    await act(async () => {
      importSuccess = await result.current.handleFile(makeCsvFile(csv));
    });

    expect(importSuccess).toBe(true);
    expect(upsertTransactionMock).toHaveBeenCalledTimes(3);
    expect(onImport).toHaveBeenCalledTimes(3);
    expect(items.map((i) => i.ticker).sort()).toEqual(["ITUB4", "PETR4", "VALE3"]);
  });

  it("still imports the Phase 1 simple watchlist format through the full hook flow and returns true", async () => {
    const csv = ["Ticker,Type,Quantity,AveragePrice", "PETR4,STOCK_BR,10,30.5"].join("\n");

    const items: WatchlistItem[] = [];
    const onImport = vi.fn((item: WatchlistItem) => items.push(item));
    const qc = buildQueryClient(["PETR4"]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useWatchlistCsvImport([], onImport), { wrapper });

    let importSuccess: boolean | undefined;
    await act(async () => {
      importSuccess = await result.current.handleFile(makeCsvFile(csv));
    });

    expect(importSuccess).toBe(true);
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(items[0].ticker).toBe("PETR4");
  });

  it("returns false when the CSV has no valid rows", async () => {
    const csv = "ColA,ColB\n1,2";

    const items: WatchlistItem[] = [];
    const onImport = vi.fn((item: WatchlistItem) => items.push(item));
    const qc = buildQueryClient([]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useWatchlistCsvImport([], onImport), { wrapper });

    let importSuccess: boolean | undefined;
    await act(async () => {
      importSuccess = await result.current.handleFile(makeCsvFile(csv));
    });

    expect(importSuccess).toBe(false);
    expect(onImport).not.toHaveBeenCalled();
  });
});
