// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AskScreen } from "../AskScreen";
import {
  accelerateSnowballStrategy,
  correctDriftStrategy,
  reinforcePayerStrategy,
} from "@/lib/askEngine";
import { dict } from "@/lib/i18n";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

// Mock tanstack router Link and useLocation
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/app/reinvestir" }),
}));

// Mock i18n
vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({ locale: "ptBR", setLocale: () => {}, t: dict.ptBR }),
}));

afterEach(() => {
  cleanup();
});

function createMockPosition(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  const margin = overrides.safetyMargin ?? 30;
  const ceiling = overrides.ceilingPrice ?? 40;
  const dy = overrides.valuation?.dividendYield ?? 9.5;

  const base: ValuedWatchlistItem = {
    id: "item-1",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 28.5,
    livePrice: 28.5,
    annualDividend: 2.7,
    targetYield: 6,
    ceilingPrice: ceiling,
    safetyMargin: margin,
    quantity: 100,
    averagePrice: 25.0,
    paymentMonths: [3, 6, 9, 12],
    payoutRatio: 40,
    sector: "Financeiro",
    addedAt: 1700000000000,
    investingSince: 1700000000000,
    isClosedPosition: false,
    isBffMode: true,
    valuation: {
      ticker: "BBAS3",
      activeCeiling: ceiling,
      margin: margin,
      fuenteConsensus: ceiling,
      methods: { bazin: ceiling, graham: 45.0, gordon: 40.0, lynch: null },
      assumptions: [],
      investorProfile: "moderate",
      bazin: ceiling,
      graham: 45.0,
      gordon: 40.0,
      lynch: null,
      gordonConfidence: "high",
      consensus: ceiling,
      dividendYield: dy,
      positive: true,
      isUnavailable: false,
      yieldTrapWarning: false,
      shareholderYield: null,
    },
  };

  return {
    ...base,
    ...overrides,
    valuation: {
      ...base.valuation,
      activeCeiling: overrides.ceilingPrice ?? base.valuation.activeCeiling,
      margin: overrides.safetyMargin ?? base.valuation.margin,
      dividendYield: overrides.valuation?.dividendYield ?? base.valuation.dividendYield,
      ...(overrides.valuation || {}),
    },
  };
}

describe("AskScreen Component (Prompt 135 / Item 1.3)", () => {
  const mockPositions = [
    createMockPosition({ ticker: "BBAS3", livePrice: 25, valuation: { ...createMockPosition({}).valuation, dividendYield: 10.0 } }),
    createMockPosition({ ticker: "TAEE11", livePrice: 35, valuation: { ...createMockPosition({}).valuation, dividendYield: 8.5 } }),
  ];

  const strategies = [
    accelerateSnowballStrategy,
    correctDriftStrategy,
    reinforcePayerStrategy,
  ];

  it("renders question, strategy tabs and calculated allocations with interpolated numbers", () => {
    render(
      <AskScreen
        questionKey="askScreen.reinvestQuestion"
        strategies={strategies}
        defaultStrategyId="accelerateSnowball"
        positions={mockPositions}
        settings={{ smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 } }}
        initialAmount={500}
      />
    );

    // Question header is displayed
    expect(screen.getByText("Onde alocar seus proventos para acelerar a colheita de dividendos?")).toBeDefined();

    // Strategy tabs are rendered
    expect(screen.getByText("Acelerar Bola de Neve")).toBeDefined();
    expect(screen.getByText("Corrigir Desvio")).toBeDefined();
    expect(screen.getByText("Reforçar Quem Pagou")).toBeDefined();

    // Allocations are displayed with ticker, amount and interpolated reason
    expect(screen.getByText("BBAS3")).toBeDefined();
    expect(screen.getByText("Maior Dividend Yield líquido (10%) entre os ativos elegíveis")).toBeDefined();

    // Regulatory disclaimer is present
    expect(screen.getByRole("note")).toBeDefined();
  });

  it("does not globally block screen when targets are missing; tab switching isolates the requirement", () => {
    render(
      <AskScreen
        questionKey="askScreen.reinvestQuestion"
        strategies={strategies}
        defaultStrategyId="accelerateSnowball"
        positions={mockPositions}
        settings={{}} // No targets configured
        initialAmount={500}
      />
    );

    // In accelerateSnowball (default), allocations work normally without targets
    expect(screen.getByText("BBAS3")).toBeDefined();

    // Switch to Correct Drift tab (which requires targets)
    const driftTab = screen.getByRole("tab", { name: "Corrigir Desvio" });
    fireEvent.click(driftTab);

    // Now correctDrift shows the missing targets notice
    expect(screen.getByText("Metas de alocação não configuradas")).toBeDefined();
    expect(screen.getByText("Configurar Metas")).toBeDefined();

    // Switch back to Accelerate Snowball
    const snowballTab = screen.getByRole("tab", { name: "Acelerar Bola de Neve" });
    fireEvent.click(snowballTab);

    // Screen is functional again
    expect(screen.getByText("BBAS3")).toBeDefined();
  });

  it("renders reinforcePayer with empty state when sourceTicker is omitted", () => {
    render(
      <AskScreen
        questionKey="askScreen.reinvestQuestion"
        strategies={strategies}
        defaultStrategyId="reinforcePayer"
        positions={mockPositions}
        settings={{ smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 } }}
        initialAmount={500}
        sourceTicker={undefined}
      />
    );

    expect(screen.getByText("Nenhum pagador específico selecionado")).toBeDefined();
  });

  it("updates allocation calculations dynamically when available amount input is changed", () => {
    render(
      <AskScreen
        questionKey="askScreen.reinvestQuestion"
        strategies={strategies}
        defaultStrategyId="accelerateSnowball"
        positions={mockPositions}
        settings={{ smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 } }}
        initialAmount={100} // 100 / 25 = 4 shares of BBAS3
      />
    );

    expect(screen.getByText("4 cotas")).toBeDefined();

    const input = screen.getByLabelText(/Valor disponível/i);
    fireEvent.change(input, { target: { value: "250" } }); // 250 / 25 = 10 shares of BBAS3

    expect(screen.getByText("10 cotas")).toBeDefined();
  });

  it("calls onExport with the currently active strategy when tab is switched before export click", () => {
    const handleExport = vi.fn();

    render(
      <AskScreen
        questionKey="askScreen.reinvestQuestion"
        strategies={strategies}
        defaultStrategyId="accelerateSnowball"
        positions={mockPositions}
        settings={{ smartAllocationTargets: { STOCK_BR: 100, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 } }}
        initialAmount={500}
        onExport={handleExport}
      />
    );

    // Switch tab to "Corrigir Desvio" before clicking export
    const driftTab = screen.getByRole("tab", { name: "Corrigir Desvio" });
    fireEvent.click(driftTab);

    // Click Export Plan button
    const exportBtn = screen.getByText("Exportar Plano");
    fireEvent.click(exportBtn);

    expect(handleExport).toHaveBeenCalledTimes(1);
    const [calledResult, calledStrategy] = handleExport.mock.calls[0];

    // Confirms that correctDriftStrategy was passed, NOT accelerateSnowball
    expect(calledStrategy.id).toBe("correctDrift");
    expect(calledStrategy).toBe(correctDriftStrategy);
    expect(calledResult.state).toBe("success");
  });
});
