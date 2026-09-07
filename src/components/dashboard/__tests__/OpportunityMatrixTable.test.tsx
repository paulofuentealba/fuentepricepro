// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { OpportunityMatrixTable } from "../OpportunityMatrixTable";
import { dict } from "@/lib/i18n";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({ locale: "ptBR", setLocale: () => {}, t: dict.ptBR }),
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
});
