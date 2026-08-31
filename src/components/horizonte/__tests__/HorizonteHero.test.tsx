// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HorizonteHero } from "@/components/horizonte/HorizonteHero";

const mockUseFIProgress = vi.fn();
const mockUseValuedPortfolio = vi.fn();
const mockUseTransactions = vi.fn();

vi.mock("@/lib/useFIProgress", () => ({
  useFIProgress: () => mockUseFIProgress(),
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => mockUseValuedPortfolio(),
}));

vi.mock("@/lib/transactions", () => ({
  useTransactions: () => mockUseTransactions(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

function renderHero() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HorizonteHero />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseTransactions.mockReturnValue({ transactions: [] });
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

describe("HorizonteHero", () => {
  it("não exibe '0.0%' quando a meta de gastos não está configurada e há patrimônio positivo e milestone batido (regressão do bug real: R$300.405,55 acumulados + milestone R$100k batido mostrando 0.0%)", () => {
    mockUseFIProgress.mockReturnValue({
      coveragePercent: 0,
      isReached: false,
      totalCapitalBRL: 300_405.55,
      monthsToFI: null,
      isSetup: false,
    });
    mockUseValuedPortfolio.mockReturnValue({
      items: [{ id: "1", ticker: "TEST4", currency: "BRL" }],
      valuedItems: [{ id: "1", ticker: "TEST4", currency: "BRL" }],
      isAppLoading: false,
    });

    renderHero();

    // A headline nunca deve mostrar "0.0%" neste cenário contraditório.
    expect(screen.queryByText("0.0%")).not.toBeInTheDocument();

    // O milestone de R$100 mil deve continuar marcado como batido.
    expect(screen.getByText(/Primeiros R\$ 100 mil/)).toBeInTheDocument();

    // Deve renderizar link para configurar meta apontando para /app/myportfolio
    const goalLink = screen.getByRole("link", { name: /configure sua meta/i });
    expect(goalLink).toBeInTheDocument();
    expect(goalLink).toHaveAttribute("href", "/app/myportfolio");
  });

  it("exibe o coveragePercent normalmente quando a meta está configurada", () => {
    mockUseFIProgress.mockReturnValue({
      coveragePercent: 42.5,
      isReached: false,
      totalCapitalBRL: 50_000,
      monthsToFI: 12,
      isSetup: true,
    });
    mockUseValuedPortfolio.mockReturnValue({
      items: [{ id: "1", ticker: "TEST4", currency: "BRL" }],
      valuedItems: [{ id: "1", ticker: "TEST4", currency: "BRL" }],
      isAppLoading: false,
    });

    renderHero();

    expect(screen.getByText("42.5%")).toBeInTheDocument();
  });
});
