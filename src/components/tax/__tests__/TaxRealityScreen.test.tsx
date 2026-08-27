// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TaxRealityScreen } from "../TaxRealityScreen";
import { dict } from "@/lib/i18n";
import type { TaxRealityContext } from "@/lib/tax/buildTaxContext";
import type { AssetType } from "@/lib/domain";

// Mock tanstack router Link and useLocation
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/app/realidade-fiscal" }),
}));

// Mock i18n
vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({ locale: "ptBR", setLocale: () => {}, t: dict.ptBR }),
}));

afterEach(() => {
  cleanup();
});

function createMockTaxContext(overrides: Partial<TaxRealityContext> = {}): TaxRealityContext {
  const emptyTaxResult = {
    jurisdiction: "BR" as const,
    totalGross: 0,
    totalNet: 0,
    totalTax: 0,
    effectiveTaxRate: 0,
    positions: [],
    calculatedAt: "2026-08-27T00:00:00.000Z",
  };

  return {
    assetTypeByTicker: new Map(),
    realizedGainEvents: [],
    currentYear: 2026,
    currentMonthKey: "2026-08",
    brDividendsTaxResult: emptyTaxResult,
    jcpTaxResult: emptyTaxResult,
    usWithholdingTaxResult: { ...emptyTaxResult, jurisdiction: "US" },
    totalNetDividends: 0,
    totalNetJcp: 0,
    totalNetUsBrl: 0,
    totalDividendNet: 0,
    totalWithheldTax: 0,
    ...overrides,
  };
}

describe("TaxRealityScreen (Prompt 142 / Item 2.2)", () => {
  it("renders loading state with disclaimer", () => {
    const context = createMockTaxContext();
    render(<TaxRealityScreen context={context} isLoading={true} />);

    // Disclaimer must be visible during loading
    expect(screen.getByText(dict.ptBR.regulatoryDisclaimer.tax)).toBeInTheDocument();
  });

  it("renders empty state when there are no sales in the current year", () => {
    const context = createMockTaxContext();
    render(<TaxRealityScreen context={context} isLoading={false} />);

    expect(screen.getByText(dict.ptBR.taxRealityScreen.emptyStateTitle)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.taxRealityScreen.emptyStateDesc)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.regulatoryDisclaimer.tax)).toBeInTheDocument();
  });

  it("renders summary cards, stock table, FII table, declared limits, and disclaimer when sales exist", () => {
    const assetTypeByTicker = new Map<string, AssetType>([
      ["PETR4", "STOCK_BR"],
      ["HGLG11", "FII"],
    ]);

    const context = createMockTaxContext({
      assetTypeByTicker,
      totalDividendNet: 1500,
      totalNetDividends: 1000,
      totalNetJcp: 500,
      realizedGainEvents: [
        // Stock sale in 2026-08 (exempt under 20k)
        {
          ticker: "PETR4",
          saleDate: new Date(2026, 7, 10).getTime(),
          quantity: 100,
          salePrice: 30,
          proceeds: 3000,
          costBasis: 2000,
          gain: 1000,
        },
        // FII sale in 2026-08 (taxed at 20% flat)
        {
          ticker: "HGLG11",
          saleDate: new Date(2026, 7, 15).getTime(),
          quantity: 20,
          salePrice: 170,
          proceeds: 3400,
          costBasis: 3000,
          gain: 400,
        },
      ],
    });

    render(<TaxRealityScreen context={context} isLoading={false} />);

    // 1. Headers & Title
    expect(screen.getAllByText(dict.ptBR.taxRealityScreen.title).length).toBeGreaterThan(0);

    // 2. Summary cards (Dividends, Stock CG, FII CG, Total Tax)
    expect(screen.getByText(dict.ptBR.taxRealityScreen.summary.dividendsLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.taxRealityScreen.summary.stockCgLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.taxRealityScreen.summary.fiiCgLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.taxRealityScreen.summary.totalTaxLabel)).toBeInTheDocument();

    // 3. Monthly tables
    expect(screen.getByText(dict.ptBR.taxRealityScreen.monthlyDetail.stocksTitle)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.taxRealityScreen.monthlyDetail.fiisTitle)).toBeInTheDocument();

    // 4. Declared limits section (mandatory, non-dismissible)
    expect(screen.getByText(dict.ptBR.taxRealityScreen.limitsDeclared.title)).toBeInTheDocument();
    for (const item of dict.ptBR.taxRealityScreen.limitsDeclared.items) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }

    // 5. Disclaimer
    expect(screen.getByText(dict.ptBR.regulatoryDisclaimer.tax)).toBeInTheDocument();
  });

  it("renders unclassified warning banner when tickers cannot be resolved", () => {
    // Ticker UNK3 is not in assetTypeByTicker
    const context = createMockTaxContext({
      assetTypeByTicker: new Map(),
      realizedGainEvents: [
        {
          ticker: "UNK3",
          saleDate: new Date(2026, 7, 10).getTime(),
          quantity: 100,
          salePrice: 10,
          proceeds: 1000,
          costBasis: 800,
          gain: 200,
        },
      ],
    });

    render(<TaxRealityScreen context={context} isLoading={false} />);

    expect(screen.getByText(dict.ptBR.taxRealityScreen.unclassified.title)).toBeInTheDocument();
    expect(screen.getByText("UNK3")).toBeInTheDocument();
  });

  it("renders ETF metric card and ETF monthly table when ETF sales exist in the current year", () => {
    const assetTypeByTicker = new Map<string, AssetType>([
      ["BOVA11", "ETF"],
    ]);

    const context = createMockTaxContext({
      assetTypeByTicker,
      realizedGainEvents: [
        {
          ticker: "BOVA11",
          saleDate: new Date(2026, 7, 10).getTime(),
          quantity: 50,
          salePrice: 120,
          proceeds: 6000,
          costBasis: 5000,
          gain: 1000,
        },
      ],
    });

    render(<TaxRealityScreen context={context} isLoading={false} />);

    // ETF Summary metric card
    expect(screen.getByText(dict.ptBR.taxRealityScreen.summary.etfCgLabel)).toBeInTheDocument();
    // ETF Monthly detail table
    expect(screen.getByText(dict.ptBR.taxRealityScreen.monthlyDetail.etfsTitle)).toBeInTheDocument();
  });
});

