// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { OpportunityMatrixTable } from "../OpportunityMatrixTable";
import { dict } from "@/lib/i18n";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

afterEach(() => {
  cleanup();
});

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({ locale: "ptBR", setLocale: () => {}, t: dict.ptBR }),
}));

vi.mock("@/lib/useMarketScope", () => ({
  useMarketScope: () => ({
    taxJurisdiction: "BR",
    isUS: false,
    hasBrPositions: true,
    hasUsPositions: false,
    isUSNative: false,
    isBRNative: true,
    isDual: false,
    defaultScreenerMarket: "ALL",
    visibleAllocationClasses: [
      "acoes_br",
      "fiis",
      "fiagros",
      "fi_infras",
      "reits_us",
      "etfs_us",
      "etfs_br",
      "acoes_us",
    ],
    priorityBrokers: [],
    secondaryBrokers: [],
  }),
}));

function createMockItem(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  const margin = overrides.safetyMargin ?? 30;
  const ceiling = overrides.ceilingPrice ?? 40;

  return {
    id: overrides.id ?? "1",
    ticker: overrides.ticker ?? "BBAS3",
    name: overrides.name ?? "Banco do Brasil",
    type: overrides.type ?? "STOCK_BR",
    currency: overrides.currency ?? "BRL",
    currentPrice: overrides.currentPrice ?? 28.5,
    livePrice: overrides.livePrice ?? 28.5,
    annualDividend: 2.7,
    targetYield: 6,
    ceilingPrice: ceiling,
    safetyMargin: margin,
    quantity: overrides.quantity ?? 100,
    averagePrice: 25.0,
    paymentMonths: [3, 6, 9, 12],
    payoutRatio: 40,
    sector: "Financeiro",
    addedAt: 1700000000000,
    investingSince: 1700000000000,
    isClosedPosition: overrides.isClosedPosition ?? false,
    isBffMode: true,
    valuation: {
      ticker: overrides.ticker ?? "BBAS3",
      activeCeiling: ceiling,
      margin: margin,
      fuenteConsensus: ceiling,
      methods: { bazin: ceiling, graham: 45.0, gordon: 40.0, lynch: null },
      assumptions: [],
      investorProfile: "moderate",
      bazin: ceiling,
      graham: 45.0,
      gordon: 40.0,
      lynch: null,
      gordonConfidence: "high",
      consensus: ceiling,
      dividendYield: 9.5,
      positive: true,
      isUnavailable: false,
      yieldTrapWarning: false,
      shareholderYield: null,
      ...(overrides.valuation || {}),
    },
    ...overrides,
  };
}

describe("OpportunityMatrixTable", () => {
  it("only displays owned positions (quantity > 0 and !isClosedPosition), omitting historical/closed assets", () => {
    const activeAsset = createMockItem({
      id: "active-1",
      ticker: "PETR4",
      name: "Petrobras",
      quantity: 100,
      isClosedPosition: false,
    });
    const closedAssetZeroQty = createMockItem({
      id: "closed-1",
      ticker: "CPTR11",
      name: "Capitania Agro",
      quantity: 0,
      isClosedPosition: true,
    });
    const closedAssetFlagged = createMockItem({
      id: "closed-2",
      ticker: "GRND3",
      name: "Grendene",
      quantity: 0,
      isClosedPosition: true,
    });

    render(
      <OpportunityMatrixTable
        valuedItems={[activeAsset, closedAssetZeroQty, closedAssetFlagged]}
        isLoading={false}
      />,
    );

    // Active asset is displayed in the table/cards
    expect(screen.getAllByText("PETR4").length).toBeGreaterThan(0);

    // Closed assets are NOT displayed
    expect(screen.queryByText("CPTR11")).toBeNull();
    expect(screen.queryByText("GRND3")).toBeNull();
  });

  it("filters items when a specific class chip is clicked", () => {
    const stockAsset = createMockItem({
      id: "active-stock",
      ticker: "PETR4",
      name: "Petrobras",
      type: "STOCK_BR",
      quantity: 100,
    });
    const fiiAsset = createMockItem({
      id: "active-fii",
      ticker: "HGLG11",
      name: "CSHG Logística",
      type: "FII",
      quantity: 50,
    });

    render(
      <OpportunityMatrixTable
        valuedItems={[stockAsset, fiiAsset]}
        isLoading={false}
      />,
    );

    // Both visible initially
    expect(screen.getAllByText("PETR4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HGLG11").length).toBeGreaterThan(0);

    // Click on FIIs chip
    fireEvent.click(screen.getByRole("button", { name: /FIIs/ }));

    // Now HGLG11 is visible and PETR4 is filtered out
    expect(screen.getAllByText("HGLG11").length).toBeGreaterThan(0);
    expect(screen.queryByText("PETR4")).toBeNull();
  });

  it("supports tri-state column sorting (asc -> desc -> default) and returns to margin descending", () => {
    const itemA = createMockItem({
      id: "item-a",
      ticker: "BBAS3",
      currentPrice: 20,
      safetyMargin: 15,
      valuation: { margin: 15, activeCeiling: 30, dividendYield: 8 } as any,
    });
    const itemB = createMockItem({
      id: "item-b",
      ticker: "VALE3",
      currentPrice: 60,
      safetyMargin: 25,
      valuation: { margin: 25, activeCeiling: 80, dividendYield: 5 } as any,
    });

    render(
      <OpportunityMatrixTable
        valuedItems={[itemA, itemB]}
        isLoading={false}
      />,
    );

    // Default: margin descending -> VALE3 (25%) before BBAS3 (15%)
    const tickerElements = screen.getAllByText(/BBAS3|VALE3/);
    expect(tickerElements[0].textContent).toContain("VALE3");

    // Click on "Preço" header (1st click -> asc)
    const priceHeaders = screen.getAllByRole("button", { name: /Preço/i });
    fireEvent.click(priceHeaders[0]);

    // Price asc: BBAS3 (20) should now come before VALE3 (60)
    const sortedAsc = screen.getAllByText(/BBAS3|VALE3/);
    expect(sortedAsc[0].textContent).toContain("BBAS3");

    // 2nd click -> desc: VALE3 (60) comes first
    fireEvent.click(priceHeaders[0]);
    const sortedDesc = screen.getAllByText(/BBAS3|VALE3/);
    expect(sortedDesc[0].textContent).toContain("VALE3");

    // 3rd click -> default: back to margin descending (VALE3 margin 25% first)
    fireEvent.click(priceHeaders[0]);
    const sortedDefault = screen.getAllByText(/BBAS3|VALE3/);
    expect(sortedDefault[0].textContent).toContain("VALE3");
  });
});
