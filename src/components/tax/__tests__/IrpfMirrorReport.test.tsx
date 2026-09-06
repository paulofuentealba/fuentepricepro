// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n-provider";
import { IrpfMirrorReport } from "../IrpfMirrorReport";
import type { TaxRealityContext } from "@/lib/tax/buildTaxContext";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

describe("IrpfMirrorReport", () => {
  afterEach(() => {
    cleanup();
  });
  const mockValuedItems: ValuedWatchlistItem[] = [
    {
      id: "1",
      ticker: "PETR4",
      name: "Petrobras PN",
      type: "STOCK_BR",
      currency: "BRL",
      quantity: 100,
      averagePrice: 30,
      currentPrice: 38,
      livePrice: 38,
      annualDividend: 3.5,
      targetYield: 0.08,
      isClosedPosition: false,
      isBffMode: true,
      sector: "Petróleo",
      valuation: {} as any,
    } as ValuedWatchlistItem,
  ];

  const mockContext: TaxRealityContext = {
    assetTypeByTicker: new Map([["PETR4", "STOCK_BR"]]),
    currencyByTicker: new Map([["PETR4", "BRL"]]),
    isFixedIncomeEtfByTicker: new Map(),
    transactions: [],
    realizedGainEvents: [],
    currentYear: 2026,
    currentMonthKey: "2026-09",
    brDividendsTaxResult: {
      jurisdiction: "BR",
      positions: [
        { ticker: "PETR4", grossAmount: 350, netAmount: 350, type: "STOCK_BR", jurisdiction: "BR", currency: "BRL", withheldTax: 0, taxRate: 0 },
      ],
      totalGross: 350,
      totalNet: 350,
      totalTax: 0,
      effectiveTaxRate: 0,
      calculatedAt: "2026-09-06",
    },
    jcpTaxResult: {
      jurisdiction: "BR",
      positions: [
        { ticker: "PETR4", grossAmount: 100, netAmount: 85, withheldTax: 15, type: "STOCK_BR", jurisdiction: "BR", currency: "BRL", taxRate: 0.15 },
      ],
      totalGross: 100,
      totalNet: 85,
      totalTax: 15,
      effectiveTaxRate: 0.15,
      calculatedAt: "2026-09-06",
    },
    usWithholdingTaxResult: {
      jurisdiction: "US",
      positions: [],
      totalGross: 0,
      totalNet: 0,
      totalTax: 0,
      effectiveTaxRate: 0,
      calculatedAt: "2026-09-06",
    },
    foreignCapitalGainsResults: [],
    fxRate: 5.5,
    totalNetDividends: 350,
    totalNetJcp: 85,
    totalNetUsBrl: 0,
    totalDividendNet: 435,
    totalWithheldTax: 15,
  };

  it("renders Bens e Direitos tab with PETR4 discrimination and copy button", () => {
    render(<IrpfMirrorReport valuedItems={mockValuedItems} context={mockContext} />);

    expect(screen.getByTestId("irpf-mirror-report")).toBeInTheDocument();
    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.getByText(/100 ações de PETR4/)).toBeInTheDocument();
    expect(screen.getByText("Copiar Discriminação")).toBeInTheDocument();
  });

  it("displays explicit Brazilian fiscal legal compliance notice", () => {
    render(<IrpfMirrorReport valuedItems={mockValuedItems} context={mockContext} />);

    expect(screen.getByText(/Nota de Conformidade/i)).toBeInTheDocument();
    expect(screen.getByText(/exclusivamente em português/i)).toBeInTheDocument();
  });

  it("translates UI into English while keeping discrimination text strictly in Portuguese", () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => "en"),
        setItem: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
    render(
      <I18nProvider>
        <IrpfMirrorReport valuedItems={mockValuedItems} context={mockContext} />
      </I18nProvider>
    );

    expect(screen.getByText("IRPF Tax Mirror (Ready to Copy)")).toBeInTheDocument();
    expect(screen.getByText(/Assets & Rights/)).toBeInTheDocument();
    expect(screen.getByText(/Exempt Income/)).toBeInTheDocument();
    expect(screen.getByText(/Exclusive \/ JCP/)).toBeInTheDocument();
    expect(screen.getByText("Copy Description")).toBeInTheDocument();

    expect(screen.getByText(/generated exclusively in Portuguese to comply with Brazilian Federal Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/100 ações de PETR4/)).toBeInTheDocument();
  });
});
