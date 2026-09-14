// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PendingCorporateEventsBanner } from "../PendingCorporateEventsBanner";
import * as useCorporateHook from "@/lib/usePortfolioCorporateEvents";

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({ user: { uid: "test-user" } }),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "pt-BR",
    t: {
      corporateEvents: {
        bannerTitle: "Eventos Corporativos Detectados",
        bannerSubtitle: "Desdobramentos e grupamentos recentes nos ativos que você possui.",
        confirmedBadge: "Confirmado (2 fontes)",
        singleSourceBadge: "Fonte única — Conferir",
        divergentBadge: "Divergência de fontes",
        metric: "Métrica",
        before: "Antes",
        after: "Depois",
        delta: "Variação",
        shares: "Cotas",
        avgPrice: "Preço Médio",
        totalInvested: "Capital Total",
        preserved: "Inalterado",
        effectiveDate: "Data do evento",
        fastPathButton: "Aplicar ajuste",
        slowPathButton: "Revisar evento",
        applying: "Aplicando...",
        reviewSheetTitle: "Revisar Evento Corporativo",
        reviewSheetSubtitle: "Confira e ajuste os parâmetros do evento antes de consolidar na sua carteira.",
        fastConfirmTitle: "Confirmar Ajuste de Cotas",
        fastConfirmDesc: "Deseja aplicar o evento em {{ticker}}?",
        confirmModalButton: "Confirmar e Aplicar",
        dismiss: "Dispensar",
        split: "Desdobramento",
        grouping: "Grupamento",
        successMessage: "atualizado com sucesso.",
      },
      transactions: {
        corporateAction: "Evento Societário",
      },
      authModal: {
        error: "Erro",
      },
    },
  }),
}));

describe("PendingCorporateEventsBanner", () => {
  const mockApplyEvent = vi.fn();

  function renderWithQueryClient(ui: React.ReactElement) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders null when there are no pending corporate events", () => {
    vi.spyOn(useCorporateHook, "usePortfolioCorporateEvents").mockReturnValue({
      pendingEvents: [],
      count: 0,
      isLoading: false,
      isError: false,
      applyingEventId: null,
      applyEvent: mockApplyEvent,
      refetch: vi.fn(),
    });

    const { container } = renderWithQueryClient(<PendingCorporateEventsBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Fast-Path card for confirmed (2 sources) corporate event", () => {
    const mockPendingEvent: useCorporateHook.PendingPortfolioEvent = {
      event: {
        eventId: "mglu3_20240524_grouping_0.1",
        ticker: "MGLU3",
        type: "grouping",
        ratio: 0.1,
        date: 1716508800000,
        effectiveDate: "2024-05-24",
        confidence: "confirmed",
        sources: ["yahoo", "brapi"],
      },
      item: {
        ticker: "MGLU3",
        quantity: 100,
        averagePrice: 20.0,
        currentPrice: 2.0,
        currency: "BRL",
        addedAt: Date.now(),
      } as any,
      preview: {
        ticker: "MGLU3",
        quantity: 10,
        averagePrice: 200.0,
      },
      factor: 0.1,
      deltaQuantity: -90,
      priceVariationPct: 900,
      displayRatioText: "10:1",
    };

    vi.spyOn(useCorporateHook, "usePortfolioCorporateEvents").mockReturnValue({
      pendingEvents: [mockPendingEvent],
      count: 1,
      isLoading: false,
      isError: false,
      applyingEventId: null,
      applyEvent: mockApplyEvent,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<PendingCorporateEventsBanner />);

    // Check title and ticker
    expect(screen.getByText("Eventos Corporativos Detectados")).toBeInTheDocument();
    expect(screen.getByText("MGLU3")).toBeInTheDocument();
    expect(screen.getByText("Confirmado (2 fontes)")).toBeInTheDocument();
    expect(screen.getByText("Data do evento: 2024-05-24")).toBeInTheDocument();

    // Check impact mini-table
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("-90")).toBeInTheDocument();

    // Check Fast-Path button exists
    const fastPathBtn = screen.getByRole("button", { name: /Aplicar ajuste/i });
    expect(fastPathBtn).toBeInTheDocument();

    // Clicking Fast-Path button opens the 1-click confirmation dialog
    fireEvent.click(fastPathBtn);
    expect(screen.getByText("Confirmar Ajuste de Cotas")).toBeInTheDocument();

    // Clicking Confirm in dialog invokes applyEvent
    const confirmBtn = screen.getByRole("button", { name: /Confirmar e Aplicar/i });
    fireEvent.click(confirmBtn);
    expect(mockApplyEvent).toHaveBeenCalledWith(mockPendingEvent);
  });

  it("renders Slow-Path card for single-source event with 'Revisar evento' button", () => {
    const mockPendingEvent: useCorporateHook.PendingPortfolioEvent = {
      event: {
        eventId: "aapl_20240830_split_4",
        ticker: "AAPL",
        type: "split",
        ratio: 4,
        date: 1725000000000,
        effectiveDate: "2024-08-30",
        confidence: "single_source",
        sources: ["yahoo"],
      },
      item: {
        ticker: "AAPL",
        quantity: 50,
        averagePrice: 150.0,
        currentPrice: 200.0,
        currency: "USD",
        addedAt: Date.now(),
      } as any,
      preview: {
        ticker: "AAPL",
        quantity: 200,
        averagePrice: 37.5,
      },
      factor: 4,
      deltaQuantity: 150,
      priceVariationPct: -75,
      displayRatioText: "1:4",
    };

    vi.spyOn(useCorporateHook, "usePortfolioCorporateEvents").mockReturnValue({
      pendingEvents: [mockPendingEvent],
      count: 1,
      isLoading: false,
      isError: false,
      applyingEventId: null,
      applyEvent: mockApplyEvent,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<PendingCorporateEventsBanner />);

    expect(screen.getAllByText("AAPL")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Fonte única — Conferir")[0]).toBeInTheDocument();

    // Slow-Path button "Revisar evento"
    const slowPathBtn = screen.getByRole("button", { name: /Revisar evento/i });
    expect(slowPathBtn).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aplicar ajuste/i })).not.toBeInTheDocument();
  });
});
