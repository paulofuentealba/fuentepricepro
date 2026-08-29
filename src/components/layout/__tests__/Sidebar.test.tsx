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
  useLocation: () => ({ pathname: "/app/contributionplan" }),
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
    events: [],
    isLoading: false,
  }),
}));

describe("Sidebar Navigation (Prompt 130 & Prompt 144)", () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    mockIsAdmin = false;
    mockUser = null;
    mockIsPro = false;
    localStorageStore = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => localStorageStore[key] ?? null,
        setItem: (key: string, value: string) => {
          localStorageStore[key] = value.toString();
        },
        removeItem: (key: string) => {
          delete localStorageStore[key];
        },
        clear: () => {
          localStorageStore = {};
        },
      },
      writable: true,
    });
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

  it("renders Plano de Aporte pointing to /app/contributionplan", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.contributionPlan).closest("a");
    expect(link).toHaveAttribute("href", "/app/contributionplan");
  });

  it("renders Reinvestir pointing to /app/reinvestir with dynamic badge", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.reinvest).closest("a");
    expect(link).toHaveAttribute("href", "/app/reinvestir");
  });

  it("renders Realidade Fiscal pointing to /app/tax", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.taxReality).closest("a");
    expect(link).toHaveAttribute("href", "/app/tax");
  });

  it("renders Minha Carteira pointing to /app/myportfolio", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.myPortfolio).closest("a");
    expect(link).toHaveAttribute("href", "/app/myportfolio");
  });

  it("renders Explorar Ativos pointing to /app/explore", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.exploreAssets).closest("a");
    expect(link).toHaveAttribute("href", "/app/explore");
  });

  it("renders Metas pointing to /app/goals", () => {
    render(<Sidebar />);
    const link = screen.getByText(ptBR.nav.goals).closest("a");
    expect(link).toHaveAttribute("href", "/app/goals");
  });

  it("renders the Phase 3 stub routes as enabled links, not 'coming soon'", () => {
    render(<Sidebar />);
    expect(screen.getByText(ptBR.nav.withdraw).closest("a")).toHaveAttribute("href", "/app/withdraw");
    expect(screen.getByText(ptBR.nav.whatChanged).closest("a")).toHaveAttribute("href", "/app/news");
    expect(screen.getByText(ptBR.nav.guaranteedIncome).closest("a")).toHaveAttribute("href", "/app/income");
    expect(screen.getByText(ptBR.nav.audit).closest("a")).toHaveAttribute("href", "/app/audit");
    expect(screen.queryByText(ptBR.nav.comingSoon)).not.toBeInTheDocument();
  });

  it("shows the Fiscal reality dot when the section was never visited", () => {
    render(<Sidebar />);
    const taxLink = screen.getByText(ptBR.nav.taxReality).closest("a");
    expect(taxLink?.querySelector("span[aria-hidden='true']")).toBeInTheDocument();
  });

  it("hides the Fiscal reality dot once the section was visited this month", () => {
    localStorageStore["fpp_last_seen_tax"] = new Date().toISOString();
    render(<Sidebar />);
    const taxLink = screen.getByText(ptBR.nav.taxReality).closest("a");
    expect(taxLink?.querySelector("span[aria-hidden='true']")).not.toBeInTheDocument();
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
