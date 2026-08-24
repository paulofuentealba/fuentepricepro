// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DividendHeatmapCard } from "../DividendHeatmapCard";
import { dict, type Locale } from "@/lib/i18n";
import type { Asset } from "@/lib/domain";

let currentLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

const mockAssetBRL: Asset = {
  ticker: "BBSE3",
  name: "BB Seguridade",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 35.0,
  dividends3y: [2.5, 3.0, 3.2],
  dividendHistory: [
    { year: 2024, amount: 3.0 },
  ],
  exDividendDate: "2024-08-15",
  epsCurrent: 4.0,
  epsNext: 4.5,
  paymentMonths: [2, 8],
  sector: "Finance",
  dividendEvents: [
    { exDate: "2024-02-01", paymentDate: "2024-02-20", amountPerShare: 1.5 },
  ],
  metrics: {
    eps: 4.0,
    roe: 50.0,
    payoutRatio: 80.0,
    pbRatio: 6.0,
    peRatio: 8.75,
    currentDy: 9.1,
    dividendCagr5y: 12.0,
    capRate: null,
    vacancy: null,
    expenseRatio: null,
    aum: null,
    trackingError: null,
  },
};

const mockAssetUSD: Asset = {
  ...mockAssetBRL,
  ticker: "O",
  currency: "USD",
  type: "REIT",
};

describe("DividendHeatmapCard i18n & locale formatting", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Portuguese header, short months, and BRL tooltip in ptBR", () => {
    currentLocale = "ptBR";
    render(<DividendHeatmapCard asset={mockAssetBRL} />);

    expect(screen.getByText("Ano")).toBeInTheDocument();
    expect(screen.getByText("Fev")).toBeInTheDocument();
    // Cell tooltip with BRL
    const cell = screen.getByTitle(/Fev 2024: R\$\s*1,50/);
    expect(cell).toBeInTheDocument();
  });

  it("renders English header, short months, and USD tooltip in en", () => {
    currentLocale = "en";
    render(<DividendHeatmapCard asset={mockAssetUSD} />);

    expect(screen.getByText("Year")).toBeInTheDocument();
    expect(screen.getByText("Feb")).toBeInTheDocument();
    // Cell tooltip with USD
    const cell = screen.getByTitle(/Feb 2024: US\$\s*1\.50/);
    expect(cell).toBeInTheDocument();
  });

  it("renders Spanish header and Spanish short months in es", () => {
    currentLocale = "es";
    render(<DividendHeatmapCard asset={mockAssetBRL} />);

    expect(screen.getByText("Año")).toBeInTheDocument();
    expect(screen.getByText("Ene")).toBeInTheDocument();
  });
});
