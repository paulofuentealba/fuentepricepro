// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NewsDigestSettingsForm } from "../NewsDigestSettingsForm";

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
};

const mockUpdateSettings = vi.fn((newSettings) => {
  mockSettings = { ...mockSettings, ...newSettings };
});

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

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({
    user: {
      email: "investor@fuentepricepro.com",
      uid: "user-123",
    },
  }),
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "pt-BR",
    t: {
      toasts: { settingsSaved: "Configurações salvas." },
      common: { close: "Fechar" },
      newsScreen: {
        digestModal: {
          title: "Configurações de Envio por E-mail",
          description: "Personalize quando e quais novidades da sua carteira você deseja receber no seu e-mail.",
          emailLabel: "E-mail de destino",
          masterToggleLabel: "Ativar envio de resumos da carteira",
          masterToggleDesc: "Receba alertas no seu e-mail de acordo com a frequência e os tópicos escolhidos.",
          frequencySectionTitle: "Frequência de envio",
          frequencies: {
            weekly: "Semanal",
            weeklyDesc: "Resumo executivo toda semana",
            monthly: "Mensal",
            monthlyDesc: "Consolidado para o dia de aporte",
            criticalOnly: "Apenas Críticos",
            criticalOnlyDesc: "Somente cortes e armadilhas de yield",
          },
          timingSectionTitle: "Dia e horário do envio",
          daysOfWeek: {
            monday: "Segunda-feira (manhã)",
            friday: "Sexta-feira (fechamento)",
          },
          daysOfMonth: {
            firstBusinessDay: "1º dia útil (salário/aporte)",
            firstDay: "Dia 1º do mês",
            fifteenth: "Dia 15 do mês",
          },
          topicsSectionTitle: "O que incluir no relatório",
          topics: {
            income: "Proventos anunciados e pagamentos agendados",
            risk: "Alertas de corte e armadilha de yield",
            thesis: "Desvios na tese de compra e payout elevado",
            opportunities: "Ativos que entraram na zona de compra",
          },
          lgpdNotice: "Respeitamos sua privacidade (LGPD/GDPR).",
          saveBtn: "Salvar preferências",
          cancelBtn: "Cancelar",
          loginRequired: "Faça login com sua conta para ativar os envios por e-mail.",
        },
      },
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("NewsDigestSettingsForm", () => {
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
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("renderiza o formulário com dados do usuário e toggle desligado", () => {
    render(<NewsDigestSettingsForm />);

    expect(screen.getByText("investor@fuentepricepro.com")).toBeTruthy();
    expect(screen.getByText("Ativar envio de resumos da carteira")).toBeTruthy();
    // Frequency buttons should not be visible when toggle is off
    expect(screen.queryByText("Frequência de envio")).toBeNull();
  });

  it("exibe opções completas ao ativar o toggle mestre e permite salvar", () => {
    const onSaved = vi.fn();
    render(<NewsDigestSettingsForm onSaved={onSaved} />);

    // Toggle master
    fireEvent.click(screen.getByText("Ativar envio de resumos da carteira"));

    expect(screen.getByText("Frequência de envio")).toBeTruthy();
    expect(screen.getByText("Semanal")).toBeTruthy();
    expect(screen.getByText("Mensal")).toBeTruthy();
    expect(screen.getByText("Apenas Críticos")).toBeTruthy();

    // Change to monthly
    fireEvent.click(screen.getByText("Mensal"));
    expect(screen.getByText("1º dia útil (salário/aporte)")).toBeTruthy();

    // Select 15th of month
    fireEvent.click(screen.getByText("Dia 15 do mês"));

    // Save
    fireEvent.click(screen.getByText("Salvar preferências"));

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      weeklyDigestEmailConsent: true,
      newsDigestPreferences: expect.objectContaining({
        frequency: "monthly",
        dayOfMonth: "fifteenth",
      }),
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("suporta botão cancelar quando showCancel é true", () => {
    const onCancel = vi.fn();
    render(<NewsDigestSettingsForm showCancel onCancel={onCancel} />);

    const cancelBtn = screen.getByText("Cancelar");
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalled();
  });
});
