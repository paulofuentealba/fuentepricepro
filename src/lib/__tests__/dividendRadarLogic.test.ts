import { describe, it, expect } from "vitest";
import {
  calculateNetYield,
  buildRadarItems,
  detectPortfolioGaps,
  RADAR_CATALOG,
} from "../dividendRadarLogic";
import type { ValuedWatchlistItem } from "../useValuedPortfolio";

describe("dividendRadarLogic", () => {
  describe("calculateNetYield", () => {
    it("applies 30% IRS withholding for USD assets under BR tax jurisdiction", () => {
      const grossDy = 4.0;
      const net = calculateNetYield(grossDy, "USD", "STOCK_US", false, "BR");
      expect(net).toBeCloseTo(2.8, 2); // 4 * 0.7 = 2.8
    });

    it("applies 0% withholding for USD assets under US tax resident jurisdiction", () => {
      const grossDy = 4.0;
      const net = calculateNetYield(grossDy, "USD", "STOCK_US", false, "US");
      expect(net).toBe(4.0);
    });

    it("treats FIIs as 100% tax exempt for individual investors in Brazil", () => {
      const grossDy = 10.5;
      const net = calculateNetYield(grossDy, "BRL", "FII", false, "BR");
      expect(net).toBe(10.5);
    });

    it("treats FII_INFRA as 100% tax exempt in Brazil", () => {
      const grossDy = 12.0;
      const net = calculateNetYield(grossDy, "BRL", "FII_INFRA", false, "BR");
      expect(net).toBe(12.0);
    });

    it("applies 15% IRRF withholding on Brazilian JCP", () => {
      const grossDy = 8.0;
      const net = calculateNetYield(grossDy, "BRL", "STOCK_BR", true, "BR");
      expect(net).toBeCloseTo(6.8, 2); // 8 * 0.85 = 6.8
    });

    it("treats standard Brazilian dividends as 100% tax exempt for PF", () => {
      const grossDy = 7.0;
      const net = calculateNetYield(grossDy, "BRL", "STOCK_BR", false, "BR");
      expect(net).toBe(7.0);
    });

    it("returns 0 for negative, null, or zero yield", () => {
      expect(calculateNetYield(0, "BRL", "STOCK_BR")).toBe(0);
      expect(calculateNetYield(-5, "BRL", "STOCK_BR")).toBe(0);
      expect(calculateNetYield(null as any, "BRL", "STOCK_BR")).toBe(0);
    });
  });

  describe("buildRadarItems", () => {
    it("builds radar items from static catalog when live data is empty", () => {
      const items = buildRadarItems(null, "BR", "pt-BR");
      expect(items.length).toBe(RADAR_CATALOG.length);

      const bbas3 = items.find((i) => i.ticker === "BBAS3");
      expect(bbas3).toBeDefined();
      expect(bbas3?.ceilingPrice).toBeGreaterThan(0);
      expect(bbas3?.safetyScore).toBeGreaterThanOrEqual(0);
      expect(bbas3?.safetyScore).toBeLessThanOrEqual(100);
      expect(bbas3?.tags).toContain("all");
      expect(bbas3?.months).toEqual(expect.arrayContaining([5, 8]));
    });

    it("merges live prices and recalculates margin when live data is provided", () => {
      const mockLiveData = {
        br: [
          {
            ticker: "BBAS3",
            price: 25.0, // Cheaper price
            annualDividend: 2.5,
          },
        ],
        us: [],
      };

      const items = buildRadarItems(mockLiveData, "BR", "pt-BR");
      const bbas3 = items.find((i) => i.ticker === "BBAS3");
      expect(bbas3?.price).toBe(25.0);
      // Ceiling = 2.5 / 0.06 = 41.666
      // Margin = (41.666 - 25) / 25 * 100 = ~66.6%
      expect(bbas3?.margin).toBeGreaterThan(60);
      expect(bbas3?.tags).toContain("bazin");
    });

    it("correctly identifies trap assets and tags them with risk", () => {
      const items = buildRadarItems(null, "BR", "pt-BR");
      const mxrf = items.find((i) => i.ticker === "MXRF11");
      expect(mxrf?.isTrap).toBe(true);
      expect(mxrf?.tags).toContain("risk");
    });
  });

  describe("detectPortfolioGaps", () => {
    it("returns discovery default with May and Nov when portfolio has no positions", () => {
      const analysis = detectPortfolioGaps([]);
      expect(analysis.hasGaps).toBe(false);
      expect(analysis.weakMonths.length).toBe(2);
      expect(analysis.suggestedMonth).toBe(5);
    });

    it("detects dry months when portfolio has concentrated payments", () => {
      const mockItems = [
        {
          id: "pos-1",
          ticker: "CPLE6",
          name: "Copel",
          type: "STOCK_BR",
          currency: "BRL",
          currentPrice: 10,
          livePrice: 10,
          annualDividend: 1.0,
          targetYield: 6,
          ceilingPrice: 16.6,
          safetyMargin: 66,
          quantity: 1000, // Pays in months 4 and 11
          averagePrice: 8,
          sector: "Utilities",
          isClosedPosition: false,
          isBffMode: true,
          valuation: {} as any,
          paymentMonths: [4, 11],
          payoutRatio: 62,
          addedAt: new Date().toISOString(),
          investingSince: "2020",
        } as unknown as ValuedWatchlistItem,
      ];

      const analysis = detectPortfolioGaps(mockItems);
      expect(analysis.hasGaps).toBe(true);
      // Months other than 4 and 11 will have 0 income, which is < threshold
      const hasJanuary = analysis.weakMonths.some((w) => w.month === 1);
      expect(hasJanuary).toBe(true);
    });
  });
});
