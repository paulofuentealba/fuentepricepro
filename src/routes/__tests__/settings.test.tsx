// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Route } from "../settings";

let mockSettings: any = {
  weeklyDigestEmailConsent: false,
  newsDigestPreferences: {
    frequency: "weekly",
    dayOfWeek: "monday",
    dayOfMonth: "first_business_day",
    timeOfDay: "morning",
    includeIncomeAnnouncements: true,
    includeRiskAlerts: true,
    includeThesisDrift: true,
    includeOpportunities: true,
  },
  taxJurisdiction: "BR",
};

const mockUpdateSettings = vi.fn((newSettings) => {
  mockSettings = { ...mockSettings, ...newSettings };
});

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/integrations/firebase/client", () => ({
  auth: {
    currentUser: {
      uid: "user-123",
      email: "investor@fuentepricepro.com",
      displayName: "Investor Test",
      reload: vi.fn(),
    },
    onAuthStateChanged: (cb: any) => {
      cb({ uid: "user-123" });
      return () => {};
    },
  },
  db: {},
}));

vi.mock("firebase/auth", () => ({
  updateProfile: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
  GoogleAuthProvider: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false,
    data: () => ({}),
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  writeBatch: vi.fn(),
}));

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({
    user: {
      uid: "user-123",
      email: "investor@fuentepricepro.com",
      displayName: "Investor Test",
      providerData: [],
    },
    loading: false,
  }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  DEFAULT_DIGEST_PREFERENCES: {
    frequency: "weekly",
    dayOfWeek: "monday",
    dayOfMonth: "first_business_day",
    timeOfDay: "morning",
    includeIncomeAnnouncements: true,
    includeRiskAlerts: true,
    includeThesisDrift: true,
    includeOpportunities: true,
  },
  useUserSettings: () => ({
    settings: mockSettings,
    updateSettings: mockUpdateSettings,
  }),
}));

vi.mock("@/lib/watchlist", () => ({
  useWatchlist: () => ({ items: [] }),
}));

vi.mock("@/lib/subscription", () => ({
  useSubscription: () => ({ isPro: true }),
}));

vi.mock("@/lib/useFeatureGate", () => ({
  useFeatureGate: () => true,
}));

vi.mock("@/lib/useInvestorProfile", () => ({
  useInvestorProfile: () => ({
    profile: {
      goal: "income",
      horizon: "long",
      completedAt: Date.now(),
    },
  }),
}));

vi.mock("@/lib/verifySession.functions", () => ({
  verifySessionFn: vi.fn().mockResolvedValue({ authenticated: true }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Settings Route - Notifications Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {
      weeklyDigestEmailConsent: false,
      newsDigestPreferences: {
        frequency: "weekly",
        dayOfWeek: "monday",
        dayOfMonth: "first_business_day",
        timeOfDay: "morning",
        includeIncomeAnnouncements: true,
        includeRiskAlerts: true,
        includeThesisDrift: true,
        includeOpportunities: true,
      },
      taxJurisdiction: "BR",
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("renderiza o card de resumo de notificações na aba Perfil com status inativo", () => {
    const Component = (Route as any).component;
    render(<Component />);

    // Tab buttons exist
    expect(screen.getByRole("tab", { name: /Perfil/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Assinatura/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Notificações/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Privacidade/i })).toBeTruthy();

    // Summary card in profile tab
    expect(screen.getByText("Resumo Executivo por E-mail")).toBeTruthy();
    expect(screen.getByText("Inativo")).toBeTruthy();
    expect(screen.getByText(/Receba alertas no seu e-mail sobre cortes de dividendos/i)).toBeTruthy();
    expect(screen.getByText("Configurar preferências")).toBeTruthy();
  });

  it("permite navegar para a aba Notificações clicando no botão do card de resumo", () => {
    const Component = (Route as any).component;
    render(<Component />);

    const configureBtn = screen.getByText("Configurar preferências");
    fireEvent.click(configureBtn);

    // Now in notifications tab
    expect(screen.getByText("Notificações & Resumo Executivo")).toBeTruthy();
    expect(screen.getByText("Ativar envio de resumos da carteira")).toBeTruthy();
  });

  it("exibe badge Ativo e frequência no card de resumo quando o digest está configurado", () => {
    mockSettings.weeklyDigestEmailConsent = true;
    mockSettings.newsDigestPreferences = {
      frequency: "weekly",
      dayOfWeek: "monday",
      dayOfMonth: "first_business_day",
      timeOfDay: "morning",
      includeIncomeAnnouncements: true,
      includeRiskAlerts: true,
      includeThesisDrift: true,
      includeOpportunities: true,
    };

    const Component = (Route as any).component;
    render(<Component />);

    expect(screen.getByText("Ativo")).toBeTruthy();
    expect(screen.getByText("Semanal · Segunda-feira (manhã)")).toBeTruthy();
    expect(screen.getByText("4 de 4 tópicos ativos")).toBeTruthy();
    expect(screen.getByText("Gerenciar notificações")).toBeTruthy();
  });
});
