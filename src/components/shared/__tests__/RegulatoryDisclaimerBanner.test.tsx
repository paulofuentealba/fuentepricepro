// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RegulatoryDisclaimerBanner } from "@/components/shared/RegulatoryDisclaimerBanner";
import { dict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

let mockPathname = "/app/screener";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: mockPathname }),
}));

let mockLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({ locale: mockLocale, setLocale: () => {}, t: dict[mockLocale] }),
}));

afterEach(() => {
  cleanup();
});

describe("RegulatoryDisclaimerBanner", () => {
  const calculationRoutes = [
    "/app/screener",
    "/app/myportfolio",
    "/app/comparator",
    "/app/cashflow",
    "/app/smartallocation",
    "/app/snowballeffectsimulator",
  ];

  const nonDisclaimerRoutes = ["/settings", "/privacy", "/terms", "/app"];

  for (const route of calculationRoutes) {
    it(`renders on calculation route ${route}`, () => {
      mockPathname = route;
      mockLocale = "ptBR";
      render(<RegulatoryDisclaimerBanner />);
      expect(screen.getByText(dict.ptBR.regulatoryDisclaimer.message)).toBeInTheDocument();
    });
  }

  for (const route of nonDisclaimerRoutes) {
    it(`does not render on non-calculation route ${route}`, () => {
      mockPathname = route;
      mockLocale = "ptBR";
      const { container } = render(<RegulatoryDisclaimerBanner />);
      expect(container).toBeEmptyDOMElement();
    });
  }

  (["ptBR", "en", "es"] as const).forEach((locale) => {
    it(`renders the approved text for locale "${locale}"`, () => {
      mockPathname = "/app/screener";
      mockLocale = locale;
      render(<RegulatoryDisclaimerBanner />);
      expect(screen.getByText(dict[locale].regulatoryDisclaimer.message)).toBeInTheDocument();
    });
  });

  it("does not alter the approved legal text (PT-BR)", () => {
    expect(dict.ptBR.regulatoryDisclaimer.message).toBe(
      "Fuente Price Pro é uma ferramenta educacional e de análise quantitativa. Nenhum cálculo, projeção ou consenso de valuation constitui recomendação de investimento, análise de valores mobiliários ou parecer fiscal formal. Consulte um profissional certificado antes de decidir.",
    );
  });

  it("does not alter the approved legal text (EN)", () => {
    expect(dict.en.regulatoryDisclaimer.message).toBe(
      "Fuente Price Pro is an educational and quantitative analysis tool. No calculation, projection, or valuation consensus constitutes investment advice, securities analysis, or formal tax opinion. Consult a certified professional before deciding.",
    );
  });

  it("does not alter the approved legal text (ES)", () => {
    expect(dict.es.regulatoryDisclaimer.message).toBe(
      "Fuente Price Pro es una herramienta educativa y de análisis cuantitativo. Ningún cálculo, proyección o consenso de valuation constituye recomendación de inversión, análisis de valores mobiliarios u opinión fiscal formal. Consulte a un profesional certificado antes de decidir.",
    );
  });
});
