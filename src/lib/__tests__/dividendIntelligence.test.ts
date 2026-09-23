import { describe, it, expect } from "vitest";
import { resolveDividendIntelligence, getAssetShareUnit } from "../dividendIntelligence";
import type { Asset } from "../domain";
import { dict } from "../i18n";

describe("dividendIntelligence", () => {
  const dummyMetrics = {
    peRatio: 10,
    pbRatio: 1,
    eps: 1,
    bvps: 10,
    roe: 10,
    currentDy: 8,
    capRate: null,
    vacancy: null,
    expenseRatio: null,
    aum: null,
    trackingError: null,
    payoutRatio: 50,
    dividendCagr5y: null,
  };

  describe("getAssetShareUnit", () => {
    it("returns correct share unit for FII/FIAGRO/ETF in Portuguese", () => {
      expect(getAssetShareUnit("FII", "BRL", "ptBR")).toBe("cota");
      expect(getAssetShareUnit("FIAGRO", "BRL", "ptBR")).toBe("cota");
      expect(getAssetShareUnit("ETF", "BRL", "ptBR")).toBe("cota");
    });

    it("returns correct share unit for Brazilian stocks in Portuguese", () => {
      expect(getAssetShareUnit("STOCK_BR", "BRL", "ptBR")).toBe("ação");
    });

    it("returns share for US assets in English", () => {
      expect(getAssetShareUnit("STOCK_US", "USD", "en")).toBe("share");
      expect(getAssetShareUnit("REIT", "USD", "en")).toBe("share");
    });

    it("returns cuota / acción in Spanish", () => {
      expect(getAssetShareUnit("FII", "BRL", "es")).toBe("cuota");
      expect(getAssetShareUnit("STOCK_BR", "BRL", "es")).toBe("acción");
    });
  });

  describe("FIIs & FIAGROs (Monthly distributions)", () => {
    it("resolves MXRF11 as Monthly with 12 cycles and actual event amount per quota", () => {
      const mxrf11Asset: Asset = {
        ticker: "MXRF11",
        name: "Maxi Renda FII",
        type: "FII",
        currency: "BRL",
        currentPrice: 10.2,
        dividends3y: [1.2, 1.15, 1.1],
        dividendHistory: [{ year: 2025, amount: 1.2 }],
        exDividendDate: "2026-09-30T00:00:00.000Z",
        epsCurrent: null,
        epsNext: null,
        paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        sector: "Papel",
        metrics: dummyMetrics,
        dividendEvents: [
          {
            exDate: "2026-09-30T00:00:00.000Z",
            paymentDate: "2026-10-14T00:00:00.000Z",
            amountPerShare: 0.1,
          },
        ],
      };

      const result = resolveDividendIntelligence({
        asset: mxrf11Asset,
        ticker: "MXRF11",
        livePrice: 10.2,
        annualDividend: 1.2,
        currency: "BRL",
        locale: "ptBR",
        t: dict.ptBR,
      });

      expect(result.frequency).toBe("monthly");
      expect(result.cyclesPerYear).toBe(12);
      expect(result.frequencyLabel).toBe("Mensal");
      expect(result.nextValFormatted).toBe("R$ 0.10 / cota");
      expect(result.dividendPerCycle).toBe(0.1);
      // 10.20 / 0.10 = 102 quotas to buy 1 new quota
      expect(result.snowballReqQty).toBe(102);
    });

    it("resolves FII with no previous history (IPO) as Monthly due to regulatory class", () => {
      const newFii: Asset = {
        ticker: "NEWF11",
        name: "Novo Fundo Imobiliario",
        type: "FII",
        currency: "BRL",
        currentPrice: 100.0,
        dividends3y: [],
        dividendHistory: [],
        exDividendDate: null,
        epsCurrent: null,
        epsNext: null,
        paymentMonths: [],
        sector: "Tijolo",
        metrics: dummyMetrics,
        dividendEvents: [],
      };

      const result = resolveDividendIntelligence({
        asset: newFii,
        ticker: "NEWF11",
        livePrice: 100.0,
        annualDividend: 8.4,
        currency: "BRL",
        locale: "ptBR",
        t: dict.ptBR,
      });

      expect(result.frequency).toBe("monthly");
      expect(result.cyclesPerYear).toBe(12);
      expect(result.frequencyLabel).toBe("Mensal");
      // 8.4 / 12 = 0.70 / cota
      expect(result.nextValFormatted).toBe("R$ 0.70 / cota");
    });
  });

  describe("ETFs (Accumulating vs Monthly vs Quarterly)", () => {
    it("resolves IVVB11 as Accumulating with no cash distributions", () => {
      const ivvbAsset: Asset = {
        ticker: "IVVB11",
        name: "iShares S&P 500 B3 ETF",
        type: "ETF",
        currency: "BRL",
        currentPrice: 340.0,
        dividends3y: [],
        dividendHistory: [],
        exDividendDate: null,
        epsCurrent: null,
        epsNext: null,
        paymentMonths: [],
        sector: "Índices",
        metrics: dummyMetrics,
        dividendEvents: [],
      };

      const result = resolveDividendIntelligence({
        asset: ivvbAsset,
        ticker: "IVVB11",
        livePrice: 340.0,
        annualDividend: 0,
        currency: "BRL",
        locale: "ptBR",
        t: dict.ptBR,
      });

      expect(result.frequency).toBe("accumulating");
      expect(result.cyclesPerYear).toBe(0);
      expect(result.frequencyLabel).toContain("Sem distribuição em dinheiro");
      expect(result.nextPaymentDateText).toBe("Reinvestimento Automático");
      expect(result.nextValFormatted).toBe("Reinvestido no ETF");
    });

    it("resolves SPYI as Monthly dividend ETF", () => {
      const spyiAsset: Asset = {
        ticker: "SPYI",
        name: "NEOS S&P 500 High Income ETF",
        type: "ETF",
        currency: "USD",
        currentPrice: 50.0,
        dividends3y: [6.0, 5.8],
        dividendHistory: [{ year: 2025, amount: 6.0 }],
        exDividendDate: "2026-09-20T00:00:00.000Z",
        epsCurrent: null,
        epsNext: null,
        paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        sector: "Covered Call",
        metrics: dummyMetrics,
        dividendEvents: [
          {
            exDate: "2026-09-20T00:00:00.000Z",
            paymentDate: "2026-09-27T00:00:00.000Z",
            amountPerShare: 0.5,
          },
        ],
      };

      const result = resolveDividendIntelligence({
        asset: spyiAsset,
        ticker: "SPYI",
        livePrice: 50.0,
        annualDividend: 6.0,
        currency: "USD",
        locale: "en",
        t: dict.en,
      });

      expect(result.frequency).toBe("monthly");
      expect(result.cyclesPerYear).toBe(12);
      expect(result.frequencyLabel).toBe("Monthly");
      expect(result.nextValFormatted).toBe("US$ 0.50 / share");
    });

    it("resolves SCHD as Quarterly dividend ETF", () => {
      const schdAsset: Asset = {
        ticker: "SCHD",
        name: "Schwab US Dividend Equity ETF",
        type: "ETF",
        currency: "USD",
        currentPrice: 78.0,
        dividends3y: [2.8, 2.6],
        dividendHistory: [{ year: 2025, amount: 2.8 }],
        exDividendDate: "2026-09-15T00:00:00.000Z",
        epsCurrent: null,
        epsNext: null,
        paymentMonths: [3, 6, 9, 12],
        sector: "Dividend Value",
        metrics: dummyMetrics,
        dividendEvents: [
          {
            exDate: "2026-09-15T00:00:00.000Z",
            paymentDate: "2026-09-25T00:00:00.000Z",
            amountPerShare: 0.75,
          },
        ],
      };

      const result = resolveDividendIntelligence({
        asset: schdAsset,
        ticker: "SCHD",
        livePrice: 78.0,
        annualDividend: 2.8,
        currency: "USD",
        locale: "en",
        t: dict.en,
      });

      expect(result.frequency).toBe("quarterly");
      expect(result.cyclesPerYear).toBe(4);
      expect(result.frequencyLabel).toBe("Quarterly");
      expect(result.nextValFormatted).toBe("US$ 0.75 / share");
    });
  });

  describe("Stocks (BBAS3 8x, US Quarterly)", () => {
    it("resolves BBAS3 as 8x ao ano", () => {
      const bbasAsset: Asset = {
        ticker: "BBAS3",
        name: "Banco do Brasil",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 28.0,
        dividends3y: [2.4, 2.2],
        dividendHistory: [{ year: 2025, amount: 2.4 }],
        exDividendDate: "2026-09-18T00:00:00.000Z",
        epsCurrent: 6.5,
        epsNext: 7.0,
        paymentMonths: [2, 3, 5, 6, 8, 9, 11, 12],
        sector: "Bancos",
        metrics: dummyMetrics,
        dividendEvents: [
          {
            exDate: "2026-09-18T00:00:00.000Z",
            paymentDate: "2026-10-02T00:00:00.000Z",
            amountPerShare: 0.65,
          },
        ],
      };

      const result = resolveDividendIntelligence({
        asset: bbasAsset,
        ticker: "BBAS3",
        livePrice: 28.0,
        annualDividend: 2.4,
        currency: "BRL",
        locale: "ptBR",
        t: dict.ptBR,
      });

      expect(result.frequency).toBe("8x");
      expect(result.cyclesPerYear).toBe(8);
      expect(result.frequencyLabel).toBe("8x ao ano");
      expect(result.nextValFormatted).toBe("R$ 0.65 / ação");
    });

    it("resolves KO as Quarterly in Spanish", () => {
      const koAsset: Asset = {
        ticker: "KO",
        name: "Coca-Cola Co.",
        type: "STOCK_US",
        currency: "USD",
        currentPrice: 68.0,
        dividends3y: [1.94, 1.84],
        dividendHistory: [{ year: 2025, amount: 1.94 }],
        exDividendDate: "2026-09-14T00:00:00.000Z",
        epsCurrent: 2.8,
        epsNext: 3.0,
        paymentMonths: [3, 6, 9, 12],
        sector: "Bebidas",
        metrics: dummyMetrics,
        dividendEvents: [
          {
            exDate: "2026-09-14T00:00:00.000Z",
            paymentDate: "2026-10-01T00:00:00.000Z",
            amountPerShare: 0.485,
          },
        ],
      };

      const result = resolveDividendIntelligence({
        asset: koAsset,
        ticker: "KO",
        livePrice: 68.0,
        annualDividend: 1.94,
        currency: "USD",
        locale: "es",
        t: dict.es,
      });

      expect(result.frequency).toBe("quarterly");
      expect(result.cyclesPerYear).toBe(4);
      expect(result.frequencyLabel).toBe("Trimestral");
      expect(result.nextValFormatted).toBe("US$ 0.48 / acción");
    });
  });
});
