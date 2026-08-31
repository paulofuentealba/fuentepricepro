// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BrokerNoteImportPage } from "../BrokerNoteImportPage";
import { dict, type Locale } from "@/lib/i18n";

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

const mockUpsertTransaction = vi.fn().mockResolvedValue(undefined);
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

const mockUpsertManyAsync = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/watchlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watchlist")>();
  return {
    ...actual,
    useWatchlist: () => ({
      upsertManyAsync: mockUpsertManyAsync,
    }),
  };
});

const mockSaveMappings = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/useIssuerTickerMappings", () => ({
  useIssuerTickerMappings: () => ({
    mappings: {},
    saveMappings: mockSaveMappings,
  }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({
      ensureQueryData: vi.fn().mockResolvedValue({
        ticker: "WEGE3",
        name: "WEG S.A.",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 45.0,
        metrics: {},
      }),
    }),
  };
});

vi.mock("@/lib/dataIngestion/b3Parser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dataIngestion/b3Parser")>();
  return {
    ...actual,
    parseB3BrokerNote: vi.fn(() => ({
      success: true,
      broker: "XP",
      trades: [
        { ticker: "WEGE3", quantity: 100, price: 45.0, date: "15/07/2026", type: "buy" as const },
        { ticker: "PETR4", quantity: 15, price: 30.0, date: "15/07/2026", type: "sell" as const },
      ],
      unresolvedTrades: [],
    })),
  };
});

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({ items: [{ str: "irrelevant — parseB3BrokerNote is mocked" }] }),
      }),
    }),
  }),
}));

function makeFile(name = "nota-2026-07-15.pdf") {
  return new File(["%PDF-1.4 fake content"], name, { type: "application/pdf" });
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BrokerNoteImportPage", () => {
  it("shows a review row per detected trade after a PDF is processed", async () => {
    const { container } = render(<BrokerNoteImportPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => expect(screen.getByText("WEGE3")).toBeInTheDocument());
    expect(screen.getByText("PETR4")).toBeInTheDocument();
  });

  it("writes a transaction per checked trade and consolidates the watchlist on confirm", async () => {
    const { container } = render(<BrokerNoteImportPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => expect(screen.getByText("WEGE3")).toBeInTheDocument());

    const confirmButton = screen.getByRole("button", { name: /confirmar 2 transações/i });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(mockUpsertTransaction).toHaveBeenCalledTimes(2));
    expect(mockUpsertTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: "WEGE3", type: "buy", quantity: 100, pricePerShare: 45.0 }),
    );
    expect(mockUpsertTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: "PETR4", type: "sell", quantity: 15, pricePerShare: 30.0 }),
    );

    await waitFor(() => expect(mockUpsertManyAsync).toHaveBeenCalledTimes(1));
    const importedItems = mockUpsertManyAsync.mock.calls[0][0];
    expect(importedItems.map((i: any) => i.ticker).sort()).toEqual(["PETR4", "WEGE3"]);

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/app/myportfolio" });
  });

  it("excludes an unchecked trade from the import", async () => {
    const { container } = render(<BrokerNoteImportPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => expect(screen.getByText("WEGE3")).toBeInTheDocument());

    // Uncheck the PETR4 row (its checkbox is the second one in the review list).
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    const confirmButton = await screen.findByRole("button", { name: /confirmar 1 transação/i });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(mockUpsertTransaction).toHaveBeenCalledTimes(1));
    expect(mockUpsertTransaction).toHaveBeenCalledWith(expect.objectContaining({ ticker: "WEGE3" }));
  });
});
