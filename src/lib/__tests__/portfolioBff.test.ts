import { describe, it, expect } from "vitest";
import { computeValuedPortfolioInternal } from "../portfolioBffLogic";
import { DEFAULT_FEATURE_GATES } from "../featureGates";
import type { WatchlistItem } from "../watchlist";
import type { Transaction } from "../transactionsLogic";

describe("portfolioBff.server - BFF Valuation & Feature Gate", () => {
  it("should have USE_BFF_PORTFOLIO_VALUATION feature gate defined and defaulted to false", () => {
    expect(DEFAULT_FEATURE_GATES.USE_BFF_PORTFOLIO_VALUATION).toBe(false);
  });

  it("should compute valued portfolio response with 1 round-trip server valuation", async () => {
    const items: WatchlistItem[] = [
      {
        id: "1",
        ticker: "BBSE3",
        name: "BB Seguridade",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 34.0,
        averagePrice: 30.0,
        quantity: 100,
        targetYield: 6.0,
        annualDividend: 3.2,
        ceilingPrice: 53.33,
        safetyMargin: 56.85,
        paymentMonths: [4, 8],
        payoutRatio: 80,
        addedAt: 1700000000000,
        investingSince: 1700000000000,
      },
      {
        id: "2",
        ticker: "HGLG11",
        name: "CSHG Logística",
        type: "FII",
        currency: "BRL",
        currentPrice: 160.0,
        averagePrice: 150.0,
        quantity: 10,
        targetYield: 8.0,
        annualDividend: 13.2,
        ceilingPrice: 165.0,
        safetyMargin: 3.12,
        paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        payoutRatio: 95,
        addedAt: 1700000000000,
        investingSince: 1700000000000,
      },
    ];

    const transactions: Transaction[] = [
      { id: "t1", ticker: "BBSE3", type: "buy", date: 1700000000000, quantity: 100, pricePerShare: 30.0 },
      { id: "t2", ticker: "HGLG11", type: "buy", date: 1700000000000, quantity: 10, pricePerShare: 150.0 },
    ];

    const response = await computeValuedPortfolioInternal({
      uid: "user_test_123",
      items,
      transactions,
      selicPct: 10.5,
      terminalGrowthRate: 0.045,
    });

    expect(response.items).toHaveLength(2);

    const bbse = response.items.find((i) => i.ticker === "BBSE3");
    expect(bbse).toBeDefined();
    expect(bbse?.quantity).toBe(100);
    expect(bbse?.totalCost).toBe(3000.0);
    expect(bbse?.bazin).toBeCloseTo(3.2 / 0.06, 1);
    expect(bbse?.assumptions).toBeDefined();

    const hglg = response.items.find((i) => i.ticker === "HGLG11");
    expect(hglg).toBeDefined();
    expect(hglg?.methods.graham).toBeNull(); // Graham forbidden for funds
    expect(hglg?.totalCost).toBe(1500.0);

    expect(response.summary.totalInvested).toBe(4500.0);
    expect(response.summary.currentValue).toBe(100 * 34.0 + 10 * 160.0);
    expect(response.summary.totalDividends).toBe(100 * 3.2 + 10 * 13.2);
  });

  it("should gracefully ignore null, undefined, empty, or non-string tickers without throwing", async () => {
    const malformedItems: any[] = [
      null,
      undefined,
      {},
      { ticker: "" },
      { ticker: "   " },
      { ticker: 12345 },
      {
        id: "valid-1",
        ticker: "ITSA4",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 10.0,
        averagePrice: 9.0,
        quantity: 50,
        targetYield: 6.0,
        annualDividend: 0.8,
      },
    ];

    const response = await computeValuedPortfolioInternal({
      uid: "user_test_123",
      items: malformedItems,
    });

    expect(response.items).toHaveLength(1);
    expect(response.items[0].ticker).toBe("ITSA4");
  });

  it("should cap items to MAX_PORTFOLIO_BFF_ITEMS", async () => {
    const oversizedItems: WatchlistItem[] = Array.from({ length: 300 }, (_, i) => ({
      id: `item-${i}`,
      ticker: `TEST${i}`,
      name: `Test Asset ${i}`,
      type: "STOCK_BR",
      currency: "BRL",
      currentPrice: 10.0,
      averagePrice: 10.0,
      quantity: 1,
      targetYield: 6.0,
      annualDividend: 0.5,
      ceilingPrice: 8.33,
      safetyMargin: -16.7,
      paymentMonths: [1],
      payoutRatio: 50,
      addedAt: 1700000000000,
      investingSince: 1700000000000,
    }));

    const response = await computeValuedPortfolioInternal({
      uid: "user_test_123",
      items: oversizedItems,
    });

    expect(response.items).toHaveLength(250);
  });
});
