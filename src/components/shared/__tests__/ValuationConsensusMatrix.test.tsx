// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ValuationConsensusMatrix } from "../ValuationConsensusMatrix";
import { dict } from "@/lib/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: dict.ptBR,
    locale: "ptBR",
  }),
}));

describe("ValuationConsensusMatrix", () => {
  beforeEach(() => {
    cleanup();
  });

  const mockValuation = {
    bazin: 45.0,
    graham: 50.0,
    gordon: 40.0,
    lynch: 55.0,
    consensus: 47.5,
    methodDetails: {
      bazin: { formula: "DPA / 6%", yieldTarget: 6.0, source: "CVM", date: "2026" },
      gordon: { formula: "D1 / (k - g)", rate: 11.0, growth: 5.0, source: "Fuente", date: "2026" },
      graham: { formula: "√(22.5 × LPA × VPA)", margin: 0, source: "Graham", date: "2026" },
      lynch: { formula: "PEG", growth: 10, dividendYield: 6, source: "Lynch", date: "2026" },
    },
  };

  it("renderiza os 4 modelos e o banner de consenso com data-testid='consensus-pyramid'", () => {
    render(
      <TooltipProvider>
        <ValuationConsensusMatrix
          valuation={mockValuation}
          livePrice={35.0}
          currency="BRL"
          ticker="PETR4"
        />
      </TooltipProvider>
    );

    expect(screen.getByTestId("consensus-pyramid")).toBeInTheDocument();
    expect(screen.getByText("1. Décio Bazin")).toBeInTheDocument();
    expect(screen.getByText("2. Benjamin Graham")).toBeInTheDocument();
    expect(screen.getByText("3. Gordon (DDM)")).toBeInTheDocument();
    expect(screen.getByText("4. Peter Lynch (PEG)")).toBeInTheDocument();
    expect(screen.getByText("PETR4")).toBeInTheDocument();
  });

  it("permite ajustar os sliders de sensibilidade interativamente", () => {
    render(
      <TooltipProvider>
        <ValuationConsensusMatrix
          valuation={mockValuation}
          livePrice={35.0}
          currency="BRL"
          showSensitivitySliders={true}
        />
      </TooltipProvider>
    );

    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBe(3); // Bazin, Gordon k, Gordon g

    // Adjust Bazin yield from 6% to 8%
    fireEvent.change(sliders[0], { target: { value: "8.0" } });
    expect(screen.getAllByText(/8\.0/i).length).toBeGreaterThan(0);
  });

  it("executa a ação de aplicar consenso quando o botão é clicado", async () => {
    const handleApply = vi.fn().mockResolvedValue(undefined);

    render(
      <TooltipProvider>
        <ValuationConsensusMatrix
          valuation={mockValuation}
          livePrice={35.0}
          currency="BRL"
          onApplyAssumptions={handleApply}
        />
      </TooltipProvider>
    );

    const btn = screen.getByText("Aplicar Consenso ao Motor de Aportes");
    fireEvent.click(btn);

    expect(handleApply).toHaveBeenCalledTimes(1);
  });
});
