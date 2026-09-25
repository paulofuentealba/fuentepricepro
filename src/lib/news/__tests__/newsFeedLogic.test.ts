import { describe, it, expect } from "vitest";
import { buildNewsFeed } from "../newsFeedLogic";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Transaction, ThesisSnapshot } from "@/lib/transactions";
import type { ConfirmedUpcomingRow } from "@/lib/incomeGuaranteed";

function mockValuedItem(partial: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  return {
    ticker: "TEST3",
    type: "STOCK_BR",
    currency: "BRL",
    quantity: 100,
    currentPrice: 30.0,
    averagePrice: 28.0,
    annualDividend: 2.5,
    livePrice: 30.0,
    sector: "Financeiro",
    isClosedPosition: false,
    isBffMode: true,
    valuation: {
      activeCeiling: 35.0,
      margin: 16.67,
      consensus: 35.0,
      bazin: 35.0,
      graham: 36.0,
      gordon: null,
      lynch: null,
      yieldTrapWarning: false,
      assumptions: [],
    },
    ...partial,
  } as ValuedWatchlistItem;
}

describe("newsFeedLogic — buildNewsFeed", () => {
  it("retorna estado vazio e KPIs zerados para carteira sem posições", () => {
    const result = buildNewsFeed({
      valuedItems: [],
      transactions: [],
      confirmedUpcoming: [],
      trajectoryPoints: [],
      currentTotalValue: 0,
    });

    expect(result.items).toHaveLength(0);
    expect(result.kpis.attentionCount).toBe(0);
    expect(result.kpis.buyZoneCount).toBe(0);
    expect(result.kpis.announcedDividendsCount).toBe(0);
    expect(result.kpis.announcedDividendsTotal).toBe(0);
    expect(result.kpis.weeklyNetWorthDeltaPercent).toBeNull();
    expect(result.kpis.weeklyNetWorthDirection).toBe("flat");
    expect(result.daysSinceLastVisit).toBeNull();
  });

  it("detecta sinal de yield trap e gera card de severidade bad", () => {
    const trapItem = mockValuedItem({
      ticker: "MXRF11",
      quantity: 500,
      currentPrice: 10.0,
      livePrice: 10.0,
      annualDividend: 1.3,
      valuation: {
        activeCeiling: 9.0,
        margin: -10.0,
        consensus: 9.0,
        bazin: 9.0,
        graham: null,
        gordon: null,
        lynch: null,
        yieldTrapWarning: true,
        assumptions: [],
      } as any,
    });

    const result = buildNewsFeed({
      valuedItems: [trapItem],
    });

    expect(result.kpis.attentionCount).toBe(1);
    const trapFeed = result.items.find((it) => it.category === "cut_or_trap");
    expect(trapFeed).toBeDefined();
    expect(trapFeed?.ticker).toBe("MXRF11");
    expect(trapFeed?.severity).toBe("bad");
    expect(trapFeed?.iconType).toBe("bad");
    expect(trapFeed?.actionType).toBe("income");
  });

  it("detecta desvio de tese quando payout ratio se expande comparado à compra", () => {
    const snapshot: ThesisSnapshot = {
      consensusPrice: 40.0,
      bazinPrice: 38.0,
      grahamPrice: 42.0,
      gordonPrice: null,
      purchasePrice: 30.0,
      safetyMarginVsConsensus: 33.3,
      payoutRatio: 0.72, // 72% at buy
      dividendYield: 9.0,
      dividendCagr5y: 8.0,
      piotroskiScore: 8,
      isYieldTrap: false,
      valuationVersion: "v1",
      capturedAt: 1700000000000,
      unavailableReason: null,
    };

    const buyTx: Transaction = {
      id: "tx-1",
      ticker: "TAEE11",
      type: "buy",
      date: 1700000000000,
      quantity: 200,
      pricePerShare: 30.0,
      thesisSnapshot: snapshot,
    };

    const currentItem = mockValuedItem({
      ticker: "TAEE11",
      quantity: 200,
      payoutRatio: 0.96, // Rose to 96%
      valuation: {
        activeCeiling: 34.0,
        margin: -5.0,
        consensus: 34.0,
        bazin: 34.0,
        graham: null,
        gordon: null,
        lynch: null,
        yieldTrapWarning: false,
        assumptions: [],
      } as any,
    });

    const result = buildNewsFeed({
      valuedItems: [currentItem],
      transactions: [buyTx],
    });

    expect(result.kpis.attentionCount).toBe(1);
    const driftFeed = result.items.find((it) => it.category === "thesis_drift");
    expect(driftFeed).toBeDefined();
    expect(driftFeed?.ticker).toBe("TAEE11");
    expect(driftFeed?.severity).toBe("warn");
    expect(driftFeed?.descParams).toEqual({ from: 72, to: 96 });
    expect(driftFeed?.actionType).toBe("thesis_modal");
  });

  it("identifica ativos na zona de compra com margem de segurança positiva", () => {
    const opportunityItem = mockValuedItem({
      ticker: "BBAS3",
      currentPrice: 26.15,
      livePrice: 26.15,
      valuation: {
        activeCeiling: 31.0,
        margin: 18.5,
        consensus: 31.0,
        bazin: 30.0,
        graham: 32.0,
        gordon: null,
        lynch: null,
        yieldTrapWarning: false,
        assumptions: [],
      } as any,
    });

    const result = buildNewsFeed({
      valuedItems: [opportunityItem],
    });

    expect(result.kpis.buyZoneCount).toBe(1);
    const buyFeed = result.items.find((it) => it.category === "buy_zone");
    expect(buyFeed).toBeDefined();
    expect(buyFeed?.ticker).toBe("BBAS3");
    expect(buyFeed?.severity).toBe("good");
    expect(buyFeed?.actionType).toBe("reinvest");
  });

  it("agrega proventos anunciados e converte moedas com precisão", () => {
    const upcoming: ConfirmedUpcomingRow[] = [
      {
        ticker: "TAEE11",
        currency: "BRL",
        amountGross: 600,
        amountNet: 596,
        paymentDate: "2026-10-05",
        daysUntilPayment: 4,
      },
      {
        ticker: "O",
        currency: "USD",
        amountGross: 32,
        amountNet: 22.4, // US$ 22.40 net
        paymentDate: "2026-10-15",
        daysUntilPayment: 14,
      },
    ];

    const result = buildNewsFeed({
      valuedItems: [],
      confirmedUpcoming: upcoming,
      displayCurrency: "BRL",
      usdRate: 5.5,
    });

    expect(result.kpis.announcedDividendsCount).toBe(2);
    // 596 BRL + (22.4 USD * 5.5 = 123.2 BRL) = 719.2 BRL
    expect(result.kpis.announcedDividendsTotal).toBeCloseTo(719.2, 1);

    const dividendItems = result.items.filter((it) => it.category === "dividend_announced");
    expect(dividendItems).toHaveLength(2);
    expect(dividendItems[0].ticker).toBe("TAEE11");
    expect(dividendItems[0].actionType).toBe("guaranteed");
  });

  it("calcula delta semanal de patrimônio e tempo relativo desde a última visita", () => {
    const now = new Date("2026-09-24T12:00:00.000Z").getTime();
    const lastSeen = "2026-09-18T12:00:00.000Z"; // 6 days ago

    const trajectory = [
      {
        date: "2026-09-17",
        totalValueBRL: 100000,
        totalInvestedBRL: 80000,
        coveragePercent: null,
      },
    ];

    const result = buildNewsFeed({
      valuedItems: [],
      trajectoryPoints: trajectory,
      currentTotalValue: 101800, // +1.8%
      lastSeenNews: lastSeen,
      now,
    });

    expect(result.daysSinceLastVisit).toBe(6);
    expect(result.kpis.weeklyNetWorthDeltaPercent).toBeCloseTo(1.8, 1);
    expect(result.kpis.weeklyNetWorthDirection).toBe("up");
  });
});
