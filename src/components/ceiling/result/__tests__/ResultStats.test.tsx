// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ResultStats } from "../ResultStats";
import type { Asset } from "@/lib/domain";
import { dict } from "@/lib/i18n";

let mockCustomTaxUnlocked = false;

// Mock IntersectionObserver for framer-motion AnimatedNumber
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver for Radix UI
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/useFeatureGate", () => ({
  useFeatureGate: (gate: string) => {
    if (gate === "customTaxUnlocked") return mockCustomTaxUnlocked;
    return false;
  },
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: dict.ptBR,
    locale: "pt-BR",
  }),
}));

const mockAsset: Asset = {
  ticker: "PETR4",
  name: "Petrobras",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 35,
  dividends3y: [3, 3.5, 4],
  dividendHistory: [
    { year: 2021, amount: 3 },
    { year: 2022, amount: 3.5 },
    { year: 2023, amount: 4 },
  ],
  exDividendDate: null,
  epsCurrent: 4.5,
  epsNext: 5.0,
  paymentMonths: [1, 4, 8, 12],
  metrics: {
    peRatio: 4.5,
    pbRatio: 1.1,
    eps: 4.5,
    roe: 22,
    currentDy: 10,
    capRate: null,
    vacancy: null,
    expenseRatio: null,
    aum: null,
    trackingError: null,
    payoutRatio: 45,
    dividendCagr5y: 5.2,
  },
  sector: "Petróleo",
  dividendEvents: [],
};

describe("ResultStats — Paywall & InfoTooltip decoupling", () => {
  const onShowPaywall = vi.fn();
  const onTargetYieldChange = vi.fn();
  const onAveragePriceChange = vi.fn();
  const onCustomTaxRateChange = vi.fn();
  const onTimeframeChange = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockCustomTaxUnlocked = false;
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof ResultStats>> = {}) => {
    return render(
      <ResultStats
        asset={mockAsset}
        timeframe={5}
        availableTimeframes={[1, 3, 5]}
        onTimeframeChange={onTimeframeChange}
        avg={3.5}
        netAvg={3.5}
        isUs={false}
        avgYieldPct={10}
        yocPct={null}
        exDateFormatted={null}
        ceiling={35}
        targetYield={6}
        margin={10}
        positive={true}
        averagePrice={30}
        customTaxRate={null}
        onTargetYieldChange={onTargetYieldChange}
        onAveragePriceChange={onAveragePriceChange}
        onCustomTaxRateChange={onCustomTaxRateChange}
        isPro={false}
        onShowPaywall={onShowPaywall}
        {...props}
      />
    );
  };

  it("triggers onShowPaywall when clicking the summary row as a free user", () => {
    mockCustomTaxUnlocked = false;
    renderComponent();

    const summaryText = screen.getAllByText(dict.ptBR.form.taxExceptions)[0];
    fireEvent.click(summaryText);

    expect(onShowPaywall).toHaveBeenCalledTimes(1);
  });

  it("does NOT trigger onShowPaywall when clicking the educational InfoTooltip trigger", () => {
    mockCustomTaxUnlocked = false;
    renderComponent();

    // Find the tooltip trigger link specifically inside the Tax Exceptions summary
    const tooltipLinks = screen.getAllByRole("link");
    expect(tooltipLinks.length).toBeGreaterThan(0);

    fireEvent.click(tooltipLinks[0]);

    // Clicking the tooltip link must NOT trigger the paywall
    expect(onShowPaywall).not.toHaveBeenCalled();
  });

  it("does not trigger onShowPaywall when customTaxUnlocked is true", () => {
    mockCustomTaxUnlocked = true;
    renderComponent();

    const summaryText = screen.getAllByText(dict.ptBR.form.taxExceptions)[0];
    fireEvent.click(summaryText);

    expect(onShowPaywall).not.toHaveBeenCalled();
  });
});
