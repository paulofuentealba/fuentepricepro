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

  it("should convert USD assets using exchangeRate in summary totals while preserving native currency on individual items", async () => {
    const items: WatchlistItem[] = [
      {
        id: "brl-1",
        ticker: "ITSA4",
        name: "Itaúsa",
        type: "STOCK_BR",
        currency: "BRL",
        currentPrice: 10.0,
        averagePrice: 8.0,
        quantity: 100,
        targetYield: 6.0,
        annualDividend: 0.8,
        ceilingPrice: 13.33,
        safetyMargin: 33.3,
        paymentMonths: [3, 6, 9, 12],
        payoutRatio: 40,
        addedAt: 1700000000000,
        investingSince: 1700000000000,
      },
      {
        id: "usd-1",
        ticker: "AAPL",
        name: "Apple Inc.",
        type: "STOCK_US",
        currency: "USD",
        currentPrice: 200.0,
        averagePrice: 150.0,
        quantity: 10,
        targetYield: 3.0,
        annualDividend: 4.0,
        ceilingPrice: 133.33,
        safetyMargin: -33.3,
        paymentMonths: [2, 5, 8, 11],
        payoutRatio: 25,
        addedAt: 1700000000000,
        investingSince: 1700000000000,
      },
    ];

    const fxRate = 6.0; // 1 USD = 6.00 BRL
    const response = await computeValuedPortfolioInternal({
      uid: "user_test_mixed",
      items,
      exchangeRate: fxRate,
    });

    expect(response.items).toHaveLength(2);

    const brlItem = response.items.find((i) => i.ticker === "ITSA4");
    const usdItem = response.items.find((i) => i.ticker === "AAPL");

    // Individual items stay in native currency
    expect(brlItem?.totalCost).toBe(100 * 8.0); // 800 BRL
    expect(brlItem?.totalValue).toBe(100 * 10.0); // 1000 BRL
    expect(brlItem?.totalDividends).toBe(100 * 0.8); // 80 BRL

    expect(usdItem?.totalCost).toBe(10 * 150.0); // 1500 USD
    expect(usdItem?.totalValue).toBe(10 * 200.0); // 2000 USD
    expect(usdItem?.totalDividends).toBe(10 * 4.0); // 40 USD

    // Summary converts USD to BRL:
    // totalInvested: 800 BRL + (1500 USD * 6.0) = 800 + 9000 = 9800 BRL
    expect(response.summary.totalInvested).toBe(800 + 1500 * fxRate);
    // currentValue: 1000 BRL + (2000 USD * 6.0) = 1000 + 12000 = 13000 BRL
    expect(response.summary.currentValue).toBe(1000 + 2000 * fxRate);
    // totalDividends: 80 BRL + (40 USD * 6.0) = 80 + 240 = 320 BRL
    expect(response.summary.totalDividends).toBe(80 + 40 * fxRate);
    expect(response.summary.projectedAnnualIncome).toBe(80 + 40 * fxRate);
  });

  it("should apply classTargetYields to compute ceilingPrice when item has no custom targetYield", async () => {
    const fiiItem: WatchlistItem = {
      id: "fii-1",
      ticker: "KNRI11",
      name: "Kinea Renda",
      type: "FII",
      currency: "BRL",
      currentPrice: 150.0,
      averagePrice: 140.0,
      quantity: 10,
      targetYield: null as any, // Not customized on item
      annualDividend: 12.0,
      ceilingPrice: 200.0,
      safetyMargin: 33.3,
      paymentMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      payoutRatio: 95,
      addedAt: 1700000000000,
      investingSince: 1700000000000,
    };

    // 1. Without classTargetYields (default global 6%) -> Bazin = 12 / 0.06 = 200.0
    const responseDefault = await computeValuedPortfolioInternal({
      uid: "user_test_default",
      items: [fiiItem],
      targetYield: 6.0,
    });
    expect(responseDefault.items[0].bazin).toBeCloseTo(200.0, 1);

    // 2. With classTargetYields (FII = 8.5%) -> Bazin = 12 / 0.085 = 141.17
    const responseClass = await computeValuedPortfolioInternal({
      uid: "user_test_class",
      items: [fiiItem],
      targetYield: 6.0,
      classTargetYields: {
        FII: 8.5,
      },
    });
    expect(responseClass.items[0].bazin).toBeCloseTo(12.0 / 0.085, 1);
  });
});
