// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AssetDetailSheet } from "../AssetDetailSheet";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { dict } from "@/lib/i18n";

import { TooltipProvider } from "@/components/ui/tooltip";

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: dict.ptBR,
    locale: "ptBR",
  }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: any = {}) => {
      const key = Array.isArray(options?.queryKey) ? options.queryKey[0] : "";
      if (key === "exchangeRate") {
        return {
          data: { USDBRL: 5.5 },
          isPending: false,
          isError: false,
        };
      }
      if (key === "quote") {
        return {
          data: { ticker: options?.queryKey?.[1] ?? "PETR4", price: 100 },
          isPending: false,
          isError: false,
        };
      }
      return {
        data: { ticker: "PETR4", price: 30 },
        isPending: false,
        isError: false,
      };
    },
  };
});

vi.mock("@/lib/useSelic", () => ({
  useSelic: () => ({ data: null }),
}));

vi.mock("@/lib/corporateEvents", () => ({
  usePendingEvents: () => ({ pendingEvent: null }),
}));

vi.mock("@/lib/transactions", () => ({
  useTransactions: () => ({
    transactions: [],
  }),
}));

vi.mock("../DividendsHistoryPanel", () => ({ DividendsHistoryPanel: () => <div /> }));
vi.mock("../FundamentalIndicatorsPanel", () => ({ FundamentalIndicatorsPanel: () => <div /> }));
vi.mock("@/components/ceiling/IndicatorGrid", () => ({ IndicatorGrid: () => <div /> }));
vi.mock("@/components/ceiling/result/DividendHistoryChart", () => ({ DividendHistoryChart: () => <div /> }));
vi.mock("../BuyAndHoldChecklistCard", () => ({ BuyAndHoldChecklistCard: () => <div /> }));
vi.mock("../AssetDynamicFaqAccordion", () => ({ AssetDynamicFaqAccordion: () => <div /> }));
vi.mock("../RetrospectiveSimulatorCard", () => ({ RetrospectiveSimulatorCard: () => <div /> }));
vi.mock("../ConsensusPyramid", () => ({ ConsensusPyramid: () => <div /> }));
vi.mock("../TransactionsPanel", () => ({ TransactionsPanel: () => <div /> }));
vi.mock("../AssetProjectionPanel", () => ({ AssetProjectionPanel: () => <div /> }));
vi.mock("../EditPositionFields", () => ({ EditPositionFields: () => <div /> }));
vi.mock("@/components/portfolio/CorporateEventFields", () => ({ CorporateEventFields: () => <div /> }));
vi.mock("@/components/shared/AssetCard", () => ({ AssetCard: () => <div /> }));

const mockItem: ValuedWatchlistItem = {
  id: "test-asset-1",
  ticker: "PETR4",
  name: "Petrobras PN",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 30.0,
  annualDividend: 3.0,
  targetYield: 6,
  ceilingPrice: 50.0,
  safetyMargin: 40.0,
  quantity: 100,
  averagePrice: 25.0,
  paymentMonths: [5, 8, 12],
  payoutRatio: 50,
  addedAt: new Date("2024-01-01").getTime(),
  investingSince: new Date("2024-01-01").getTime(),
  livePrice: 30.0,
  sector: "Petróleo e Gás",
  isClosedPosition: false,
  isBffMode: true,
  valuation: {
    margin: 40.0,
    activeCeiling: 50.0,
    isUnavailable: false,
    dividendYield: 10.0,
    bazin: 50.0,
    graham: 45.0,
    gordon: 48.0,
    consensus: 48.0,
    yieldTrapWarning: null,
    positive: true,
  } as any,
};

describe("AssetDetailSheet (Tier 1 / Item 5)", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renderiza a aba myPosition e aceita onUpdateInvestingSince sem acoplar AssetHoldings a useWatchlist", () => {
    const handleUpdateInvestingSince = vi.fn().mockResolvedValue(undefined);

    render(
      <TooltipProvider>
        <AssetDetailSheet
          item={mockItem}
          onClose={vi.fn()}
          initialTab="myPosition"
          onUpdateInvestingSince={handleUpdateInvestingSince}
        />
      </TooltipProvider>
    );

    expect(screen.getByText("Investindo desde:")).toBeDefined();
  });

  describe("Currency conversion header SSOT (Tier 1 / Item 7)", () => {
    it("displays converted BRL price in header when asset currency is USD and FX rate is available", () => {
      const usdItem: ValuedWatchlistItem = {
        ...mockItem,
        id: "test-asset-usd",
        ticker: "AAPL",
        name: "Apple Inc.",
        type: "STOCK_US",
        currency: "USD",
        currentPrice: 100.0,
        livePrice: 100.0,
      };

      render(
        <TooltipProvider>
          <AssetDetailSheet
            item={usdItem}
            onClose={vi.fn()}
          />
        </TooltipProvider>
      );

      // Converted: 100 * 5.5 = R$ 550,00
      expect(screen.getByText(/R\$\s*550,00/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(dict.ptBR.common.converted, "i"))).toBeInTheDocument();
    });

    it("does NOT display converted price in header when asset currency is BRL", () => {
      render(
        <TooltipProvider>
          <AssetDetailSheet
            item={mockItem}
            onClose={vi.fn()}
          />
        </TooltipProvider>
      );

      expect(screen.queryByText(new RegExp(dict.ptBR.common.converted, "i"))).not.toBeInTheDocument();
    });
  });
});
