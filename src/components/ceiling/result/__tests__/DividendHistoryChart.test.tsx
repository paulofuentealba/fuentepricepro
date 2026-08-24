// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DividendHistoryChart } from "../DividendHistoryChart";
import { dict } from "@/lib/i18n";

// Polyfill ResizeObserver for Recharts in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: dict.ptBR,
    locale: "ptBR",
  }),
}));

afterEach(() => {
  cleanup();
});

describe("DividendHistoryChart (Tier 1 / Item 2)", () => {
  it("renders without crashing and displays title and legends with sorted data", () => {
    const unsortedData = [
      { year: 2024, amount: 4.0 },
      { year: 2022, amount: 2.0 },
      { year: 2023, amount: 3.0 },
    ];

    render(
      <DividendHistoryChart
        data={unsortedData}
        currency="BRL"
        locale="ptBR"
        title="Histórico de Proventos"
      />
    );

    expect(screen.getByText("Histórico de Proventos")).toBeDefined();
    expect(screen.getByText(dict.ptBR.result.dividends)).toBeDefined();
    expect(screen.getByText(dict.ptBR.result.yoyGrowth)).toBeDefined();
  });

  it("handles empty data array gracefully without throwing", () => {
    render(
      <DividendHistoryChart
        data={[]}
        currency="BRL"
        locale="ptBR"
        title="Histórico Vazio"
      />
    );

    expect(screen.getByText("Histórico Vazio")).toBeDefined();
  });
});
