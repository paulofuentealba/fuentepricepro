// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { PortfolioPositionsTable } from "../PortfolioPositionsTable";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

afterEach(() => {
  cleanup();
});

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
        allocation: {
          classes: {
            acoes_br: "Ações BR",
            fiis: "FIIs",
            fiagros: "Fiagros",
            fi_infras: "FI-Infras",
            reits_us: "REITs (US)",
            etfs_us: "ETFs US",
            etfs_br: "ETFs BR",
            acoes_us: "Ações US",
          },
        },
        matrix: {
          filterAllDynamic: "Todas as Classes",
          actionBuy: "Comprar",
          actionWatch: "Observar",
          actionAvoid: "Esticado / Evitar",
          actionYieldTrap: "Alerta: Yield Trap",
          actionNoData: "Sem dados",
          empty: "Nenhum ativo encontrado nessa classe.",
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

  it("filters table rows when an asset class chip is selected", () => {
    const stockItem = makeItem({ id: "1", ticker: "BBAS3", type: "STOCK_BR" });
    const fiiItem = makeItem({ id: "2", ticker: "HGLG11", type: "FII" });

    render(
      <PortfolioPositionsTable
        valuedItems={[stockItem, fiiItem]}
        onSelectItem={vi.fn()}
        isLoading={false}
      />,
    );

    // Initial state: both are visible
    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.getByText("HGLG11")).toBeInTheDocument();

    // Click on FIIs pill
    fireEvent.click(screen.getByText("FIIs"));

    // Now only HGLG11 should be in the table
    expect(screen.getByText("HGLG11")).toBeInTheDocument();
    expect(screen.queryByText("BBAS3")).toBeNull();

    // Click on Todas as Classes pill
    fireEvent.click(screen.getByText("Todas as Classes"));

    // Both are visible again
    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.getByText("HGLG11")).toBeInTheDocument();
  });
});
