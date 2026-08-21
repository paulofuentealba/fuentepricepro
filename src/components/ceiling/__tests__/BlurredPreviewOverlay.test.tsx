// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BlurredPreviewOverlay } from "../BlurredPreviewOverlay";
import { dict } from "@/lib/i18n";

let mockUser: { uid: string; email?: string } | null = null;
const mockOpenAuthModal = vi.fn();

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

vi.mock("@/lib/auth-modal", () => ({
  useAuthModal: () => ({
    openAuthModal: mockOpenAuthModal,
    closeAuthModal: vi.fn(),
  }),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "ptBR",
    t: dict.ptBR,
  }),
}));

describe("BlurredPreviewOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders preview content and feature texts for 'cashflow'", () => {
    render(
      <BlurredPreviewOverlay feature="cashflow">
        <div data-testid="children-content">Sensitive Cashflow Chart</div>
      </BlurredPreviewOverlay>
    );

    expect(screen.getByTestId("children-content")).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.previewOverlay.cashflowTitle)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.previewOverlay.cashflowDesc)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.previewOverlay.cashflowBullet1)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(dict.ptBR.previewOverlay.unlockProCta, "i") })).toBeInTheDocument();
  });

  it("renders feature texts for 'smartallocation'", () => {
    render(
      <BlurredPreviewOverlay feature="smartallocation">
        <div data-testid="children-content">Sensitive Allocation Table</div>
      </BlurredPreviewOverlay>
    );

    expect(screen.getByText(dict.ptBR.previewOverlay.smartAllocationTitle)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.previewOverlay.smartAllocationDesc)).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.previewOverlay.smartAllocationBullet1)).toBeInTheDocument();
  });

  it("invokes openAuthModal when an unauthenticated user clicks 'Desbloquear Pro'", () => {
    mockUser = null;
    render(
      <BlurredPreviewOverlay feature="cashflow">
        <div>Content</div>
      </BlurredPreviewOverlay>
    );

    const button = screen.getByRole("button", { name: new RegExp(dict.ptBR.previewOverlay.unlockProCta, "i") });
    fireEvent.click(button);

    expect(mockOpenAuthModal).toHaveBeenCalledTimes(1);
  });

  it("opens PaywallDialog when an authenticated user clicks 'Desbloquear Pro'", () => {
    mockUser = { uid: "user-123", email: "user@example.com" };
    render(
      <BlurredPreviewOverlay feature="cashflow">
        <div>Content</div>
      </BlurredPreviewOverlay>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const button = screen.getByRole("button", { name: new RegExp(dict.ptBR.previewOverlay.unlockProCta, "i") });
    fireEvent.click(button);

    // PaywallDialog is now open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(dict.ptBR.paywall.title)).toBeInTheDocument();
    expect(mockOpenAuthModal).not.toHaveBeenCalled();
  });
});
