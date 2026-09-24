// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PortfolioTableV2 } from "../PortfolioTableV2";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

const mockValuedItems: ValuedWatchlistItem[] = [
  {
    id: "STOCK_BR:BBAS3",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 30,
    quantity: 500,
    averagePrice: 25,
    annualDividend: 2.5,
    targetYield: 6,
    ceilingPrice: 35,
    safetyMargin: 15,
    paymentMonths: [],
    payoutRatio: null,
    customTaxRate: null,
    addedAt: 0,
    investingSince: 0,
    livePrice: 30,
    sector: "Financeiro",
    isClosedPosition: false,
    isBffMode: true,
    valuation: { margin: 15, activeCeiling: 35, dividendYield: 8.3 } as any,
  } as ValuedWatchlistItem,
  {
    id: "STOCK_BR:TAEE11",
    ticker: "TAEE11",
    name: "Taesa",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 35,
    quantity: 1000,
    averagePrice: 34,
    annualDividend: 3,
    targetYield: 6,
    ceilingPrice: 40,
    safetyMargin: 12,
    paymentMonths: [],
    payoutRatio: null,
    customTaxRate: null,
    addedAt: 0,
    investingSince: 0,
    livePrice: 35,
    sector: "Energia",
    isClosedPosition: false,
    isBffMode: true,
    valuation: { margin: 12, activeCeiling: 40, dividendYield: 8.5 } as any,
  } as ValuedWatchlistItem,
];

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: mockValuedItems,
    quotes: {
      BBAS3: { price: 30, changePct: 1.2 },
      TAEE11: { price: 35, changePct: -0.5 },
    },
    isAppLoading: false,
  }),
}));

beforeEach(() => {
  cleanup();
});

describe("PortfolioTableV2", () => {
  it("renderiza posições ativas ordenadas por posição (quantidade) desc por padrão", () => {
    render(<PortfolioTableV2 />);

    const rows = screen.getAllByRole("row");
    // Row 0 = header, Row 1 = TAEE11 (qty 1000), Row 2 = BBAS3 (qty 500)
    expect(rows[1]).toHaveTextContent("TAEE11");
    expect(rows[2]).toHaveTextContent("BBAS3");
  });

  it("permite ordenar por ativo/ticker no ciclo de 3 cliques (asc -> desc -> default)", () => {
    render(<PortfolioTableV2 />);

    const assetHeader = screen.getByRole("button", { name: /ativo/i });

    // 1º clique: asc (BBAS3 antes de TAEE11)
    fireEvent.click(assetHeader);
    let rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("BBAS3");
    expect(rows[2]).toHaveTextContent("TAEE11");

    // 2º clique: desc (TAEE11 antes de BBAS3)
    fireEvent.click(assetHeader);
    rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("TAEE11");
    expect(rows[2]).toHaveTextContent("BBAS3");

    // 3º clique: default (posição: TAEE11 qty 1000 > BBAS3 qty 500)
    fireEvent.click(assetHeader);
    rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("TAEE11");
    expect(rows[2]).toHaveTextContent("BBAS3");
  });
});
