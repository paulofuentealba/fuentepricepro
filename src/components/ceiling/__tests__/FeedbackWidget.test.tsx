// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { FeedbackWidget } from "../FeedbackWidget";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "sonner";

const mockOpenAuthModal = vi.fn();
let mockUser: { uid: string } | null = { uid: "test-user-123" };

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

vi.mock("@/lib/auth-modal", () => ({
  useAuthModal: () => ({
    openAuthModal: mockOpenAuthModal,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/integrations/firebase/client", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...pathSegments) => ({
    path: pathSegments.join("/"),
  })),
  setDoc: vi.fn(),
}));

describe("FeedbackWidget", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUser = { uid: "test-user-123" };
  });

  it("opens auth modal when a guest clicks the feedback button", () => {
    mockUser = null;
    render(<FeedbackWidget />);

    const triggerBtn = screen.getByTestId("feedback-widget-trigger");
    fireEvent.click(triggerBtn);

    expect(mockOpenAuthModal).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the feedback dialog for an authenticated user", () => {
    render(<FeedbackWidget />);

    const triggerBtn = screen.getByTestId("feedback-widget-trigger");
    fireEvent.click(triggerBtn);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByPlaceholderText(/compartilhe uma ideia/i)).toBeDefined();
  });

  it("validates empty message and shows error toast without writing to Firestore", async () => {
    render(<FeedbackWidget />);

    fireEvent.click(screen.getByTestId("feedback-widget-trigger"));

    const dialog = screen.getByRole("dialog");
    const sendBtn = within(dialog).getByRole("button", { name: /enviar feedback/i });
    fireEvent.click(sendBtn);

    expect(toast.error).toHaveBeenCalledWith("Escreva uma mensagem antes de enviar.");
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("successfully persists feedback to Firestore under users/{uid}/feedbacks/{id} and closes dialog", async () => {
    vi.mocked(setDoc).mockResolvedValueOnce(undefined);
    render(<FeedbackWidget />);

    fireEvent.click(screen.getByTestId("feedback-widget-trigger"));

    const dialog = screen.getByRole("dialog");
    const textarea = within(dialog).getByPlaceholderText(/compartilhe uma ideia/i);
    fireEvent.change(textarea, { target: { value: "Excelente aplicativo de dividendos!" } });

    const sendBtn = within(dialog).getByRole("button", { name: /enviar feedback/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    const callArgs = vi.mocked(setDoc).mock.calls[0];
    const payload = callArgs[1] as any;

    expect(payload.uid).toBe("test-user-123");
    expect(payload.message).toBe("Excelente aplicativo de dividendos!");
    expect(payload.locale).toBe("ptBR");
    expect(typeof payload.createdAt).toBe("number");
    expect(payload.id).toMatch(/^fb-\d+-[a-z0-9]+$/);
    expect(doc).toHaveBeenCalledWith(
      expect.anything(),
      "users",
      "test-user-123",
      "feedbacks",
      payload.id
    );

    expect(toast.success).toHaveBeenCalledWith("Obrigado! Seu feedback foi registrado.");
  });

  it("preserves message and keeps dialog open when Firestore write fails", async () => {
    vi.mocked(setDoc).mockRejectedValueOnce(new Error("Network connection error"));
    render(<FeedbackWidget />);

    fireEvent.click(screen.getByTestId("feedback-widget-trigger"));

    const dialog = screen.getByRole("dialog");
    const textarea = within(dialog).getByPlaceholderText(/compartilhe uma ideia/i);
    fireEvent.change(textarea, { target: { value: "Minha sugestão importante que não posso perder" } });

    const sendBtn = within(dialog).getByRole("button", { name: /enviar feedback/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Falha ao enviar feedback. Tente novamente.");
    });

    // Dialog stays open and text remains in textarea
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByDisplayValue("Minha sugestão importante que não posso perder")).toBeDefined();
  });
});
