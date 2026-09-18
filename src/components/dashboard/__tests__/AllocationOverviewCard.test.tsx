// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { AllocationOverviewCard } from "../AllocationOverviewCard";
import { dict } from "@/lib/i18n";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({ locale: "ptBR", setLocale: () => {}, t: dict.ptBR }),
}));

vi.mock("@/lib/useMarketScope", () => ({
  useMarketScope: () => ({
    isUSNative: false,
    taxJurisdiction: "BR",
    visibleAllocationClasses: ["acoes_br", "fiis", "fiagros", "fi_infras", "reits_us", "etfs_us", "etfs_br", "acoes_us"],
  }),
}));

function createMockItem(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  const price = overrides.livePrice ?? overrides.currentPrice ?? 21.5;
  return {
    id: overrides.id ?? "1",
    ticker: overrides.ticker ?? "PETR4",
    name: overrides.name ?? "Petrobras",
    type: overrides.type ?? "STOCK_BR",
    currency: overrides.currency ?? "BRL",
    currentPrice: price,
    livePrice: price,
    quantity: overrides.quantity ?? 100,
    isClosedPosition: overrides.isClosedPosition ?? false,
    addedAt: 1700000000000,
    investingSince: 1700000000000,
  } as ValuedWatchlistItem;
}

describe("AllocationOverviewCard", () => {
  it("renders canonical classes matching user's real targets and shows composition for multi-type classes", () => {
    const valuedItems: ValuedWatchlistItem[] = [
      createMockItem({
        id: "1",
        ticker: "PETR4",
        type: "STOCK_BR",
        quantity: 100,
        currentPrice: 21.5, // 2150 BRL (21.5%)
      }),
      createMockItem({
        id: "2",
        ticker: "HGLG11",
        type: "FII",
        quantity: 54.3,
        currentPrice: 100, // 5430 BRL (54.3%)
      }),
      createMockItem({
        id: "3",
        ticker: "JURO11",
        type: "FII_INFRA",
        quantity: 12.2,
        currentPrice: 100, // 1220 BRL (12.2%)
      }),
      createMockItem({
        id: "4",
        ticker: "VGIA11",
        type: "FIAGRO",
        quantity: 76,
        currentPrice: 10, // 760 BRL (7.6%)
      }),
      createMockItem({
        id: "5",
        ticker: "VOO",
        type: "ETF",
        currency: "USD",
        quantity: 1,
        currentPrice: 78, // 78 USD * 5 = 390 BRL (3.9%)
      }),
      createMockItem({
        id: "6",
        ticker: "AAPL",
        type: "STOCK_US",
        currency: "USD",
        quantity: 1,
        currentPrice: 10, // 10 USD * 5 = 50 BRL (0.5%)
      }),
    ];

    const targets = {
      STOCK_BR: 30,
      FII: 60,
      ETF: 10,
      STOCK_US: 0,
      REIT: 0,
      FIXED_INCOME: 0,
    };

    render(
      <AllocationOverviewCard
        valuedItems={valuedItems}
        smartAllocationTargets={targets}
        usdRate={5.0}
        isLoading={false}
      />,
    );

    // Header title check
    expect(screen.getByText("Alocação por Classe de Ativos")).toBeInTheDocument();

    // Check FII displays exact 60.0% target and ~74.1% current
    expect(screen.getByText("Fundos Imobiliários (FII)")).toBeInTheDocument();
    expect(screen.getByText(/74\.1% \/ 60\.0%/)).toBeInTheDocument();

    // Check composition line is rendered for FII (contains FIIs, FI-Infras, Fiagros)
    expect(screen.getByText(/Composição:/)).toBeInTheDocument();
    expect(screen.getByText(/54\.3%/)).toBeInTheDocument();
    expect(screen.getByText(/12\.2%/)).toBeInTheDocument();
    expect(screen.getByText(/7\.6%/)).toBeInTheDocument();

    // Check Ações Brasil displays 21.5% / 30.0%
    expect(screen.getByText("Ações Brasil")).toBeInTheDocument();
    expect(screen.getByText(/21\.5% \/ 30\.0%/)).toBeInTheDocument();

    // Check ETFs displays 3.9% / 10.0%
    expect(screen.getByText("ETFs")).toBeInTheDocument();
    expect(screen.getByText(/3\.9% \/ 10\.0%/)).toBeInTheDocument();
  });
});
