// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GoalPlanner } from "../GoalPlanner";
import { dict, type Locale } from "@/lib/i18n";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});
Object.defineProperty(global, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

let currentLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({
    user: { uid: "test-user" },
    loading: false,
  }),
}));

vi.mock("@/lib/auth-modal", () => ({
  useAuthModal: () => ({
    openAuthModal: vi.fn(),
  }),
}));

function renderWithLocale(locale: Locale) {
  currentLocale = locale;
  return render(
    <GoalPlanner
      annualDividend={2.5}
      currentPrice={30.0}
      currency="BRL"
    />
  );
}

describe("GoalPlanner i18n", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders localized sharesNeededLabel in Portuguese (ptBR)", () => {
    renderWithLocale("ptBR");
    expect(screen.getByText("Cotas necessárias")).toBeInTheDocument();
    expect(screen.getByText("Capital estimado")).toBeInTheDocument();
  });

  it("renders localized sharesNeededLabel in English (en)", () => {
    renderWithLocale("en");
    expect(screen.getByText("Shares needed")).toBeInTheDocument();
    expect(screen.getByText("Estimated capital")).toBeInTheDocument();
  });

  it("renders localized sharesNeededLabel in Spanish (es)", () => {
    renderWithLocale("es");
    expect(screen.getByText("Acciones necesarias")).toBeInTheDocument();
    expect(screen.getByText("Capital estimado")).toBeInTheDocument();
  });
});
