// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DividendRadarAgendaDaily } from "../DividendRadarAgendaDaily";
import { buildRadarItems } from "@/lib/dividendRadarLogic";
import { dict } from "@/lib/i18n";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    setLocale: () => {},
    t: dict.ptBR,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DividendRadarAgendaDaily", () => {
  const radarItems = buildRadarItems(null, "BR", "pt-BR");
  const onOpenDetail = vi.fn();
  const formatCurrency = (val: number, cur: string = "BRL") =>
    cur === "USD" ? `US$ ${val.toFixed(2)}` : `R$ ${val.toFixed(2)}`;

  beforeEach(() => {
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderAgenda() {
    return render(
      <DividendRadarAgendaDaily
        radarItems={radarItems}
        onOpenDetail={onOpenDetail}
        formatCurrency={formatCurrency}
      />
    );
  }

  it("renders the agenda title, market toggle bar, timeline and daily feed", () => {
    renderAgenda();

    expect(screen.getByTestId("dividend-radar-agenda")).toBeInTheDocument();
    expect(screen.getByTestId("btn-market-br")).toBeInTheDocument();
    expect(screen.getByTestId("btn-market-us")).toBeInTheDocument();
    expect(screen.getByTestId("btn-scroll-today")).toBeInTheDocument();
    expect(screen.getByTestId("agenda-feed")).toBeInTheDocument();

    // Check Brazilian assets presence by default
    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.getByText("HGLG11")).toBeInTheDocument();
  });

  it("switches smoothly between Brasil and EUA markets", () => {
    renderAgenda();

    // Initially on Brasil (BBAS3 visible)
    expect(screen.getByText("BBAS3")).toBeInTheDocument();
    expect(screen.queryByText("JNJ")).not.toBeInTheDocument();

    // Switch to USA
    const usBtn = screen.getByTestId("btn-market-us");
    fireEvent.click(usBtn);

    // Now US assets should appear
    expect(screen.getByText("O")).toBeInTheDocument();
    expect(screen.getByText("JNJ")).toBeInTheDocument();
    expect(screen.queryByText("BBAS3")).not.toBeInTheDocument();
  });

  it("filters events by search query", () => {
    renderAgenda();

    const searchInput = screen.getByTestId("agenda-search-input");
    fireEvent.change(searchInput, { target: { value: "hglg" } });

    expect(screen.getByText("HGLG11")).toBeInTheDocument();
    expect(screen.queryByText("BBAS3")).not.toBeInTheDocument();
  });

  it("filters events when clicking on month tabs", () => {
    renderAgenda();

    // Click on October (10)
    const outTab = screen.getByTestId("agenda-month-10");
    fireEvent.click(outTab);

    // TRPL4 has event in October
    expect(screen.getByText("TRPL4")).toBeInTheDocument();
    expect(screen.queryByText("HGLG11")).not.toBeInTheDocument();
  });

  it("invokes onOpenDetail when clicking an event card", () => {
    renderAgenda();

    // Find card with BBAS3 and click it
    const bbas3Text = screen.getByText("BBAS3");
    fireEvent.click(bbas3Text.closest("[data-testid^='agenda-card-']")!);

    expect(onOpenDetail).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: "BBAS3" })
    );
  });
});
