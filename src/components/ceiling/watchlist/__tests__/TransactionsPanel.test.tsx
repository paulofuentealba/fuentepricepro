// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TransactionsPanel } from "../TransactionsPanel";
import { dict, type Locale } from "@/lib/i18n";
import type { WatchlistItem } from "@/lib/watchlist";
import type { Transaction } from "@/lib/transactions";

let currentLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

const mockTxs: Transaction[] = [
  {
    id: "tx-1",
    ticker: "BBAS3",
    type: "buy",
    date: 1704067200000,
    quantity: 100,
    pricePerShare: 25.0,
    notes: "",
  },
];

vi.mock("@/lib/transactions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/transactions")>();
  return {
    ...actual,
    useTransactions: () => ({
      transactions: mockTxs,
      upsert: vi.fn(),
      remove: vi.fn(),
    }),
  };
});

vi.mock("@/lib/watchlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watchlist")>();
  return {
    ...actual,
    useWatchlist: () => ({
      updateAsync: vi.fn(),
    }),
  };
});

const mockItem: WatchlistItem = {
  id: "stock:bbas3",
  ticker: "BBAS3",
  name: "Banco do Brasil",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 28.5,
  ceilingPrice: 35.0,
  safetyMargin: 22.8,
  targetYield: 6.0,
  annualDividend: 2.79,
  quantity: 100,
  averagePrice: 25.0,
  paymentMonths: [3, 6, 9, 12],
  payoutRatio: 45,
  addedAt: 1704067200000,
  investingSince: 1704067200000,
};

function renderWithLocale(locale: Locale) {
  currentLocale = locale;
  return render(<TransactionsPanel item={mockItem} />);
}

describe("TransactionsPanel i18n", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders localized running balance in Portuguese (ptBR)", () => {
    renderWithLocale("ptBR");
    expect(screen.getByText("Saldo: 100 cotas")).toBeInTheDocument();
  });

  it("renders localized running balance in English (en)", () => {
    renderWithLocale("en");
    expect(screen.getByText("Balance: 100 shares")).toBeInTheDocument();
  });

  it("renders localized running balance in Spanish (es)", () => {
    renderWithLocale("es");
    expect(screen.getByText("Saldo: 100 acciones")).toBeInTheDocument();
  });
});
