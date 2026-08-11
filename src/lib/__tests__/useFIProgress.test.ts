// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { calculateMonthsToFI, useFIProgress } from "@/lib/useFIProgress";

const mockUseUserSettings = vi.fn();
const mockUseValuedPortfolio = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => mockUseUserSettings(),
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => mockUseValuedPortfolio(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => mockUseQuery(),
}));

vi.mock("@/lib/queryOptions", () => ({
  exchangeRateQueryOptions: () => ({}),
}));

function makeItem(overrides: Partial<Record<string, any>> = {}) {
  return {
    quantity: 100,
    currentPrice: 50,
    annualDividend: 3,
    currency: "BRL",
    ...overrides,
  };
}

describe("calculateMonthsToFI", () => {
  it("retorna 0 quando o capital atual já atingiu o alvo", () => {
    expect(calculateMonthsToFI(1000, 100, 900, 6)).toBe(0);
  });

  it("calcula meses restantes com yield positivo (progresso parcial)", () => {
    const months = calculateMonthsToFI(1000, 100, 500000, 6);
    expect(months).toBeGreaterThan(0);
    expect(Number.isFinite(months)).toBe(true);
  });

  it("não divide por zero quando a contribuição mensal é zero e não há yield", () => {
    const months = calculateMonthsToFI(0, 0, 100000, 0);
    expect(months).toBe(Infinity);
    expect(Number.isNaN(months)).toBe(false);
  });

  it("retorna Infinity (não NaN) quando contribuição é zero mas há yield", () => {
    const months = calculateMonthsToFI(0, 0, 100000, 6);
    expect(months).toBe(Infinity);
    expect(Number.isNaN(months)).toBe(false);
  });

  it("usa fórmula linear quando o yield anual é zero e há contribuição", () => {
    const months = calculateMonthsToFI(0, 1000, 12000, 0);
    expect(months).toBe(12);
  });
});

describe("useFIProgress", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: { USDBRL: 5 } });
  });

  it("retorna progresso parcial (coveragePercent < 100, isReached false)", () => {
    mockUseUserSettings.mockReturnValue({
      settings: {
        displayCurrency: "BRL",
        monthlyLivingCostGoal: 5000,
        estimatedMonthlyContribution: 1000,
        targetYield: 6,
      },
    });
    mockUseValuedPortfolio.mockReturnValue({
      valuedItems: [makeItem({ quantity: 100, currentPrice: 50, annualDividend: 3 })],
    });

    const { result } = renderHook(() => useFIProgress());

    // annualDividend 3 * 100 = 300/ano => 25/mês; meta 5000 => 0.5%
    expect(result.current.monthlyIncomeBRL).toBeCloseTo(25, 5);
    expect(result.current.coveragePercent).toBeCloseTo(0.5, 5);
    expect(result.current.isReached).toBe(false);
    expect(result.current.monthsToFI).not.toBeNull();
    expect(result.current.isSetup).toBe(true);
  });

  it("retorna isReached true quando a meta é atingida", () => {
    mockUseUserSettings.mockReturnValue({
      settings: {
        displayCurrency: "BRL",
        monthlyLivingCostGoal: 100,
        estimatedMonthlyContribution: 1000,
        targetYield: 6,
      },
    });
    mockUseValuedPortfolio.mockReturnValue({
      valuedItems: [makeItem({ quantity: 1000, currentPrice: 50, annualDividend: 3 })],
    });

    const { result } = renderHook(() => useFIProgress());

    // annualDividend 3 * 1000 = 3000/ano => 250/mês; meta 100 => 100%
    expect(result.current.coveragePercent).toBe(100);
    expect(result.current.isReached).toBe(true);
    expect(result.current.monthsToFI).toBe(0);
  });

  it("não gera NaN quando a contribuição mensal estimada é zero", () => {
    mockUseUserSettings.mockReturnValue({
      settings: {
        displayCurrency: "BRL",
        monthlyLivingCostGoal: 5000,
        estimatedMonthlyContribution: 0,
        targetYield: 6,
      },
    });
    mockUseValuedPortfolio.mockReturnValue({
      valuedItems: [],
    });

    const { result } = renderHook(() => useFIProgress());

    expect(result.current.coveragePercent).toBe(0);
    expect(result.current.isReached).toBe(false);
    expect(Number.isNaN(result.current.monthsToFI as any)).toBe(false);
    expect(result.current.monthsToFI).toBeNull();
  });

  it("expõe isSetup=false e coveragePercent=0 quando a meta de gastos não está configurada, mesmo com patrimônio positivo (bug real: Horizonte FI mostrando 0.0% com R$300k acumulados e milestone batido)", () => {
    mockUseUserSettings.mockReturnValue({
      settings: {
        displayCurrency: "BRL",
        monthlyLivingCostGoal: undefined,
        estimatedMonthlyContribution: undefined,
        targetYield: 6,
      },
    });
    mockUseValuedPortfolio.mockReturnValue({
      valuedItems: [makeItem({ quantity: 6000, currentPrice: 50.0675, annualDividend: 3 })],
    });

    const { result } = renderHook(() => useFIProgress());

    // Patrimônio positivo (~R$300k), mas sem meta configurada.
    expect(result.current.totalCapitalBRL).toBeGreaterThan(100_000);
    expect(result.current.isSetup).toBe(false);
    expect(result.current.coveragePercent).toBe(0);
    expect(result.current.isReached).toBe(false);
  });
});
