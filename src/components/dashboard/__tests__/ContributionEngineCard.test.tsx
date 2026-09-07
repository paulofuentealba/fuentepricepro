// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { ContributionEngineCard } from "../ContributionEngineCard";
import { dict } from "@/lib/i18n";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import * as askEngine from "@/lib/askEngine";

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

describe("ContributionEngineCard", () => {
  it("only passes owned positions (quantity > 0 and !isClosedPosition) to runAsk", () => {
    const runAskSpy = vi.spyOn(askEngine, "runAsk");

    const activeAsset = createMockItem({
      id: "active-1",
      ticker: "PETR4",
      quantity: 100,
      isClosedPosition: false,
    });
    const closedAsset = createMockItem({
      id: "closed-1",
      ticker: "CPTR11",
      quantity: 0,
      isClosedPosition: true,
    });

    render(
      <ContributionEngineCard
        valuedItems={[activeAsset, closedAsset]}
        settings={{ smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 } }}
        isLoading={false}
      />,
    );

    expect(runAskSpy).toHaveBeenCalled();
    const lastCallCtx = runAskSpy.mock.calls[runAskSpy.mock.calls.length - 1][0];
    const tickersPassed = lastCallCtx.positions.map((p) => p.ticker);

    expect(tickersPassed).toContain("PETR4");
    expect(tickersPassed).not.toContain("CPTR11");
  });
});
