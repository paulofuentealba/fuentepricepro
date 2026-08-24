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

vi.mock("@/lib/useHasUSDAssets", () => ({
  useHasUSDAssets: () => ({
    hasUSDAssets: true,
    loading: false,
  }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: { USDBRL: 5.4321 },
      isLoading: false,
    }),
  };
});

function renderWithLocale(locale: Locale) {
  currentLocale = locale;
  return render(<Header variant="app" />);
}

describe("Header — USD/BRL Exchange Rate Badge", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("formats USD/BRL exchange rate canonically with formatCurrency in ptBR", () => {
    renderWithLocale("ptBR");
    // In ptBR, 5.4321 -> R$ 5,43
    expect(screen.getByText(/USD\/BRL\s+R\$\s*5,43/i)).toBeInTheDocument();
  });

  it("formats USD/BRL exchange rate canonically with formatCurrency in en", () => {
    renderWithLocale("en");
    // In en, 5.4321 BRL -> R$ 5,43 (or standard BRL representation)
    expect(screen.getByText(/USD\/BRL\s+R\$\s*5,43/i)).toBeInTheDocument();
  });
});
