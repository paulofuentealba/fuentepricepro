// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

const mockEvents: any[] = [
  {
    ticker: "BBAS3",
    isPaid: false,
    paymentDate: "2026-10-15",
    amountGross: 50,
    amountNet: 42.5,
    currency: "BRL",
    exDate: "2026-09-01",
    taxType: "jcp",
  },
  {
    ticker: "ITUB4",
    isPaid: false,
    paymentDate: "2026-10-01",
    amountGross: 20,
    amountNet: 20,
    currency: "BRL",
    exDate: "2026-09-01",
    taxType: "dividend",
  },
  {
    ticker: "TAEE11",
    isPaid: false,
    paymentDate: "2026-10-30",
    amountGross: 100,
    amountNet: 85,
    currency: "BRL",
    exDate: "2026-09-01",
    taxType: "dividend",
  },
];

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/lib/useFeatureGate", () => ({
  useFeatureGate: () => true,
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    items: [],
    totals: {},
    isAppLoading: false,
    fx: { USDBRL: 5.5 },
    dividendEventsMap: {},
  }),
}));

vi.mock("@/lib/transactions", () => ({
  useTransactions: () => ({ transactions: [] }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({ settings: { displayCurrency: "BRL" } }),
}));

vi.mock("@/lib/useMarketScope", () => ({
  useMarketScope: () => ({ currency: "BRL" }),
}));

vi.mock("@/lib/useRealizedIncomeSummary", () => ({
  useRealizedIncomeSummary: () => ({ events: mockEvents }),
}));

vi.mock("@/components/income/DividendStressTestCard", () => ({
  DividendStressTestCard: () => <div data-testid="stress-test-card" />,
}));

vi.mock("@/components/income/MonthlyCashflowTimeline", () => ({
  MonthlyCashflowTimeline: () => <div data-testid="cashflow-timeline" />,
}));

// ResizeObserver mock for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { Route } from "../income";

describe("/app/income route table sorting", () => {
  it("renders upcoming dividends sorted by payment soonest-first by default", () => {
    const Component = (Route as any).component;
    render(<Component />);

    const upcomingTable = screen.getByText(/Já garantido/i).closest("div");
    expect(upcomingTable).toBeTruthy();

    const rows = screen.getAllByRole("row");
    // Find the rows in the upcoming table
    const tickerCells = rows
      .map((r) => r.querySelector("td")?.textContent?.trim())
      .filter(Boolean);

    // Default order should be soonest payment first: ITUB4 (Oct 1), BBAS3 (Oct 15), TAEE11 (Oct 30)
    expect(tickerCells.slice(0, 3)).toEqual(["ITUB4", "BBAS3", "TAEE11"]);
  });

  it("tri-state cycles upcoming table when clicking Ativo column header", () => {
    const Component = (Route as any).component;
    render(<Component />);

    const assetHeader = screen.getAllByRole("button", { name: /Ativo/i })[0];
    expect(assetHeader.getAttribute("aria-sort")).toBe("none");

    // Click 1: asc -> BBAS3, ITUB4, TAEE11
    fireEvent.click(assetHeader);
    expect(assetHeader.getAttribute("aria-sort")).toBe("ascending");
    let rows = screen.getAllByRole("row");
    let tickerCells = rows.map((r) => r.querySelector("td")?.textContent?.trim()).filter(Boolean);
    expect(tickerCells.slice(0, 3)).toEqual(["BBAS3", "ITUB4", "TAEE11"]);

    // Click 2: desc -> TAEE11, ITUB4, BBAS3
    fireEvent.click(assetHeader);
    expect(assetHeader.getAttribute("aria-sort")).toBe("descending");
    rows = screen.getAllByRole("row");
    tickerCells = rows.map((r) => r.querySelector("td")?.textContent?.trim()).filter(Boolean);
    expect(tickerCells.slice(0, 3)).toEqual(["TAEE11", "ITUB4", "BBAS3"]);

    // Click 3: default -> ITUB4, BBAS3, TAEE11
    fireEvent.click(assetHeader);
    expect(assetHeader.getAttribute("aria-sort")).toBe("none");
    rows = screen.getAllByRole("row");
    tickerCells = rows.map((r) => r.querySelector("td")?.textContent?.trim()).filter(Boolean);
    expect(tickerCells.slice(0, 3)).toEqual(["ITUB4", "BBAS3", "TAEE11"]);
  });
});
