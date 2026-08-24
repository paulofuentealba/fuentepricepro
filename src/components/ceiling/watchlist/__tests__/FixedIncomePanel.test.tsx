// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FixedIncomePanel } from "../FixedIncomePanel";
import { dict, type Locale } from "@/lib/i18n";
import type { WatchlistItem } from "@/lib/watchlist";

let currentLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: { cdi: 10.5, selic: 10.75, ipca: 4.5 },
      isLoading: false,
    }),
  };
});

const mockItem: WatchlistItem = {
  id: "fi:cdb_inter",
  ticker: "CDB Inter 110%",
  name: "CDB Banco Inter",
  type: "FIXED_INCOME",
  currency: "BRL",
  currentPrice: 1000,
  ceilingPrice: 1000,
  safetyMargin: 0,
  targetYield: 10,
  annualDividend: 0,
  quantity: 1,
  averagePrice: 1000,
  paymentMonths: [],
  payoutRatio: null,
  addedAt: 1704067200000,
  investingSince: 1704067200000,
  indexer: "CDI",
  rate: 110,
  maturityDate: "2026-12-31",
};

function renderWithLocale(locale: Locale) {
  currentLocale = locale;
  return render(<FixedIncomePanel item={mockItem} />);
}

describe("FixedIncomePanel i18n", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders CDI rate localized in Portuguese (ptBR)", () => {
    renderWithLocale("ptBR");
    expect(screen.getByText("110% do CDI")).toBeInTheDocument();
  });

  it("renders CDI rate localized in English (en)", () => {
    renderWithLocale("en");
    expect(screen.getByText("110% of CDI")).toBeInTheDocument();
  });

  it("renders CDI rate localized in Spanish (es)", () => {
    renderWithLocale("es");
    expect(screen.getByText("110% del CDI")).toBeInTheDocument();
  });
});
