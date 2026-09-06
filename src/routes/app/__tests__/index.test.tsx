// src/routes/app/__tests__/index.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

const mockValuedItems: any[] = [
  { id: "1", ticker: "BBAS3", isClosedPosition: false, currentPrice: 22.52, quantity: 100 },
  { id: "2", ticker: "HGLG11", isClosedPosition: false, currentPrice: 160.0, quantity: 50 },
];
let mockIsAppLoading = false;

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({ user: { uid: "test-user" } }),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  setDoc: vi.fn(),
}));

vi.mock("@/integrations/firebase/client", () => ({
  db: {},
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: mockValuedItems,
    totals: { consolidatedNetWorth: 100000, consolidatedIncome: 5000 },
    isAppLoading: mockIsAppLoading,
    macroRates: undefined,
    fx: { USDBRL: 5.5 },
  }),
}));

vi.mock("@/lib/useFIProgress", () => ({
  useFIProgress: () => ({
    coveragePercent: 50,
    currentMonthlyIncome: 2500,
    monthlyCostGoal: 5000,
    monthsToFI: 60,
    isReached: false,
    isSetup: true,
  }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: {
      displayCurrency: "BRL",
      smartAllocationTargets: {},
      estimatedMonthlyContribution: 2000,
    },
    updateSettings: vi.fn(),
  }),
}));

vi.mock("@/lib/selectors/weightedYieldOnCost", () => ({
  computeWeightedYieldOnCost: () => 8.5,
}));

vi.mock("@/components/dashboard/DashboardKpiGrid", () => ({
  DashboardKpiGrid: () => <div data-testid="kpi-grid" />,
}));

vi.mock("@/components/dashboard/FireEngineCard", () => ({
  FireEngineCard: () => <div data-testid="fire-engine-card" />,
}));

vi.mock("@/components/dashboard/ContributionEngineCard", () => ({
  ContributionEngineCard: ({ onSelectTicker }: any) => (
    <button data-testid="contrib-alloc-bbas3" onClick={() => onSelectTicker?.("BBAS3")}>
      allocate-bbas3
    </button>
  ),
}));

vi.mock("@/components/dashboard/AllocationOverviewCard", () => ({
  AllocationOverviewCard: () => <div data-testid="alloc-overview-card" />,
}));

vi.mock("@/components/dashboard/OpportunityMatrixTable", () => ({
  OpportunityMatrixTable: ({ onSelectTicker }: any) => (
    <button data-testid="matrix-row-hglg11" onClick={() => onSelectTicker?.("HGLG11")}>
      matrix-hglg11
    </button>
  ),
}));

vi.mock("@/components/ceiling/watchlist/AssetDetailSheet", () => ({
  AssetDetailSheet: ({ item, onClose }: any) =>
    item ? (
      <div data-testid="detail-sheet">
        <span>{item.ticker}</span>
        <button onClick={onClose}>close-sheet</button>
      </div>
    ) : null,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
}));

import { Route } from "../index";

describe("/app/ (Dashboard Home)", () => {
  it("renders all dashboard cards and matrix table", () => {
    const AppHome = (Route as any).component;
    render(<AppHome />);

    expect(screen.getByTestId("kpi-grid")).toBeInTheDocument();
    expect(screen.getByTestId("fire-engine-card")).toBeInTheDocument();
    expect(screen.getByTestId("contrib-alloc-bbas3")).toBeInTheDocument();
    expect(screen.getByTestId("alloc-overview-card")).toBeInTheDocument();
    expect(screen.getByTestId("matrix-row-hglg11")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("opens AssetDetailSheet when clicking an asset in OpportunityMatrixTable", () => {
    const AppHome = (Route as any).component;
    render(<AppHome />);

    fireEvent.click(screen.getByTestId("matrix-row-hglg11"));
    expect(screen.getByTestId("detail-sheet")).toBeInTheDocument();
    expect(screen.getByTestId("detail-sheet")).toHaveTextContent("HGLG11");

    fireEvent.click(screen.getByText("close-sheet"));
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("opens AssetDetailSheet when clicking an asset in ContributionEngineCard", () => {
    const AppHome = (Route as any).component;
    render(<AppHome />);

    fireEvent.click(screen.getByTestId("contrib-alloc-bbas3"));
    expect(screen.getByTestId("detail-sheet")).toBeInTheDocument();
    expect(screen.getByTestId("detail-sheet")).toHaveTextContent("BBAS3");
  });
});
