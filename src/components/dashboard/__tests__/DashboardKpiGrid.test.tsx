// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DashboardKpiGrid } from "../DashboardKpiGrid";
import { dict } from "@/lib/i18n";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({ locale: "ptBR", setLocale: () => {}, t: dict.ptBR }),
}));

describe("DashboardKpiGrid", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders exactly 3 KPI cards with values and subtitles", () => {
    render(
      <DashboardKpiGrid
        netWorth={226234.52}
        weightedYoc={11.16}
        monthlyIncome={2249.11}
        currency="BRL"
        isLoading={false}
      />
    );

    // 1. Patrimônio Líquido Real
    expect(screen.getByText(dict.ptBR.dashboard.kpi.netWorth)).toBeInTheDocument();
    expect(screen.getByText("R$ 226.234,52")).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.dashboard.kpi.netWorthSub)).toBeInTheDocument();

    // 2. Yield on Cost Líquido Médio
    expect(screen.getByText(dict.ptBR.dashboard.kpi.weightedYoc)).toBeInTheDocument();
    expect(screen.getByText("11,16%")).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.dashboard.kpi.weightedYocSub)).toBeInTheDocument();

    // 3. Renda Mensal Estimada
    expect(screen.getByText(dict.ptBR.dashboard.kpi.monthlyIncome)).toBeInTheDocument();
    expect(screen.getByText("R$ 2.249,11")).toBeInTheDocument();
    // Subtitle contains 12-month projection
    expect(screen.getByText(/Projeção 12 Meses:/i)).toBeInTheDocument();

    // 4. "Poder de Aporte Disponível" MUST NOT be rendered
    expect(screen.queryByText(dict.ptBR.dashboard.kpi.availableContribution)).toBeNull();
    expect(screen.queryByText(dict.ptBR.dashboard.kpi.availableContributionSub)).toBeNull();
  });

  it("renders loading skeletons when isLoading is true", () => {
    const { container } = render(
      <DashboardKpiGrid
        netWorth={0}
        weightedYoc={0}
        monthlyIncome={0}
        currency="BRL"
        isLoading={true}
      />
    );

    // Labels are visible
    expect(screen.getByText(dict.ptBR.dashboard.kpi.netWorth)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.dashboard.kpi.weightedYoc)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.dashboard.kpi.monthlyIncome)).toBeInTheDocument();

    // Values are not rendered, skeletons are present
    expect(screen.queryByText("R$ 0,00")).toBeNull();
    const skeletons = container.querySelectorAll(".shimmer");
    expect(skeletons.length).toBe(3);
  });

  it("applies responsive 3-column grid classes", () => {
    const { container } = render(
      <DashboardKpiGrid
        netWorth={1000}
        weightedYoc={5}
        monthlyIncome={100}
        currency="BRL"
        isLoading={false}
      />
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid).toHaveClass("grid", "grid-cols-1", "sm:grid-cols-3");
    expect(grid).not.toHaveClass("grid-cols-2");
    expect(grid).not.toHaveClass("lg:grid-cols-4");
  });
});
