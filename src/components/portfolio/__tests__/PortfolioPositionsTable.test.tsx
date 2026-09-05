// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PortfolioPositionsTable } from "../PortfolioPositionsTable";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: {
      portfolio: {
        columnAsset: "Ativo",
        columnBroker: "Corretora",
        columnQty: "Qtd.",
        columnAvgPrice: "Preço Médio",
        columnPrice: "Cotação Atual",
        columnTotal: "Total Atual",
        columnPnl: "Lucro / Prejuízo",
        columnYoc: "Yield on Cost",
        columnStatus: "Status vs Teto",
        emptyPositions: "Nenhuma posição ainda",
      },
      dashboard: {
        matrix: {
          actionBuy: "Comprar",
          actionWatch: "Observar",
          actionAvoid: "Esticado / Evitar",
          actionYieldTrap: "Alerta: Yield Trap",
          actionNoData: "Sem dados",
        },
      },
    },
  }),
}));

function makeItem(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  return {
    id: "STOCK_BR:BBAS3",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 26.94,
    quantity: 1200,
    averagePrice: 26.94,
    annualDividend: 2,
    targetYield: 6,
    ceilingPrice: 30,
    safetyMargin: 10,
    paymentMonths: [],
    payoutRatio: null,
    customTaxRate: null,
    addedAt: 0,
    investingSince: 0,
    livePrice: 26.94,
    sector: "",
    isClosedPosition: false,
    isBffMode: true,
    broker: "BTG Pactual",
    valuation: { margin: 12, activeCeiling: 30, dividendYield: 7.5, isUnavailable: false, yieldTrapWarning: false } as any,
    ...overrides,
  } as ValuedWatchlistItem;
}

describe("PortfolioPositionsTable", () => {
  it("renders a row per position and calls onSelectItem on row click", () => {
    const item = makeItem({});
    const onSelectItem = vi.fn();

    render(<PortfolioPositionsTable valuedItems={[item]} onSelectItem={onSelectItem} isLoading={false} />);

    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.getByText("BTG Pactual")).toBeInTheDocument();

    fireEvent.click(screen.getByText("BBAS3"));
    expect(onSelectItem).toHaveBeenCalledWith(item);
  });

  it("shows the empty state when there are no positions", () => {
    render(<PortfolioPositionsTable valuedItems={[]} onSelectItem={vi.fn()} isLoading={false} />);
    expect(screen.getByText("Nenhuma posição ainda")).toBeInTheDocument();
  });
});
