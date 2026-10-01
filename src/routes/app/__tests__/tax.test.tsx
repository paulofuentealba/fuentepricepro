// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Currency } from "@/lib/domain";

let mockMarketScope: {
  isUS: boolean;
  hasBrPositions: boolean;
  hasUsPositions: boolean;
  currency: Currency;
} = {
  isUS: false,
  hasBrPositions: true,
  hasUsPositions: true, // Brazilian investor holding US stocks (e.g. KO, AAPL)
  currency: "BRL",
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/lib/useFeatureGate", () => ({
  useFeatureGate: () => true,
}));

const mockValuedItems: ValuedWatchlistItem[] = [
  {
    id: "1",
    ticker: "BBAS3",
    name: "Banco do Brasil S.A.",
    type: "STOCK_BR",
    currency: "BRL",
    quantity: 100,
    averagePrice: 28,
    currentPrice: 27,
    livePrice: 27,
    annualDividend: 2.3,
    targetYield: 0.08,
    isClosedPosition: false,
    isBffMode: true,
    sector: "Financeiro",
    valuation: {} as any,
  } as ValuedWatchlistItem,
  {
    id: "2",
    ticker: "KO",
    name: "Coca-Cola Co.",
    type: "STOCK_US",
    currency: "USD",
    quantity: 50,
    averagePrice: 65,
    currentPrice: 70,
    livePrice: 70,
    annualDividend: 1.94,
    targetYield: 0.03,
    isClosedPosition: false,
    isBffMode: true,
    sector: "Bebidas",
    valuation: {} as any,
  } as ValuedWatchlistItem,
];

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: mockValuedItems,
    isAppLoading: false,
    fx: { USDBRL: 5.5 },
  }),
}));

vi.mock("@/lib/transactions", () => ({
  useTransactions: () => ({
    transactions: [],
    isLoading: false,
  }),
}));

vi.mock("@/lib/useRealizedIncomeSummary", () => ({
  useRealizedIncomeSummary: () => ({
    events: [],
    isLoading: false,
  }),
}));

vi.mock("@/lib/useMarketScope", () => ({
  useMarketScope: () => mockMarketScope,
}));

vi.mock("@/components/tax/TaxRealityScreen", () => ({
  TaxRealityScreen: () => <div data-testid="tax-reality-screen">TaxRealityScreen</div>,
}));

vi.mock("@/components/tax/IrpfMirrorReport", () => ({
  IrpfMirrorReport: () => <div data-testid="irpf-mirror-report">IrpfMirrorReport</div>,
}));

vi.mock("@/components/tax/UsTax1099Report", () => ({
  UsTax1099Report: () => <div data-testid="us-tax-1099-report">UsTax1099Report</div>,
}));

import { Route } from "../tax";

describe("/app/tax Route - Jurisdiction & Form 1099 Scoping", () => {
  beforeEach(() => {
    mockMarketScope = {
      isUS: false,
      hasBrPositions: true,
      hasUsPositions: true,
      currency: "BRL",
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("does NOT render IRS Form 1099 tab or content for Brazilian tax residents holding US assets", () => {
    mockMarketScope = {
      isUS: false,
      hasBrPositions: true,
      hasUsPositions: true,
      currency: "BRL",
    };

    const Component = (Route as any).component;
    render(
      <I18nProvider>
        <Component />
      </I18nProvider>
    );

    // Form 1099 should NOT exist in tab list or content
    expect(screen.queryByRole("tab", { name: /1099/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("us-tax-1099-report")).not.toBeInTheDocument();

    // Brazilian tabs MUST be present
    expect(screen.getByRole("tab", { name: /IRPF/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /DARF/i })).toBeInTheDocument();

    // Default active content is IrpfMirrorReport
    expect(screen.getByTestId("irpf-mirror-report")).toBeInTheDocument();
  });

  it("renders IRS Form 1099 tab and report as default for US tax residents", () => {
    mockMarketScope = {
      isUS: true,
      hasBrPositions: false,
      hasUsPositions: true,
      currency: "USD",
    };

    const Component = (Route as any).component;
    render(
      <I18nProvider>
        <Component />
      </I18nProvider>
    );

    // Form 1099 MUST be rendered
    expect(screen.getByRole("tab", { name: /1099/i })).toBeInTheDocument();
    expect(screen.getByTestId("us-tax-1099-report")).toBeInTheDocument();
  });
});
