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

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: any) => opts,
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({
    locale: "pt-BR",
    t: {
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
          title: "Digest Semanal por E-mail",
          description: "Receba toda segunda-feira de manhã um resumo executivo.",
          emailLabel: "E-mail de destino",
          subscribedAlert: "Você está cadastrado para receber o digest semanal toda segunda-feira.",
          unsubscribedAlert: "Ative para receber o resumo das mudanças na sua carteira semanalmente.",
          lgpdNotice: "Respeitamos sua privacidade (LGPD/GDPR).",
          enableBtn: "Ativar envio semanal",
          disableBtn: "Desativar envio",
          closeBtn: "Fechar",
          loginRequired: "Faça login com sua conta para ativar os resumos por e-mail.",
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
    settings: { weeklyDigestEmailConsent: false },
    updateSettings: vi.fn(),
  }),
}));

import { Route } from "../news";

describe("NewsPage (/app/news)", () => {
  it("renderiza o cabeçalho completo, os 4 KPIs e os cards do feed", () => {
    const Component = (Route as any).component;
    render(<Component />);

    // Top Header
    expect(screen.getByText("O que mudou")).toBeTruthy();
    expect(screen.getByText(/Receber por e-mail toda segunda/i)).toBeTruthy();

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

  it("abre o modal de digest semanal ao clicar no botão do cabeçalho", () => {
    const Component = (Route as any).component;
    render(<Component />);

    const emailButton = screen.getByText(/Receber por e-mail toda segunda/i);
    fireEvent.click(emailButton);

    expect(screen.getByText("Digest Semanal por E-mail")).toBeTruthy();
    expect(screen.getByText("investor@fuentepricepro.com")).toBeTruthy();
    expect(screen.getByText("Ativar envio semanal")).toBeTruthy();
  });
});
