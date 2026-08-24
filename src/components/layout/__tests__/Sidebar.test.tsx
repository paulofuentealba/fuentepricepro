// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Sidebar } from "../Sidebar";
import { dict, type Locale } from "@/lib/i18n";

let currentLocale: Locale = "ptBR";
let mockIsAdmin = false;
let mockUser: any = { displayName: "Admin User", photoURL: null };

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: currentLocale,
    setLocale: vi.fn(),
    t: dict[currentLocale],
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/app/" }),
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({
    user: mockUser,
    isAdmin: mockIsAdmin,
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

describe("Sidebar — Admin link in profile dropdown", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Admin link pointing to /admin when isAdmin is true and profile dropdown is opened", () => {
    mockIsAdmin = true;
    render(<Sidebar />);

    const trigger = screen.getByText("Admin User");
    fireEvent.pointerDown(trigger, { pointerType: "mouse" });

    const adminText = screen.getByText(dict.ptBR.admin.title);
    expect(adminText).toBeInTheDocument();
    expect(adminText.closest("a")).toHaveAttribute("href", "/admin");
  });

  it("does not render Admin link when isAdmin is false and profile dropdown is opened", () => {
    mockIsAdmin = false;
    render(<Sidebar />);

    const trigger = screen.getByText("Admin User");
    fireEvent.pointerDown(trigger, { pointerType: "mouse" });

    const adminText = screen.queryByText(dict.ptBR.admin.title);
    expect(adminText).not.toBeInTheDocument();
  });
});
