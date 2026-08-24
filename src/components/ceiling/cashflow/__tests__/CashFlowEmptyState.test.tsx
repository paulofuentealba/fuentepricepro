// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CashFlowEmptyState } from "../CashFlowEmptyState";
import { dict, type Locale } from "@/lib/i18n";

let currentLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

function renderWithLocale(locale: Locale, onNavigate?: () => void) {
  currentLocale = locale;
  return render(<CashFlowEmptyState onNavigateToCalculator={onNavigate} />);
}

describe("CashFlowEmptyState i18n", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Portuguese texts correctly", () => {
    const onNavigate = vi.fn();
    renderWithLocale("ptBR", onNavigate);

    expect(screen.getByText("Sua história de fluxo de caixa começa aqui")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Adicione ativos pagadores de dividendos para ver o calendário anual, a curva de snowball e o detalhamento mensal."
      )
    ).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Adicione seu primeiro ativo" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("renders English texts correctly", () => {
    renderWithLocale("en");

    expect(screen.getByText("Your cash-flow story starts here")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add dividend-paying assets to see a projected 12-month calendar, snowball line, and per-month breakdown."
      )
    ).toBeInTheDocument();
  });

  it("renders Spanish texts correctly", () => {
    const onNavigate = vi.fn();
    renderWithLocale("es", onNavigate);

    expect(screen.getByText("Tu historia de flujo de caja comienza aquí")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Añade activos que pagan dividendos para ver el calendario anual, la curva de snowball y el desglose mensual."
      )
    ).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Añade tu primer activo" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
