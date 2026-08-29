// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RegulatoryDisclaimerBanner, EXCLUDED_APP_ROUTES } from "@/components/shared/RegulatoryDisclaimerBanner";
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

describe("RegulatoryDisclaimerBanner (Tier 1 / Item 6)", () => {
  const analyticalAppRoutes = [
    "/app",
    "/app/screener",
    "/app/myportfolio",
    "/app/comparator",
    "/app/income",
    "/app/contributionplan",
    "/app/snowballeffectsimulator",
    "/app/riskradar",
    "/app/globalradar",
  ];

  const excludedOrExternalRoutes = [
    "/app/docs",
    "/app/docs/methodology",
    "/settings",
    "/privacy",
    "/terms",
    "/subscription-terms",
    "/admin",
    "/",
  ];

  for (const route of analyticalAppRoutes) {
    it(`renders on analytical app route ${route}`, () => {
      mockPathname = route;
      mockLocale = "ptBR";
      render(<RegulatoryDisclaimerBanner />);
      expect(screen.getByText(dict.ptBR.regulatoryDisclaimer.message)).toBeInTheDocument();
    });
  }

  for (const route of excludedOrExternalRoutes) {
    it(`does not render on excluded or non-app route ${route}`, () => {
      mockPathname = route;
      mockLocale = "ptBR";
      const { container } = render(<RegulatoryDisclaimerBanner />);
      expect(container).toBeEmptyDOMElement();
    });
  }

  it("handles path-matching edge cases correctly (e.g. /app/docsomething renders, /app/docs does not)", () => {
    // /app/docsomething não é /app/docs nem sub-rota /app/docs/*, logo herda a proteção
    mockPathname = "/app/docsomething";
    mockLocale = "ptBR";
    const { container: renderedContainer } = render(<RegulatoryDisclaimerBanner />);
    expect(screen.getByText(dict.ptBR.regulatoryDisclaimer.message)).toBeInTheDocument();
    cleanup();

    // /app/docs é explicitamente excluído
    mockPathname = "/app/docs";
    const { container: emptyContainer } = render(<RegulatoryDisclaimerBanner />);
    expect(emptyContainer).toBeEmptyDOMElement();
  });

  (["ptBR", "en", "es"] as const).forEach((locale) => {
    it(`renders the approved text for locale "${locale}"`, () => {
      mockPathname = "/app/screener";
      mockLocale = locale;
      render(<RegulatoryDisclaimerBanner />);
      expect(screen.getByText(dict[locale].regulatoryDisclaimer.message)).toBeInTheDocument();
    });
  });

  it("renders specific variants correctly", () => {
    mockPathname = "/app/screener";
    mockLocale = "ptBR";

    const { unmount: u1 } = render(<RegulatoryDisclaimerBanner variant="calculation" />);
    expect(screen.getByText(dict.ptBR.regulatoryDisclaimer.calculation)).toBeInTheDocument();
    u1();

    const { unmount: u2 } = render(<RegulatoryDisclaimerBanner variant="tax" />);
    expect(screen.getByText(dict.ptBR.regulatoryDisclaimer.tax)).toBeInTheDocument();
    u2();

    const { unmount: u3 } = render(<RegulatoryDisclaimerBanner variant="full" />);
    expect(screen.getByText(dict.ptBR.regulatoryDisclaimer.full)).toBeInTheDocument();
    u3();
  });

  it("renders on excluded routes when forceShow is true", () => {
    mockPathname = "/terms";
    mockLocale = "ptBR";

    const { container: hiddenContainer } = render(<RegulatoryDisclaimerBanner />);
    expect(hiddenContainer).toBeEmptyDOMElement();
    cleanup();

    render(<RegulatoryDisclaimerBanner forceShow variant="full" />);
    expect(screen.getByText(dict.ptBR.regulatoryDisclaimer.full)).toBeInTheDocument();
  });

  it("does not alter the approved legal text for calculation variant (PT-BR)", () => {
    expect(dict.ptBR.regulatoryDisclaimer.calculation).toBe(
      "Sugestão de cálculo, não recomendação de investimento. Calculada exclusivamente a partir dos critérios e metas que você configurou. Não constitui consultoria de valores mobiliários (CVM). A decisão de seguir ou não é exclusivamente sua.",
    );
  });

  it("does not alter the approved legal text for calculation variant (EN)", () => {
    expect(dict.en.regulatoryDisclaimer.calculation).toBe(
      "Calculation suggestion, not investment advice. Calculated exclusively based on the criteria and goals you configured. Does not constitute securities advisory (CVM/SEC). The decision to follow it or not is entirely yours.",
    );
  });

  it("does not alter the approved legal text for calculation variant (ES)", () => {
    expect(dict.es.regulatoryDisclaimer.calculation).toBe(
      "Sugerencia de cálculo, no recomendación de inversión. Calculada exclusivamente a partir de los criterios y metas que configuró. No constituye asesoría de valores mobiliarios (CVM). La decisión de seguirla o no es exclusivamente suya.",
    );
  });
});
