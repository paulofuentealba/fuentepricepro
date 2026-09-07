// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n-provider";
import { UsTax1099Report } from "../UsTax1099Report";
import type { TaxRealityContext } from "@/lib/tax/buildTaxContext";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Transaction } from "@/lib/transactionsLogic";
import type { RealizedIncomeEvent } from "@/lib/realizedIncome";

describe("UsTax1099Report Component", () => {
  afterEach(() => {
    cleanup();
  });

  const mockValuedItems: ValuedWatchlistItem[] = [
    {
      id: "1",
      ticker: "AAPL",
      name: "Apple Inc.",
      type: "STOCK_US",
      currency: "USD",
      quantity: 100,
      averagePrice: 150,
      currentPrice: 200,
      livePrice: 200,
      annualDividend: 1.0,
      targetYield: 0.02,
      accountType: "taxable",
      isClosedPosition: false,
      isBffMode: true,
      sector: "Technology",
      valuation: {} as any,
    } as ValuedWatchlistItem,
    {
      id: "2",
      ticker: "O",
      name: "Realty Income Corp",
      type: "REIT",
      currency: "USD",
      quantity: 100,
      averagePrice: 50,
      currentPrice: 55,
      livePrice: 55,
      annualDividend: 3.0,
      targetYield: 0.05,
      accountType: "taxable",
      isClosedPosition: false,
      isBffMode: true,
      sector: "Real Estate",
      valuation: {} as any,
    } as ValuedWatchlistItem,
    {
      id: "3",
      ticker: "VOO",
      name: "Vanguard S&P 500 ETF",
      type: "ETF_US",
      currency: "USD",
      quantity: 50,
      averagePrice: 400,
      currentPrice: 480,
      livePrice: 480,
      annualDividend: 6.0,
      targetYield: 0.015,
      accountType: "roth_ira",
      isClosedPosition: false,
      isBffMode: true,
      sector: "Blend",
      valuation: {} as any,
    } as ValuedWatchlistItem,
  ];

  const mockIncomeEvents: RealizedIncomeEvent[] = [
    {
      id: "inc_1",
      ticker: "AAPL",
      type: "dividend",
      taxType: "us_dividend",
      currency: "USD",
      amountGross: 100,
      amountNet: 70,
      amountWithheld: 30,
      paymentDate: "2026-05-15",
      exDate: "2026-05-01",
      isPaid: true,
      accountType: "taxable",
    },
    {
      id: "inc_2",
      ticker: "O",
      type: "dividend",
      taxType: "us_dividend",
      currency: "USD",
      amountGross: 200,
      amountNet: 140,
      amountWithheld: 60,
      paymentDate: "2026-06-15",
      exDate: "2026-06-01",
      isPaid: true,
      accountType: "taxable",
    },
    {
      id: "inc_3",
      ticker: "VOO",
      type: "dividend",
      taxType: "us_dividend",
      currency: "USD",
      amountGross: 300,
      amountNet: 300,
      amountWithheld: 0,
      paymentDate: "2026-07-15",
      exDate: "2026-07-01",
      isPaid: true,
      accountType: "roth_ira",
    },
  ];

  const mockTransactions: Transaction[] = [
    // AAPL bought in 2024, sold in 2026 -> Long term gain
    {
      id: "tx_1",
      ticker: "AAPL",
      type: "buy",
      date: new Date("2024-01-10").getTime(),
      quantity: 10,
      pricePerShare: 150,
      broker: "Fidelity",
      accountType: "taxable",
    },
    {
      id: "tx_2",
      ticker: "AAPL",
      type: "sell",
      date: new Date("2026-02-10").getTime(),
      quantity: 10,
      pricePerShare: 200,
      broker: "Fidelity",
      accountType: "taxable",
    },
  ];

  const mockContext: TaxRealityContext = {
    assetTypeByTicker: new Map([
      ["AAPL", "STOCK_US"],
      ["O", "REIT"],
      ["VOO", "ETF_US"],
    ]),
    currencyByTicker: new Map([
      ["AAPL", "USD"],
      ["O", "USD"],
      ["VOO", "USD"],
    ]),
    isFixedIncomeEtfByTicker: new Map(),
    transactions: mockTransactions,
    realizedIncomeEvents: mockIncomeEvents,
    realizedGainEvents: [],
    currentYear: 2026,
    currentMonthKey: "2026-09",
    brDividendsTaxResult: {} as any,
    jcpTaxResult: {} as any,
    usWithholdingTaxResult: {} as any,
    foreignCapitalGainsResults: [],
    fxRate: 5.5,
    totalNetDividends: 0,
    totalNetJcp: 0,
    totalNetUsBrl: 0,
    totalDividendNet: 0,
    totalWithheldTax: 0,
  };

  it("renders Form 1099 title, metric cards, and dividend rows", () => {
    render(
      <I18nProvider initialLocale="en">
        <UsTax1099Report
          valuedItems={mockValuedItems}
          context={mockContext}
          transactions={mockTransactions}
          currentYear={2026}
        />
      </I18nProvider>
    );

    // Title and badge
    expect(screen.getByText(/IRS Form 1099 Simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/US TAX RETURN/i)).toBeInTheDocument();

    // Box 1a total ordinary dividends = $100 (AAPL) + $200 (O) = $300 (taxable accounts)
    // Roth VOO ($300) is shielded
    expect(screen.getAllByText("Box 1a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("US$ 300.00").length).toBe(2);

    // Section 199A REIT dividend = $200 (O)
    expect(screen.getAllByText("US$ 200.00").length).toBeGreaterThan(0);

    // Table rows should contain AAPL and O
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getByText("Realty Income Corp")).toBeInTheDocument();
  });

  it("displays sales metrics on card and handles account filter", () => {
    render(
      <I18nProvider initialLocale="en">
        <UsTax1099Report
          valuedItems={mockValuedItems}
          context={mockContext}
          transactions={mockTransactions}
          currentYear={2026}
        />
      </I18nProvider>
    );

    // 1099-B Net Capital Gain card shows $500.00
    expect(screen.getByText("1099-B")).toBeInTheDocument();
    expect(screen.getByText("US$ 500.00")).toBeInTheDocument();

    // Estimated Roth Tax Savings card shows +$45.00
    expect(screen.getByText("+US$ 45.00")).toBeInTheDocument();
  });
});
