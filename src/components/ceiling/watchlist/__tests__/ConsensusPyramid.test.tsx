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

  it("exibe 3 vértices quando lynch não é aplicável (ex: FII/REIT/ETF)", () => {
    const valuation = {
      bazin: 45.5,
      graham: 50.0,
      gordon: 42.0,
      lynch: undefined,
      consensus: 45.5,
    };

    render(<ConsensusPyramid valuation={valuation} currency="BRL" />);

    // 3 vértices de método (Gordon, Bazin, Graham) + Consenso central = 4 triggers
    const lucideIcons = document.querySelectorAll(".lucide-circle-question-mark");
    expect(lucideIcons.length).toBe(4);

    expect(screen.getAllByText("R$ 45,50").length).toBe(2); // Bazin e Consenso
    expect(screen.getByText("R$ 50,00")).toBeDefined();
    expect(screen.getByText("R$ 42,00")).toBeDefined();
    expect(screen.queryByText("Lynch")).toBeNull();
  });

  it("exibe 4 vértices quando lynch é aplicável (STOCK_BR/STOCK_US)", () => {
    const valuation = {
      bazin: 45.5,
      graham: 50.0,
      gordon: 42.0,
      lynch: 60.0,
      consensus: 47.75,
    };

    render(<ConsensusPyramid valuation={valuation} currency="BRL" />);

    // 4 vértices de método (Gordon, Bazin, Graham, Lynch) + Consenso central = 5 triggers
    const lucideIcons = document.querySelectorAll(".lucide-circle-question-mark");
    expect(lucideIcons.length).toBe(5);

    expect(screen.getByText("Lynch")).toBeDefined();
    expect(screen.getByText("R$ 60,00")).toBeDefined();
  });

  it("exibe tooltips de não-aplicabilidade quando os modelos são nulos ou inválidos", () => {
    const valuation = {
      bazin: null,
      graham: 0,
      gordon: null,
      lynch: undefined,
      consensus: null,
    };

    render(<ConsensusPyramid valuation={valuation} currency="BRL" />);

    const lucideIcons = document.querySelectorAll(".lucide-circle-question-mark");
    expect(lucideIcons.length).toBe(4);

    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBe(4); // Gordon, Bazin, Graham e Consenso
  });
});
