// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DividendRadarView } from "../DividendRadarView";
import { dict } from "@/lib/i18n";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    setLocale: () => {},
    t: dict.ptBR,
  }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: { taxJurisdiction: "BR" },
    updateSettings: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: [],
    ownedItems: [],
    totals: {},
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DividendRadarView", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderView() {
    return render(
      <QueryClientProvider client={queryClient}>
        <DividendRadarView />
      </QueryClientProvider>
    );
  }

  it("renders the primary unified agenda daily view by default", () => {
    renderView();

    expect(screen.getByTestId("dividend-radar-view")).toBeInTheDocument();
    expect(screen.getByTestId("dividend-radar-agenda")).toBeInTheDocument();
    expect(screen.getByTestId("btn-market-br")).toBeInTheDocument();
    expect(screen.getByTestId("btn-market-us")).toBeInTheDocument();
    expect(screen.getByTestId("btn-scroll-today")).toBeInTheDocument();

    // Check presence of key tickers
    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.getByText("HGLG11")).toBeInTheDocument();
  });

  it("switches smoothly between Brasil and EUA markets", () => {
    renderView();

    // Initially in BR mode
    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.queryByText("JNJ")).not.toBeInTheDocument();

    // Switch to US market
    const usBtn = screen.getByTestId("btn-market-us");
    fireEvent.click(usBtn);

    // US assets appear
    expect(screen.getByText("O")).toBeInTheDocument();
    expect(screen.getByText("JNJ")).toBeInTheDocument();
    expect(screen.queryByText("BBAS3")).not.toBeInTheDocument();
  });

  it("filters items when typing in the search box", () => {
    renderView();

    const searchInput = screen.getByTestId("agenda-search-input");
    fireEvent.change(searchInput, { target: { value: "HGLG" } });

    expect(screen.getByText("HGLG11")).toBeInTheDocument();
    expect(screen.queryByText("BBAS3")).not.toBeInTheDocument();
  });

  it("opens the detail sheet when clicking on an asset card", () => {
    renderView();

    // Click on BBAS3 card
    const bbas3Element = screen.getByText("BBAS3");
    fireEvent.click(bbas3Element.closest("[data-testid^='agenda-card-']")!);

    // Verify detail sheet opened with Bazin breakdown
    expect(
      screen.getByText(dict.ptBR.dividendRadar.detailSheet.bazinDecomposition)
    ).toBeInTheDocument();
  });
});
