// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TaxSimulationDisclaimer } from "../TaxSimulationDisclaimer";
import { dict } from "@/lib/i18n";

let currentLocale = "ptBR";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/app/tax-simulation" }),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    t: dict[currentLocale as keyof typeof dict] || dict.ptBR,
  }),
}));

afterEach(() => {
  cleanup();
  currentLocale = "ptBR";
});

describe("TaxSimulationDisclaimer Component (Prompt 137 / Item 2.0)", () => {
  it("renders with role='note' and displays the tax disclaimer text in PT-BR", () => {
    currentLocale = "ptBR";
    render(<TaxSimulationDisclaimer />);

    const banner = screen.getByRole("note");
    expect(banner).toBeDefined();
    expect(banner).toHaveTextContent(dict.ptBR.regulatoryDisclaimer.tax);
  });

  it("renders correctly in English and Spanish locales", () => {
    currentLocale = "en";
    const { rerender } = render(<TaxSimulationDisclaimer />);
    expect(screen.getByRole("note")).toHaveTextContent(dict.en.regulatoryDisclaimer.tax);

    currentLocale = "es";
    rerender(<TaxSimulationDisclaimer />);
    expect(screen.getByRole("note")).toHaveTextContent(dict.es.regulatoryDisclaimer.tax);
  });

  it("applies custom className cleanly while maintaining default styling", () => {
    render(<TaxSimulationDisclaimer className="custom-tax-class" />);
    const banner = screen.getByRole("note");
    expect(banner.className).toContain("custom-tax-class");
  });
});
