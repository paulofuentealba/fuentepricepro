// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AssetDynamicFaqAccordion } from "../AssetDynamicFaqAccordion";
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

const mockAsset: Asset = {
  ticker: "BBAS3",
  name: "Banco do Brasil",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 28.5,
  dividends3y: [2.1, 2.3, 2.5],
  dividendHistory: [
    { year: 2021, amount: 2.1 },
    { year: 2022, amount: 2.3 },
    { year: 2023, amount: 2.5 },
  ],
  exDividendDate: "2024-05-15",
  epsCurrent: 5.2,
  epsNext: 5.8,
  paymentMonths: [3, 6, 9, 12],
  sector: "Finance",
  dividendEvents: [],
  metrics: {
    peRatio: 4.5,
    pbRatio: 0.8,
    eps: 6.33,
    roe: 18.5,
    currentDy: 9.8,
    capRate: null,
    vacancy: null,
    expenseRatio: null,
    aum: null,
    trackingError: null,
    payoutRatio: 45.0,
    dividendCagr5y: 12.0,
  },
};

function renderWithLocale(locale: Locale) {
  currentLocale = locale;
  return render(<AssetDynamicFaqAccordion asset={mockAsset} />);
}

describe("AssetDynamicFaqAccordion i18n", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders localized title and subtitle in Portuguese (ptBR)", () => {
    renderWithLocale("ptBR");
    expect(screen.getByText("Dúvidas Frequentes")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Respostas diretas geradas a partir dos dados de mercado do ativo"
      )
    ).toBeInTheDocument();
  });

  it("renders localized title and subtitle in English (en)", () => {
    renderWithLocale("en");
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
    expect(
      screen.getByText("Direct factual answers generated from asset market data")
    ).toBeInTheDocument();
  });

  it("renders localized title and subtitle in Spanish (es)", () => {
    renderWithLocale("es");
    expect(screen.getByText("Preguntas Frecuentes")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Respuestas directas generadas a partir de los datos de mercado del activo"
      )
    ).toBeInTheDocument();
  });
});
