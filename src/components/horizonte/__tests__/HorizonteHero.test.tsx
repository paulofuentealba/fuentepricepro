// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HorizonteHero } from "@/components/horizonte/HorizonteHero";

const mockUseFIProgress = vi.fn();
const mockUseValuedPortfolio = vi.fn();

vi.mock("@/lib/useFIProgress", () => ({
  useFIProgress: () => mockUseFIProgress(),
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => mockUseValuedPortfolio(),
}));

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
      items: [{ id: "1" }],
      isAppLoading: false,
    });

    render(<HorizonteHero />);

    // A headline nunca deve mostrar "0.0%" neste cenário contraditório.
    expect(screen.queryByText("0.0%")).not.toBeInTheDocument();

    // O milestone de R$100 mil deve continuar marcado como batido.
    expect(screen.getByText(/Primeiros R\$ 100 mil/)).toBeInTheDocument();
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
      items: [{ id: "1" }],
      isAppLoading: false,
    });

    render(<HorizonteHero />);

    expect(screen.getByText("42.5%")).toBeInTheDocument();
  });
});
