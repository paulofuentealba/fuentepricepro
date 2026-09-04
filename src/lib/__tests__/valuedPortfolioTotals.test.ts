import { describe, it, expect } from "vitest";
import { computeTotals, transformBffItemToValuedItem, type ValuedWatchlistItem } from "../useValuedPortfolio";
import type { ValuationResult } from "../calculations";

const dummyValuation: ValuationResult = {
  ticker: "TEST",
  activeCeiling: 10,
  margin: 0,
  fuenteConsensus: null,
  methods: { bazin: null, graham: null, gordon: null, lynch: null },
  assumptions: [],
  investorProfile: "moderate",
  bazin: null,
  graham: null,
  gordon: null,
  lynch: null,
  gordonConfidence: null,
  consensus: null,
  dividendYield: 0.08,
  positive: false,
  isUnavailable: false,
  yieldTrapWarning: null,
  shareholderYield: null,
};

function createItem(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  return {
    id: "item-1",
    ticker: "TEST3",
    name: "Test Asset",
    type: "STOCK_BR",
    currency: "BRL",
    quantity: 100,
    averagePrice: 20,
    currentPrice: 35,
    livePrice: 35,
    annualDividend: 2,
    targetYield: 0.06,
    targetMonthlyIncome: null,
    customTaxRate: null,
    addedAt: Date.now(),
    investingSince: Date.now(),
    sector: "Finance",
    ceilingPrice: 33.33,
    safetyMargin: -4.76,
    paymentMonths: [],
    payoutRatio: null,
    valuation: dummyValuation,
    isClosedPosition: false,
    isBffMode: true,
    ...overrides,
  };
}

describe("computeTotals - consolidatedInvested vs consolidatedNetWorth", () => {
  it("calculates consolidatedInvested using averagePrice * quantity (cost basis) and consolidatedNetWorth using currentPrice * quantity (market value)", () => {
    // 100 shares bought at R$ 20 (invested: 2000), now trading at R$ 35 (market: 3500)
    const items = [createItem({ averagePrice: 20, currentPrice: 35, quantity: 100 })];

    const totals = computeTotals(items, { USDBRL: 5.5 }, undefined);

    expect(totals.consolidatedInvested).toBe(2000);
    expect(totals.consolidatedNetWorth).toBe(3500);
    expect(totals.brlInvested).toBe(2000);
    expect(totals.brlWorth).toBe(3500);
    expect(totals.consolidatedInvested).not.toBe(totals.consolidatedNetWorth);
  });

  it("converts USD invested cost basis and market value using the exchange rate", () => {
    // 10 shares of AAPL bought at US$ 100 (invested: US$ 1000), now trading at US$ 150 (market: US$ 1500)
    const items = [
      createItem({
        ticker: "AAPL",
        type: "STOCK_US",
        currency: "USD",
        averagePrice: 100,
        currentPrice: 150,
        quantity: 10,
      }),
    ];

    const totals = computeTotals(items, { USDBRL: 5.0 }, undefined);

    expect(totals.usdInvested).toBe(1000);
    expect(totals.usdWorth).toBe(1500);
    // Consolidated in BRL at FX rate 5.0:
    expect(totals.consolidatedInvested).toBe(5000);
    expect(totals.consolidatedNetWorth).toBe(7500);
  });

  it("handles mixed BRL and USD portfolio correctly", () => {
    const items = [
      createItem({
        ticker: "PETR4",
        currency: "BRL",
        averagePrice: 30,
        currentPrice: 40,
        quantity: 100, // Invested: 3000 BRL, Worth: 4000 BRL
      }),
      createItem({
        ticker: "KO",
        currency: "USD",
        averagePrice: 50,
        currentPrice: 60,
        quantity: 20, // Invested: 1000 USD, Worth: 1200 USD
      }),
    ];

    const totals = computeTotals(items, { USDBRL: 5.0 }, undefined);

    expect(totals.brlInvested).toBe(3000);
    expect(totals.usdInvested).toBe(1000);
    expect(totals.consolidatedInvested).toBe(3000 + 1000 * 5.0); // 8000
    expect(totals.consolidatedNetWorth).toBe(4000 + 1200 * 5.0); // 10000
  });

  it("defensively handles null, undefined, 0, or NaN in averagePrice without producing NaN", () => {
    const items = [
      createItem({ averagePrice: null, quantity: 100 }),
      createItem({ averagePrice: undefined as unknown as number, quantity: 50 }),
      createItem({ averagePrice: 0, quantity: 20 }),
      createItem({ averagePrice: NaN, quantity: 10 }),
    ];

    const totals = computeTotals(items, { USDBRL: 5.0 }, undefined);

    expect(Number.isFinite(totals.consolidatedInvested)).toBe(true);
    expect(totals.consolidatedInvested).toBe(0);
    expect(totals.brlInvested).toBe(0);
  });

  it("skips closed positions (isClosedPosition: true) from both invested and net worth", () => {
    const items = [
      createItem({
        ticker: "VALE3",
        averagePrice: 60,
        currentPrice: 70,
        quantity: 0,
        isClosedPosition: true,
      }),
      createItem({
        ticker: "ITUB4",
        averagePrice: 25,
        currentPrice: 35,
        quantity: 100,
        isClosedPosition: false,
      }),
    ];

    const totals = computeTotals(items, { USDBRL: 5.0 }, undefined);

    expect(totals.consolidatedInvested).toBe(2500);
    expect(totals.consolidatedNetWorth).toBe(3500);
  });
});

describe("transformBffItemToValuedItem — yieldTrapWarning propagation (Item 8)", () => {
  it("propagates null when yieldTrapWarning is undefined or missing from BFF response (never false)", () => {
    const rawBffItem = {
      ticker: "TAEE11",
      activeCeiling: 40,
      margin: 15,
      currentPrice: 35,
      quantity: 100,
    };

    const transformed = transformBffItemToValuedItem(rawBffItem);
    expect(transformed.valuation.yieldTrapWarning).toBeNull();
    expect(transformed.valuation.yieldTrapWarning).not.toBe(false);
  });

  it("propagates null when yieldTrapWarning is explicitly null in BFF response (indeterminate)", () => {
    const rawBffItem = {
      ticker: "NEW3",
      activeCeiling: 20,
      margin: 5,
      currentPrice: 19,
      quantity: 50,
      yieldTrapWarning: null,
    };

    const transformed = transformBffItemToValuedItem(rawBffItem);
    expect(transformed.valuation.yieldTrapWarning).toBeNull();
  });

  it("propagates true when yieldTrapWarning is true in BFF response", () => {
    const rawBffItem = {
      ticker: "TRAP3",
      activeCeiling: 10,
      margin: -20,
      currentPrice: 12,
      quantity: 50,
      yieldTrapWarning: true,
    };

    const transformed = transformBffItemToValuedItem(rawBffItem);
    expect(transformed.valuation.yieldTrapWarning).toBe(true);
  });

  it("propagates false when yieldTrapWarning is explicitly false in BFF response", () => {
    const rawBffItem = {
      ticker: "SAFE3",
      activeCeiling: 30,
      margin: 20,
      currentPrice: 25,
      quantity: 50,
      yieldTrapWarning: false,
    };

    const transformed = transformBffItemToValuedItem(rawBffItem);
    expect(transformed.valuation.yieldTrapWarning).toBe(false);
  });
});
