// src/routes/app/__tests__/myportfolio.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

const mockValuedItems: any[] = [];
let mockIsAppLoading = false;

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: mockValuedItems,
    totals: { consolidatedNetWorth: 100000, consolidatedIncome: 5000 },
    isAppLoading: mockIsAppLoading,
    macroRates: undefined,
  }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({ settings: { displayCurrency: "BRL" } }),
}));

vi.mock("@/components/ceiling/FIProgressCard", () => ({
  FIProgressCard: () => <div data-testid="fi-progress-card" />,
}));
vi.mock("@/components/portfolio/PortfolioSummaryHeader", () => ({
  PortfolioSummaryHeader: () => <div data-testid="summary-header" />,
}));
vi.mock("@/components/portfolio/BrokerCustodyCards", () => ({
  BrokerCustodyCards: () => <div data-testid="custody-cards" />,
}));
vi.mock("@/components/portfolio/PortfolioPositionsTable", () => ({
  PortfolioPositionsTable: ({ onSelectItem }: any) => (
    <button onClick={() => onSelectItem({ id: "x", ticker: "X" })}>open-detail</button>
  ),
}));
vi.mock("@/components/portfolio/PortfolioEmptyState", () => ({
  PortfolioEmptyState: () => <div data-testid="empty-state" />,
}));
vi.mock("@/components/ceiling/watchlist/AssetDetailSheet", () => ({
  AssetDetailSheet: ({ item }: any) => (item ? <div data-testid="detail-sheet">{item.ticker}</div> : null),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
}));

import { Route } from "../myportfolio";

describe("/app/myportfolio", () => {
  it("renders the summary header, custody cards, and positions table when there are positions", () => {
    mockValuedItems.length = 0;
    mockValuedItems.push({ id: "1", ticker: "BBAS3", isClosedPosition: false });
    const MyPortfolio = (Route as any).component;
    render(<MyPortfolio />);

    expect(screen.getByTestId("summary-header")).toBeInTheDocument();
    expect(screen.getByTestId("custody-cards")).toBeInTheDocument();
    expect(screen.getByText("open-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("opens the AssetDetailSheet when a row is selected", () => {
    mockValuedItems.length = 0;
    mockValuedItems.push({ id: "1", ticker: "BBAS3", isClosedPosition: false });
    const MyPortfolio = (Route as any).component;
    render(<MyPortfolio />);

    fireEvent.click(screen.getByText("open-detail"));
    expect(screen.getByTestId("detail-sheet")).toHaveTextContent("X");
  });

  it("renders the empty state when there are no positions", () => {
    mockValuedItems.length = 0;
    const MyPortfolio = (Route as any).component;
    render(<MyPortfolio />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });
});
