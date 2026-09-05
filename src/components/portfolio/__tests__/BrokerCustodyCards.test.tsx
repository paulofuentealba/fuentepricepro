// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { BrokerCustodyCards } from "../BrokerCustodyCards";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: {
      portfolio: {
        custodyEyebrow: "Custódia por Corretora",
        custodyTitle: "Onde seus ativos estão guardados",
        unassignedBroker: "Não informado",
      },
    },
  }),
}));

function makeItem(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  return {
    id: "STOCK_BR:BBAS3",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 26.94,
    quantity: 1200,
    averagePrice: 26.94,
    annualDividend: 2,
    targetYield: 6,
    ceilingPrice: 30,
    safetyMargin: 10,
    paymentMonths: [],
    payoutRatio: null,
    addedAt: 0,
    investingSince: 0,
    livePrice: 26.94,
    sector: "",
    isClosedPosition: false,
    isBffMode: true,
    valuation: {} as any,
    broker: null,
    ...overrides,
  } as ValuedWatchlistItem;
}

describe("BrokerCustodyCards", () => {
  it("groups positions by broker and buckets unassigned ones", () => {
    const items = [
      makeItem({ id: "1", ticker: "BBAS3", broker: "BTG Pactual" }),
      makeItem({ id: "2", ticker: "HGLG11", broker: "BTG Pactual" }),
      makeItem({ id: "3", ticker: "AAPL", broker: null }),
    ];

    render(<BrokerCustodyCards valuedItems={items} currency="BRL" usdBrlRate={5} isLoading={false} />);

    expect(screen.getByText("BTG Pactual")).toBeInTheDocument();
    expect(screen.getByText("Não informado")).toBeInTheDocument();
  });
});
