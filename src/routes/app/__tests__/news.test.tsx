// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

const mockValuedItems: any[] = [
  {
    ticker: "MXRF11",
    type: "FII",
    currency: "BRL",
    quantity: 100,
    currentPrice: 10.0,
    livePrice: 10.0,
    annualDividend: 1.3,
    isClosedPosition: false,
    valuation: {
      activeCeiling: 9.0,
      margin: -10.0,
      yieldTrapWarning: true,
    },
  },
  {
    ticker: "BBAS3",
    type: "STOCK_BR",
    currency: "BRL",
    quantity: 0,
    currentPrice: 26.15,
    livePrice: 26.15,
    annualDividend: 2.3,
    isClosedPosition: false,
    valuation: {
      activeCeiling: 31.0,
      margin: 18.5,
      yieldTrapWarning: false,
    },
  },
];

const mockEvents: any[] = [
  {
    ticker: "TAEE11",
    isPaid: false,
    paymentDate: "2026-10-15",
    amountGross: 600,
    amountNet: 596,
    currency: "BRL",
  },
];

let mockSettings: any = {
  weeklyDigestEmailConsent: false,
  newsDigestPreferences: {
    frequency: "weekly",
    dayOfWeek: "monday",
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

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "pt-BR",
    t: {
      toasts: { settingsSaved: "Configurações salvas." },
      common: { close: "Fechar" },
      newsScreen: {
        metaTitle: "O Que Mudou | Fuente Price Pro",
        eyebrowPrefix: "Desde sua última visita ·",
        eyebrowToday: "Hoje",
        eyebrowDaysAgo: "há {{days}} dias",
        eyebrowDayAgo: "há 1 dia",
        title: "O que mudou",
        receiveByEmail: "Receber por e-mail toda segunda",
        kpis: {
          attentionRequired: "Precisam de atenção",
          attentionSub: "tese pode ter mudado",
          enteredBuyZone: "Entraram na zona",
          enteredBuyZoneSub: "abaixo do teto",
          announcedDividends: "Proventos anunciados",
          announcedCount: "{{count}} anúncios",
          announcedCountSingle: "1 anúncio",
          netWorthChange: "Patrimônio",
          inTheWeek: "na semana",
        },
        feed: {
          sectionTitle: "Mudanças que exigem sua atenção",
          byImpactPill: "por impacto",
          emptyTitle: "Tudo sob controle",
          emptyDesc: "Nenhuma alteração crítica detectada na sua carteira desde sua última visita.",
          actions: {
            viewIncomeImpact: "Ver impacto na sua renda →",
            compareThesis: "Comparar tese original vs. hoje →",
            addToNextContribution: "Incluir no próximo aporte →",
            viewGuaranteedIncome: "Ver renda garantida →",
          },
          timeAgo: {
            today: "hoje",
            yesterday: "ontem",
            daysAgo: "há {{days}} dias",
          },
          templates: {
            yieldTrapTitle: "Sinal de armadilha de yield em {{ticker}}",
            yieldTrapDesc: "Yield atual de {{currentYield}}% supera em mais de 2x a média histórica.",
            buyZoneTitle: "{{ticker}} entrou na sua zona de compra",
            buyZoneDesc: "Caiu para {{price}}, agora {{margin}}% abaixo do consenso.",
            dividendAnnouncedTitle: "{{ticker}} anunciou novos proventos",
            dividendAnnouncedDesc: "Provento de {{amount}} anunciado.",
          },
        },
        digestModal: {
          title: "Configurações de Envio por E-mail",
          description: "Personalize quando e quais novidades da sua carteira você deseja receber.",
          emailLabel: "E-mail de destino",
          masterToggleLabel: "Ativar envio de resumos da carteira",
          masterToggleDesc: "Receba alertas no seu e-mail.",
          subscribedAlert: "Notificações por e-mail ativas.",
          unsubscribedAlert: "Ative para receber o resumo das mudanças na sua carteira.",
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
          buttons: {
            default: "Receber por e-mail",
            subscribedWeeklyMonday: "Digest semanal · Segundas",
            subscribedWeeklyFriday: "Digest semanal · Sextas",
            subscribedMonthlyFirstBusiness: "Digest mensal · 1º dia útil",
            subscribedMonthlyFirst: "Digest mensal · Dia 1º",
            subscribedMonthlyFifteenth: "Digest mensal · Dia 15",
            subscribedCritical: "Alertas críticos por e-mail",
            subscribedGeneric: "Digest por e-mail ativo",
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

vi.mock("@/lib/useMarketScope", () => ({
  useMarketScope: () => ({ currency: "BRL" }),
}));

vi.mock("@/lib/useValuedPortfolio", () => ({
  useValuedPortfolio: () => ({
    valuedItems: mockValuedItems,
    totals: {
      usdWorth: 1000,
      brlWorth: 5500,
    },
    fx: { USDBRL: 5.5 },
  }),
}));

vi.mock("@/lib/transactions", () => ({
  useTransactions: () => ({ transactions: [] }),
}));

vi.mock("@/lib/useRealizedIncomeSummary", () => ({
  useRealizedIncomeSummary: () => ({ events: mockEvents }),
}));

vi.mock("@/lib/horizonteTrajectory", () => ({
  useHorizonteTrajectory: () => ({ points: [] }),
}));

vi.mock("@/lib/useLastSeen", () => ({
  useLastSeen: () => ({
    lastSeen: "2026-09-18T10:00:00.000Z",
    isMounted: true,
    markSeenNow: vi.fn(),
  }),
}));

vi.mock("@/lib/auth-provider", () => ({
  useAuth: () => ({
    user: { email: "investor@fuentepricepro.com", uid: "u123" },
  }),
}));

vi.mock("@/lib/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: mockSettings,
    updateSettings: mockUpdateSettings,
  }),
  DEFAULT_DIGEST_PREFERENCES: {
    frequency: "weekly",
    dayOfWeek: "monday",
    timeOfDay: "morning",
    includeIncomeAnnouncements: true,
    includeRiskAlerts: true,
    includeThesisDrift: true,
    includeOpportunities: true,
  },
}));

import { Route } from "../news";

describe("NewsPage (/app/news)", () => {
  it("renderiza o cabeçalho completo, os 4 KPIs e os cards do feed", () => {
    mockSettings.weeklyDigestEmailConsent = false;
    const Component = (Route as any).component;
    render(<Component />);

    // Top Header
    expect(screen.getByText("O que mudou")).toBeTruthy();
    expect(screen.getByText("Receber por e-mail")).toBeTruthy();

    // KPIs
    expect(screen.getByText("Precisam de atenção")).toBeTruthy();
    expect(screen.getByText("Entraram na zona")).toBeTruthy();
    expect(screen.getByText("Proventos anunciados")).toBeTruthy();
    expect(screen.getByText("Patrimônio")).toBeTruthy();

    // Feed items
    expect(screen.getByText("Mudanças que exigem sua atenção")).toBeTruthy();
    expect(screen.getByText(/Sinal de armadilha de yield em MXRF11/i)).toBeTruthy();
    expect(screen.getByText(/BBAS3 entrou na sua zona de compra/i)).toBeTruthy();
  });

  it("abre o modal de configuração de e-mail ao clicar no botão do cabeçalho e salva preferências", () => {
    mockSettings.weeklyDigestEmailConsent = false;
    const Component = (Route as any).component;
    render(<Component />);

    const emailButton = screen.getByText("Receber por e-mail");
    fireEvent.click(emailButton);

    expect(screen.getByText("Configurações de Envio por E-mail")).toBeTruthy();
    expect(screen.getByText("investor@fuentepricepro.com")).toBeTruthy();
    expect(screen.getByText("Ativar envio de resumos da carteira")).toBeTruthy();

    // Click master toggle to enable
    fireEvent.click(screen.getByText("Ativar envio de resumos da carteira"));

    // Frequency options should be visible
    expect(screen.getByText("Semanal")).toBeTruthy();
    expect(screen.getByText("Mensal")).toBeTruthy();
    expect(screen.getByText("Apenas Críticos")).toBeTruthy();

    // Switch to Monthly
    fireEvent.click(screen.getByText("Mensal"));

    // Save preferences
    fireEvent.click(screen.getByText("Salvar preferências"));

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        weeklyDigestEmailConsent: true,
        newsDigestPreferences: expect.objectContaining({
          frequency: "monthly",
        }),
      }),
    );
  });

  it("exibe rótulo dinâmico no botão quando o digest semanal está ativo", () => {
    mockSettings.weeklyDigestEmailConsent = true;
    mockSettings.newsDigestPreferences = {
      frequency: "weekly",
      dayOfWeek: "monday",
      timeOfDay: "morning",
      includeIncomeAnnouncements: true,
      includeRiskAlerts: true,
      includeThesisDrift: true,
      includeOpportunities: true,
    };

    const Component = (Route as any).component;
    render(<Component />);

    expect(screen.getByText("Digest semanal · Segundas")).toBeTruthy();
  });
});
