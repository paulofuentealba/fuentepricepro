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

  it("renders the hero gap finder, seasonality bar, filters, and cards grid by default", () => {
    renderView();

    expect(screen.getByTestId("dividend-radar-view")).toBeInTheDocument();
    expect(screen.getByTestId("dividend-radar-hero")).toBeInTheDocument();
    expect(screen.getByTestId("seasonality-bar")).toBeInTheDocument();
    expect(screen.getByTestId("radar-cards-grid")).toBeInTheDocument();

    // Check presence of key tickers
    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.getByText("TAEE11")).toBeInTheDocument();
  });

  it("toggles between Cards mode and Pro Table mode", () => {
    renderView();

    // Initially in cards mode
    expect(screen.getByTestId("radar-cards-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("dividend-radar-table")).not.toBeInTheDocument();

    // Find and click view mode switcher
    const toggleBtn = screen.getByText(dict.ptBR.dividendRadar.viewMode.table);
    fireEvent.click(toggleBtn);

    // Now in table mode
    expect(screen.getByTestId("dividend-radar-table")).toBeInTheDocument();
    expect(screen.queryByTestId("radar-cards-grid")).not.toBeInTheDocument();

    // Toggle back to cards
    const cardsBtn = screen.getByText(dict.ptBR.dividendRadar.viewMode.cards);
    fireEvent.click(cardsBtn);
    expect(screen.getByTestId("radar-cards-grid")).toBeInTheDocument();
  });

  it("filters items by month when clicking a seasonality tab", () => {
    renderView();

    // Click on MAI tab
    const maiBtn = screen.getByText("MAI");
    fireEvent.click(maiBtn);

    // TAEE11 announces in May, should be present
    expect(screen.getByText("TAEE11")).toBeInTheDocument();

    // CPLE6 announces in Apr & Nov, should not be present in May
    expect(screen.queryByText("CPLE6")).not.toBeInTheDocument();
  });

  it("filters items when typing in the search box", () => {
    renderView();

    const searchInput = screen.getByPlaceholderText(dict.ptBR.dividendRadar.searchPlaceholder);
    fireEvent.change(searchInput, { target: { value: "Copel" } });

    expect(screen.getByText("CPLE6")).toBeInTheDocument();
    expect(screen.queryByText("BBAS3")).not.toBeInTheDocument();
  });

  it("filters items when clicking strategy chips", () => {
    renderView();

    // Click on "Reis dos Dividendos" (dgi)
    const dgiBtn = screen.getByText(dict.ptBR.dividendRadar.strategies.dgi);
    fireEvent.click(dgiBtn);

    // JNJ is a dividend king, should be visible
    expect(screen.getByText("JNJ")).toBeInTheDocument();

    // MXRF11 is not a DGI king, should not be visible
    expect(screen.queryByText("MXRF11")).not.toBeInTheDocument();
  });

  it("opens the detail sheet when clicking on an asset card", () => {
    renderView();

    // Click on BBAS3 card
    const bbas3Element = screen.getByText("BBAS3");
    fireEvent.click(bbas3Element);

    // Verify detail sheet opened with Bazin breakdown
    expect(
      screen.getByText(dict.ptBR.dividendRadar.detailSheet.bazinDecomposition)
    ).toBeInTheDocument();
  });
});
