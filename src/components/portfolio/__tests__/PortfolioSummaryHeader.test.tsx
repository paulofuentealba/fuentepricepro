// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PortfolioSummaryHeader } from "../PortfolioSummaryHeader";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

vi.mock("@/components/ceiling/watchlist/AllocationChart", () => ({
  AllocationChart: () => <div data-testid="allocation-chart" />,
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: {
      watchlist: {
        consolidatedNetWorth: "Patrimônio Consolidado",
        consolidatedNetWorthSub: "Patrimônio Total",
        consolidatedIncome: "Renda Passiva Projetada",
        consolidatedIncomeSub: "Renda Anual Total",
      },
    },
  }),
}));

const mockItems: ValuedWatchlistItem[] = [];

describe("PortfolioSummaryHeader", () => {
  beforeEach(() => {
    cleanup();
  });
  it("renders the allocation chart and both hero cards with formatted values", () => {
    render(
      <PortfolioSummaryHeader
        valuedItems={mockItems}
        totals={{ consolidatedNetWorth: 872405.05, consolidatedIncome: 34605.4 }}
        currency="BRL"
        usdBrlRate={5}
        isLoading={false}
      />,
    );

    expect(screen.getByTestId("allocation-chart")).toBeInTheDocument();
    expect(screen.getByText("Patrimônio Consolidado")).toBeInTheDocument();
    expect(screen.getByText("Renda Passiva Projetada")).toBeInTheDocument();
    expect(screen.getByText(/872\.405,05/)).toBeInTheDocument();
  });

  it("shows skeletons instead of values while loading", () => {
    render(
      <PortfolioSummaryHeader
        valuedItems={mockItems}
        totals={{ consolidatedNetWorth: 0, consolidatedIncome: 0 }}
        currency="BRL"
        usdBrlRate={5}
        isLoading={true}
      />,
    );
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });
});
