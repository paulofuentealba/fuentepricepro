// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ConsensusPyramid } from "../ConsensusPyramid";
import { dict } from "@/lib/i18n";

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

describe("ConsensusPyramid (Tier 1 / Item 4)", () => {
  beforeEach(() => {
    cleanup();
  });

  it("exibe tooltips conceituais quando todos os modelos de valuation são válidos", () => {
    const valuation = {
      bazin: 45.5,
      graham: 50.0,
      gordon: 42.0,
      consensus: 45.5,
    };

    render(<ConsensusPyramid valuation={valuation} currency="BRL" />);

    // 4 tooltip triggers devem estar presentes (Gordon, Bazin, Graham + Consenso central)
    // Cada trigger tem um botão/span com ícone HelpCircle (lucide-circle-question-mark)
    const lucideIcons = document.querySelectorAll(".lucide-circle-question-mark");
    expect(lucideIcons.length).toBe(4);

    // Valores formatados
    expect(screen.getAllByText("R$ 45,50").length).toBe(2); // Bazin e Consenso
    expect(screen.getByText("R$ 50,00")).toBeDefined();
    expect(screen.getByText("R$ 42,00")).toBeDefined();
  });

  it("exibe tooltips de não-aplicabilidade quando os modelos são nulos ou inválidos", () => {
    const valuation = {
      bazin: null,
      graham: 0,
      gordon: null,
      consensus: null,
    };

    render(<ConsensusPyramid valuation={valuation} currency="BRL" />);

    // Tooltip triggers continuam presentes
    const lucideIcons = document.querySelectorAll(".lucide-circle-question-mark");
    expect(lucideIcons.length).toBe(4);

    // Vértices mostram N/A
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBe(4); // Gordon, Bazin, Graham e Consenso
  });
});