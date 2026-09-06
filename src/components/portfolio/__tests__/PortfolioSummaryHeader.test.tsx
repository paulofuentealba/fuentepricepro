// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PortfolioSummaryHeader } from "../PortfolioSummaryHeader";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ceiling/watchlist/AllocationChart", () => ({
  AllocationChart: () => <div data-testid="allocation-chart" />,
}));

vi.mock("@/components/ceiling/watchlist/CsvImportUploader", () => ({
  CsvImportUploader: ({ open }: any) => (open ? <div data-testid="csv-modal" /> : null),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: {
      watchlist: {
        consolidatedNetWorth: "Patrimônio Consolidado",
        consolidatedNetWorthSub: "Patrimônio Total",
        addAssetDropdownImportFile: "Trazer meu arquivo",
      },
      portfolio: {
        quickActions: "Ações Rápidas",
        emptyStateAddAsset: "Adicionar Ativo",
        emptyStateImportNote: "Importar Nota de Corretagem",
      },
    },
  }),
}));

const mockItems: ValuedWatchlistItem[] = [];

describe("PortfolioSummaryHeader", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders the allocation chart, net worth hero card and 3 action buttons", () => {
    render(
      <PortfolioSummaryHeader
        valuedItems={mockItems}
        totals={{ consolidatedNetWorth: 872405.05 }}
        currency="BRL"
        usdBrlRate={5}
        isLoading={false}
      />,
    );

    expect(screen.getByTestId("allocation-chart")).toBeInTheDocument();
    expect(screen.getByText("Patrimônio Consolidado")).toBeInTheDocument();
    expect(screen.getByText(/872\.405,05/)).toBeInTheDocument();

    expect(screen.getByText("Ações Rápidas")).toBeInTheDocument();

    const addAssetBtn = screen.getByRole("link", { name: /adicionar ativo/i });
    expect(addAssetBtn).toHaveAttribute("href", "/app/add-asset");

    const importNoteBtn = screen.getByRole("link", { name: /importar nota de corretagem/i });
    expect(importNoteBtn).toHaveAttribute("href", "/app/import-broker-note");

    const bringFileBtn = screen.getByRole("button", { name: /trazer meu arquivo/i });
    expect(bringFileBtn).toBeInTheDocument();

    expect(screen.queryByTestId("csv-modal")).not.toBeInTheDocument();
    fireEvent.click(bringFileBtn);
    expect(screen.getByTestId("csv-modal")).toBeInTheDocument();
  });

  it("shows skeletons instead of values while loading", () => {
    render(
      <PortfolioSummaryHeader
        valuedItems={mockItems}
        totals={{ consolidatedNetWorth: 0 }}
        currency="BRL"
        usdBrlRate={5}
        isLoading={true}
      />,
    );
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });
});
