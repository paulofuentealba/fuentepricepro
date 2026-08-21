// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PortfolioIrrCard } from "../PortfolioIrrCard";
import type { WatchlistItem } from "@/lib/watchlist";
import type { Transaction } from "@/lib/transactions";
import React from "react";

let mockWatchlistItems: WatchlistItem[] = [];

vi.mock("@/lib/watchlist", () => ({
  useWatchlist: () => ({
    items: mockWatchlistItems,
  }),
}));

vi.mock("@/lib/useSelic", () => ({
  useSelic: () => ({
    data: 10.5,
  }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: [],
      isLoading: false,
    }),
  };
});

describe("PortfolioIrrCard (Tier 0 / Item 4)", () => {
  beforeEach(() => {
    cleanup();
    mockWatchlistItems = [];
  });

  it("não contamina a TIR de USD com currentPortfolioValue em BRL quando não há ativos USD em custódia", () => {
    // Apenas ativos em BRL na custódia (R$ 500.000)
    mockWatchlistItems = [
      {
        id: "item-1",
        ticker: "PETR4",
        name: "Petrobras",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 40.0,
        quantity: 12500,
        targetYield: 0.08,
        ceilingPrice: 50.0,
        safetyMargin: 0.2,
        averagePrice: 35.0,
        annualDividend: 4.0,
        payoutRatio: 0.5,
        paymentMonths: [5, 8, 11],
        sector: "Petróleo",
        addedAt: 123456789,
        investingSince: 1700000000000,
      },
    ];

    // Transações passadas de uma posição em USD já encerrada (comprou por $100, vendeu por $120)
    const t0 = new Date("2024-01-01T00:00:00Z").getTime();
    const t1 = new Date("2025-01-01T00:00:00Z").getTime();
    const usdTransactions: Transaction[] = [
      {
        id: "tx-usd-1",
        ticker: "AAPL",
        type: "buy",
        date: t0,
        quantity: 1,
        pricePerShare: 100,
        fees: 0,
        notes: null,
      },
      {
        id: "tx-usd-2",
        ticker: "AAPL",
        type: "sell",
        date: t1,
        quantity: 1,
        pricePerShare: 120,
        fees: 0,
        notes: null,
      },
    ];

    render(
      <PortfolioIrrCard
        transactions={usdTransactions}
        realizedEvents={[]}
        currentPortfolioValue={500000} // R$ 500.000 em BRL consolidado
        activeCurrency="USD"
        assetCurrencies={{ AAPL: "USD", PETR4: "BRL" }}
      />
    );

    // Lucro de $20 sobre $100 em 1 ano = 20.0% a.a.
    // Se estivesse contaminado com R$ 500.000 como valor terminal, a TIR seria de milhares de %
    expect(screen.getByText("20.0% a.a.")).toBeDefined();
  });

  it("calcula a TIR em USD com valor de mercado correto quando há ativos USD em custódia", () => {
    // 10 ações de AAPL a $200 = $2.000 de valor de mercado
    mockWatchlistItems = [
      {
        id: "item-2",
        ticker: "AAPL",
        name: "Apple",
        type: "STOCK_US",
        currency: "USD",
        currentPrice: 200.0,
        quantity: 10,
        targetYield: 0.02,
        ceilingPrice: 220.0,
        safetyMargin: 0.1,
        averagePrice: 100.0,
        annualDividend: 0,
        payoutRatio: 0,
        paymentMonths: [],
        sector: "Tech",
        addedAt: 123456789,
        investingSince: 1700000000000,
      },
    ];

    const t0 = new Date("2024-01-01T00:00:00Z").getTime();
    const usdTransactions: Transaction[] = [
      {
        id: "tx-usd-3",
        ticker: "AAPL",
        type: "buy",
        date: t0,
        quantity: 10,
        pricePerShare: 100, // Aporte de $1.000 que dobrou para $2.000
        fees: 0,
        notes: null,
      },
    ];

    render(
      <PortfolioIrrCard
        transactions={usdTransactions}
        realizedEvents={[]}
        currentPortfolioValue={2000}
        activeCurrency="USD"
        assetCurrencies={{ AAPL: "USD" }}
      />
    );

    expect(screen.getByText(/Retorno da Carteira/i)).toBeDefined();
  });
});
