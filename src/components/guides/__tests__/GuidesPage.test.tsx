// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GuidesPage, getTabFromPathname, PATH_TO_TAB, TAB_PATHS } from "../GuidesPage";
import { dict } from "@/lib/i18n";

let mockPathname = "/guides";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, onClick, className }: any) => (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: mockPathname }),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({ locale: "ptBR", setLocale: () => {}, t: dict.ptBR }),
}));

describe("GuidesPage Pathname Resolution (getTabFromPathname)", () => {
  it("resolves root /guides and trailing slash to consensus", () => {
    expect(getTabFromPathname("/guides")).toBe("consensus");
    expect(getTabFromPathname("/guides/")).toBe("consensus");
  });

  it("resolves all canonical subpaths to their exact GuideTabId", () => {
    expect(getTabFromPathname("/guides/bazin")).toBe("bazin");
    expect(getTabFromPathname("/guides/graham")).toBe("graham");
    expect(getTabFromPathname("/guides/gordon")).toBe("gordon");
    expect(getTabFromPathname("/guides/peter-lynch")).toBe("peter-lynch");
    expect(getTabFromPathname("/guides/dividend-valuation")).toBe("dividend-valuation");
    expect(getTabFromPathname("/guides/reinvestir")).toBe("reinvestir");
    expect(getTabFromPathname("/guides/contribution-plan")).toBe("contribution-plan");
    expect(getTabFromPathname("/guides/withdraw")).toBe("withdraw");
    expect(getTabFromPathname("/guides/snowball")).toBe("snowball");
    expect(getTabFromPathname("/guides/tax-brazil")).toBe("tax-brazil");
    expect(getTabFromPathname("/guides/tax-usa")).toBe("tax-usa");
    expect(getTabFromPathname("/guides/fi-infra")).toBe("fi-infra");
    expect(getTabFromPathname("/guides/metrics")).toBe("metrics");
    expect(getTabFromPathname("/guides/risk-radar")).toBe("risk-radar");
    expect(getTabFromPathname("/guides/currency-decomposition")).toBe("currency-decomposition");
    expect(getTabFromPathname("/guides/app-directory")).toBe("app-directory");
    expect(getTabFromPathname("/guides/brokers")).toBe("brokers");
    expect(getTabFromPathname("/guides/glossary")).toBe("glossary");
    expect(getTabFromPathname("/guides/concepts")).toBe("concepts");
  });

  it("handles trailing slashes on subpaths", () => {
    expect(getTabFromPathname("/guides/bazin/")).toBe("bazin");
    expect(getTabFromPathname("/guides/tax-brazil/")).toBe("tax-brazil");
  });

  it("falls back to consensus or provided fallback for unknown path", () => {
    expect(getTabFromPathname("/guides/unknown")).toBe("consensus");
    expect(getTabFromPathname("/guides/unknown", "bazin")).toBe("bazin");
  });

  it("guarantees 1:1 bi-directional mapping between TAB_PATHS and PATH_TO_TAB", () => {
    for (const [tabId, path] of Object.entries(TAB_PATHS)) {
      expect(PATH_TO_TAB[path]).toBe(tabId);
    }
  });
});

describe("GuidesPage Interactive Navigation Component", () => {
  beforeEach(() => {
    mockPathname = "/guides";
  });

  it("renders with default tab and switches tab upon clicking a sidebar link", () => {
    render(<GuidesPage />);

    // Initially at /guides (consensus)
    expect(screen.getAllByText(dict.ptBR.docs.consensus.title).length).toBeGreaterThan(0);

    // Find and click on the "Modelo de Bazin" link in the sidebar
    const bazinLinks = screen.getAllByText(dict.ptBR.docs.bazin.title);
    expect(bazinLinks.length).toBeGreaterThan(0);

    fireEvent.click(bazinLinks[0]);

    // The Bazin tab should now be visible and rendered
    expect(screen.getByText(dict.ptBR.docs.bazin.description)).toBeInTheDocument();
  });

  it("initializes to the correct tab when mounted on a specific subpath URL", () => {
    mockPathname = "/guides/graham";
    render(<GuidesPage />);

    expect(screen.getByText(dict.ptBR.docs.graham.description)).toBeInTheDocument();
  });
});
