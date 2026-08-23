// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { WatchlistKpiSection } from "../WatchlistKpiSection";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Currency } from "@/lib/domain";

let mockDisplayCurrency: Currency = "BRL";
let mockFxRate = 5.0;

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: {
      displayCurrency: mockDisplayCurrency,
    },
  }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueries: () => [],
    useQuery: () => ({
      data: { USDBRL: mockFxRate },
      isLoading: false,
    }),
  };
});

vi.mock("../AllocationChart", () => ({
  AllocationChart: () => <div data-testid="allocation-chart" />,
}));

vi.mock("../NextPaymentBanner", () => ({
  NextPaymentBanner: () => <div data-testid="next-payment-banner" />,
}));

const mockTotals = {
  consolidatedNetWorth: 50000, // R$ 50.000 em BRL
  consolidatedIncome: 5000,     // R$ 5.000 em BRL
  usd: 200,                    //  em USD
  countUsd: 2,
  brl: 4000,                   // R$ 4.000 em BRL
  countBrl: 5,
};

const mockValuedItems: ValuedWatchlistItem[] = [];

describe("WatchlistKpiSection (Tier 1 / Item 3)", () => {
  beforeEach(() => {
    cleanup();
    mockDisplayCurrency = "BRL";
    mockFxRate = 5.0;
  });

  const renderComponent = () => {
    return render(
      <WatchlistKpiSection
        valuedItems={mockValuedItems}
        meta={{}}
        totals={mockTotals}
        locale="ptBR"
        typeFilter={null}
        onSelectType={vi.fn()}
        topAndWorst={{ best: null, worst: null }}
        contextStats={{ over: 0, under: 0, total: 7 }}
      />
    );
  };

  it("exibe totais consolidados em BRL quando displayCurrency é BRL", () => {
    mockDisplayCurrency = "BRL";
    renderComponent();

    // R$ 50.000,00 e R$ 5.000,00
    expect(screen.getByText("R$ 50.000,00")).toBeDefined();
    expect(screen.getByText("R$ 5.000,00")).toBeDefined();

    // Boxes individuais por moeda mantêm suas moedas nativas
    expect(screen.getByText("US$ 200.00")).toBeDefined();
    expect(screen.getByText("R$ 4.000,00")).toBeDefined();
  });

  it("converte e exibe totais consolidados em USD quando displayCurrency é USD", () => {
    mockDisplayCurrency = "USD";
    mockFxRate = 5.0;
    renderComponent();

    // R$ 50.000 / 5.0 = US$ 10,000.00 e R$ 5.000 / 5.0 = US$ 1,000.00
    expect(screen.getByText("US$ 10,000.00")).toBeDefined();
    expect(screen.getByText("US$ 1,000.00")).toBeDefined();

    // Boxes individuais por moeda CONTINUAM com suas moedas nativas (comportamento correto)
    expect(screen.getByText("US$ 200.00")).toBeDefined();
    expect(screen.getByText("R$ 4.000,00")).toBeDefined();
  });
});
