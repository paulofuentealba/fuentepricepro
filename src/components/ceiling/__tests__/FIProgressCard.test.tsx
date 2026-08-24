// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FIProgressCard } from "../FIProgressCard";
import { dict, type Locale } from "@/lib/i18n";

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});
Object.defineProperty(global, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

let currentLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

vi.mock("@/lib/subscription", () => ({
  useSubscription: () => ({
    isPro: true,
  }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: {
      financialIndependenceGoal: 5000,
      monthlyContribution: 1000,
    },
    updateSettings: vi.fn(),
  }),
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    items: [],
    totals: { totalMonthlyIncome: 1200 },
    fx: { USDBRL: 5.5 },
    isAppLoading: false,
  }),
}));

vi.mock("@/lib/useFIProgress", () => ({
  useFIProgress: () => ({
    settings: {
      monthlyCostGoal: 5000,
      monthlyContribution: 1000,
      enabled: true,
      displayCurrency: "BRL",
    },
    updateSettings: vi.fn(),
    currency: "BRL",
    monthlyCostGoal: 5000,
    monthlyContribution: 1000,
    currentMonthlyIncome: 1200,
    coveragePercent: 24,
    monthsToFI: 50,
    isReached: false,
    isSetup: true,
  }),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

function renderWithLocale(locale: Locale) {
  currentLocale = locale;
  const testClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testClient}>
      <FIProgressCard />
    </QueryClientProvider>
  );
}

describe("FIProgressCard i18n", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders localized title, notice and countdown in Portuguese (ptBR)", () => {
    renderWithLocale("ptBR");
    expect(screen.getByText("Independência financeira")).toBeInTheDocument();
    expect(
      screen.getByText("Valores consolidados com base na cotação atual.")
    ).toBeInTheDocument();
    expect(screen.getByText("4 anos e 2 meses para IF")).toBeInTheDocument();
  });

  it("renders localized title, notice and countdown in English (en)", () => {
    renderWithLocale("en");
    expect(screen.getByText("Financial Independence")).toBeInTheDocument();
    expect(
      screen.getByText("Consolidated values based on current prices.")
    ).toBeInTheDocument();
    expect(screen.getByText("4 years and 2 months to FI")).toBeInTheDocument();
  });

  it("renders localized title, notice and countdown in Spanish (es)", () => {
    renderWithLocale("es");
    expect(screen.getByText("Independencia financiera")).toBeInTheDocument();
    expect(
      screen.getByText("Valores consolidados con base en la cotización actual.")
    ).toBeInTheDocument();
    expect(screen.getByText("4 años y 2 meses para IF")).toBeInTheDocument();
  });
});
