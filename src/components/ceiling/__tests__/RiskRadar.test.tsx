// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RiskRadar } from "../RiskRadar";
import { dict, type Locale } from "@/lib/i18n";

let currentLocale: Locale = "ptBR";
let mockRiskData: any = {
  totalEquity: 0,
  warnings: [],
  currencies: [],
  types: [],
  assets: [],
  sectors: [],
};

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

vi.mock("@/lib/usePortfolioRisk", () => ({
  usePortfolioRisk: () => mockRiskData,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

describe("RiskRadar i18n & displayTicker", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Empty state button translation", () => {
    beforeEach(() => {
      mockRiskData = {
        totalEquity: 0,
        warnings: [],
        currencies: [],
        types: [],
        assets: [],
        sectors: [],
      };
    });

    it("renders empty state button in Portuguese (ptBR)", () => {
      currentLocale = "ptBR";
      render(<RiskRadar />);
      expect(screen.getByText("Ir para o Portfólio")).toBeInTheDocument();
    });

    it("renders empty state button in English (en)", () => {
      currentLocale = "en";
      render(<RiskRadar />);
      expect(screen.getByText("Go to Portfolio")).toBeInTheDocument();
    });

    it("renders empty state button in Spanish (es)", () => {
      currentLocale = "es";
      render(<RiskRadar />);
      expect(screen.getByText("Ir al Portafolio")).toBeInTheDocument();
    });
  });

  describe("Concentration table displayTicker", () => {
    it("formats SA ticker using displayTicker in concentration table", () => {
      currentLocale = "ptBR";
      mockRiskData = {
        totalEquity: 10000,
        warnings: [],
        currencies: [],
        types: [],
        assets: [
          {
            id: "1",
            ticker: "PETR4.SA",
            type: "STOCK_BR",
            weightPct: 25.5,
            valueBase: 2550,
          },
        ],
        sectors: [],
      };

      render(<RiskRadar />);
      // displayTicker converts "PETR4.SA" to "PETR4"
      expect(screen.getByText("PETR4")).toBeInTheDocument();
      expect(screen.queryByText("PETR4.SA")).not.toBeInTheDocument();
    });
  });
});
