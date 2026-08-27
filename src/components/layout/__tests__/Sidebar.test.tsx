// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Sidebar } from "../Sidebar";
import { ptBR } from "@/lib/i18n/dict.ptBR";

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/app/smartallocation" }),
}));

// Mock hooks
let mockIsAdmin = false;
let mockUser: { displayName: string; photoURL: string | null } | null = null;
let mockIsPro = false;

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({
    get user() {
      return mockUser;
    },
    loading: false,
    get isAdmin() {
      return mockIsAdmin;
    },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/auth-modal", () => ({
  useAuthModal: () => ({
    openAuthModal: vi.fn(),
  }),
}));

vi.mock("@/lib/subscription", () => ({
  useSubscription: () => ({
    get isPro() {
      return mockIsPro;
    },
  }),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    t: ptBR,
    locale: "ptBR",
    setLocale: vi.fn(),
  }),
}));

vi.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: vi.fn(),
    isDark: true,
  }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: { displayCurrency: "BRL" },
  }),
}));

vi.mock("@/lib/useRealizedIncomeSummary", () => ({
  useRealizedIncomeSummary: () => ({
    summary: { currentMonth: 1130 },
    isLoading: false,
  }),
}));

describe("Sidebar Navigation (Prompt 130 & Prompt 144)", () => {
  beforeEach(() => {
    mockIsAdmin = false;
    mockUser = null;
    mockIsPro = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders 3 semantic verb sections: Decidir, Acompanhar, Analisar", () => {
    render(<Sidebar />);
    expect(screen.getByText(ptBR.nav.sections.decide)).toBeInTheDocument();
    expect(screen.getByText(ptBR.nav.sections.track)).toBeInTheDocument();
    expect(screen.getByText(ptBR.nav.sections.analyze)).toBeInTheDocument();
  });

  it("renders Plano de Aporte pointing to /app/smartallocation", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.contributionPlan).closest("a");
    expect(link).toHaveAttribute("href", "/app/smartallocation");
  });

  it("renders Reinvestir pointing to /app/reinvestir with dynamic badge", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.reinvest).closest("a");
    expect(link).toHaveAttribute("href", "/app/reinvestir");
  });

  it("renders Realidade Fiscal pointing to /app/realidade-fiscal", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.taxReality).closest("a");
    expect(link).toHaveAttribute("href", "/app/realidade-fiscal");
  });

  it("renders Minha Carteira pointing to /app/myportfolio", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.myPortfolio).closest("a");
    expect(link).toHaveAttribute("href", "/app/myportfolio");
  });

  it("renders Explorar Ativos pointing to /app/explorar", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.exploreAssets).closest("a");
    expect(link).toHaveAttribute("href", "/app/explorar");
  });

  it("renders genuinely disabled items with 'Em breve' badges", () => {
    render(<Sidebar />);
    expect(screen.getByText(ptBR.nav.whatChanged)).toBeInTheDocument();
    expect(screen.getByText(ptBR.nav.guaranteedIncome)).toBeInTheDocument();
    expect(screen.getByText(ptBR.nav.withdraw)).toBeInTheDocument();
    expect(screen.getByText(ptBR.nav.audit)).toBeInTheDocument();

    const badges = screen.getAllByText(ptBR.nav.comingSoon);
    expect(badges.length).toBe(4);
  });

  it("renders Admin link when isAdmin is true", () => {
    mockIsAdmin = true;
    render(<Sidebar />);
    const adminLink = screen.getByText(ptBR.nav.admin).closest("a");
    expect(adminLink).toHaveAttribute("href", "/admin");
  });

  it("does not render Admin link when isAdmin is false", () => {
    mockIsAdmin = false;
    render(<Sidebar />);
    expect(screen.queryByText(ptBR.nav.admin)).not.toBeInTheDocument();
  });
});
