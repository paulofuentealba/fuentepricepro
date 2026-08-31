// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Header } from "../Header";
import { dict, type Locale } from "@/lib/i18n";

let currentLocale: Locale = "ptBR";

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/app" }),
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({
    user: { email: "investor@fuentepricepro.com" },
    signOut: vi.fn(),
    loading: false,
  }),
}));

vi.mock("@/lib/auth-modal", () => ({
  useAuthModal: () => ({
    openAuthModal: vi.fn(),
  }),
}));

vi.mock("@/lib/subscription", () => ({
  useSubscription: () => ({
    isPro: true,
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

vi.mock("@/lib/useLastSeen", () => ({
  useLastSeen: () => ({
    lastSeen: null,
    isMounted: true,
    markSeenNow: vi.fn(),
  }),
}));

function renderWithLocale(locale: Locale) {
  currentLocale = locale;
  return render(<Header variant="app" />);
}

describe("Header — app variant is desktop-hidden (Sidebar covers desktop chrome)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("hides the whole bar on desktop, leaving only the mobile nav trigger reachable", () => {
    const { container } = renderWithLocale("ptBR");
    const header = container.querySelector("header");
    expect(header).toHaveClass("md:hidden");
  });

  it("no longer renders a USD/BRL exchange rate badge (moved to Sidebar)", () => {
    renderWithLocale("ptBR");
    expect(screen.queryByText(/USD\/BRL/i)).not.toBeInTheDocument();
  });
});
