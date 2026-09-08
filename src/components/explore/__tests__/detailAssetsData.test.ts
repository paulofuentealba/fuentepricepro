import { describe, it, expect } from "vitest";
import { getDynamicClassMetrics } from "../detailAssetsData";

describe("detailAssetsData - getDynamicClassMetrics i18n & zero Portuguese leak", () => {
  const sampleMetrics = {
    peRatio: 28.5,
    pbRatio: 45.2,
    roe: 1.45,
    payoutRatio: 0.15,
    eps: 6.42,
    dividendCagr5y: 0.085,
    currentDy: 0.005,
    vacancy: 0.02,
    capRate: 0.075,
    expenseRatio: 0.0003,
    trackingError: 0.0002,
    aum: 500000000000,
    bvps: 4.25,
  };

  describe("STOCK_US (e.g. AAPL) in English", () => {
    it("returns 100% English metrics, labels, and tooltips with zero Portuguese leakage", () => {
      const res = getDynamicClassMetrics("STOCK_US", sampleMetrics, "USD", "en");

      expect(res.badge).toBe("US CORPORATE METRICS");
      expect(res.title).toBe("Profitability, Multiples & Global Moat");

      const labels = res.items.map((i) => i.label);
      expect(labels).toEqual(["P/E", "P/B", "ROE", "PAYOUT", "EPS", "DIVIDEND CAGR"]);

      // Must not leak Portuguese terms
      expect(labels).not.toContain("P/L");
      expect(labels).not.toContain("P/VP");
      expect(labels).not.toContain("LPA (EPS)");
      expect(labels).not.toContain("CAGR DIVIDENDOS");

      // Verify English tooltip descriptions
      const descs = res.items.map((i) => i.desc);
      expect(descs[0]).toBe("Price to Earnings per share (EPS)");
      expect(descs[1]).toBe("Price to Book value per share (BVPS)");
      expect(descs[2]).toBe("Return on Equity (net income over equity)");
      expect(descs[3]).toBe("Percentage of net income distributed as dividends");
      expect(descs[4]).toBe("Net accounting profit per share");
      expect(descs[5]).toBe("Compound annual dividend growth rate");

      // Ensure no Portuguese words leak in tooltips
      const allText = JSON.stringify(res);
      expect(allText).not.toMatch(/patrimônio|lucro|líquido|ações|provento/i);
    });
  });

  describe("REIT in English", () => {
    it("returns English REIT metrics and tooltips", () => {
      const res = getDynamicClassMetrics("REIT", sampleMetrics, "USD", "en");

      expect(res.badge).toBe("US REAL ESTATE METRICS");
      expect(res.title).toBe("REIT Operational Cash Flow (FFO)");

      const labels = res.items.map((i) => i.label);
      expect(labels).toEqual(["P/FFO", "FFO PAYOUT", "OCCUPANCY", "CAP RATE", "WALT", "DIVIDEND YIELD"]);

      const allText = JSON.stringify(res);
      expect(allText).not.toMatch(/imóveis|renda|patrimônio/i);
    });
  });

  describe("ETF in English", () => {
    it("returns English ETF metrics and tooltips", () => {
      const res = getDynamicClassMetrics("ETF", sampleMetrics, "USD", "en");

      expect(res.badge).toBe("INDEX FUND METRICS");
      expect(res.title).toBe("Tracking Efficiency & Costs");

      const labels = res.items.map((i) => i.label);
      expect(labels).toContain("EXPENSE RATIO");
      expect(labels).toContain("TRACKING ERROR");
      expect(labels).toContain("BASKET P/E");
      expect(labels).toContain("AUM (ASSETS)");
    });
  });

  describe("FII in English", () => {
    it("returns English localized FII metrics and tooltips", () => {
      const res = getDynamicClassMetrics("FII", sampleMetrics, "BRL", "en");

      expect(res.badge).toBe("BRAZIL REAL ESTATE METRICS (FII)");
      expect(res.title).toBe("Real Estate Portfolio Efficiency");

      const labels = res.items.map((i) => i.label);
      expect(labels).toContain("P/NAV");
      expect(labels).toContain("NAV PER SHARE");
      expect(labels).toContain("PHYSICAL VACANCY");
      expect(labels).toContain("AVG CAP RATE");
    });
  });

  describe("Portuguese (ptBR) fallback preservation", () => {
    it("preserves standard Brazilian Portuguese labels and tooltips when locale is ptBR", () => {
      const res = getDynamicClassMetrics("STOCK_BR", sampleMetrics, "BRL", "ptBR");

      expect(res.badge).toBe("FUNDAMENTOS CORPORATIVOS & DIVIDENDOS");
      expect(res.title).toBe("Rentabilidade, Múltiplos & Moat");

      const labels = res.items.map((i) => i.label);
      expect(labels).toEqual(["P/L", "P/VP", "ROE", "PAYOUT", "LPA (EPS)", "CAGR DIVIDENDOS"]);
      expect(res.items[0].desc).toBe("Preço sobre Lucro por ação (LPA)");
    });
  });
});
