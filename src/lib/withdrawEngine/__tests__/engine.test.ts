import { describe, it, expect } from "vitest";
import { runWithdraw } from "../engine";
import { minimizeTaxStrategy } from "../strategies/minimizeTax";
import { minimizeIncomeLossStrategy } from "../strategies/minimizeIncomeLoss";
import { sellOverpricedStrategy } from "../strategies/sellOverpriced";
import type { WithdrawStrategyContext, WithdrawTaxState } from "../types";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

function createMockPosition(overrides: Partial<ValuedWatchlistItem>): ValuedWatchlistItem {
  const base: ValuedWatchlistItem = {
    id: "item-1",
    ticker: "BBAS3",
    name: "Banco do Brasil",
    type: "STOCK_BR",
    currency: "BRL",
    currentPrice: 28.5,
    livePrice: 28.5,
    annualDividend: 2.5,
    targetYield: 6,
    ceilingPrice: 41.67,
    safetyMargin: 46.2,
    quantity: 100,
    averagePrice: 25.0,
    paymentMonths: [3, 6, 9, 12],
    payoutRatio: 40,
    sector: "Financeiro",
    addedAt: 1700000000000,
    investingSince: 1700000000000,
    isClosedPosition: false,
    isBffMode: true,
    valuation: {
      ticker: "BBAS3",
      activeCeiling: 41.67,
      margin: 46.2,
      fuenteConsensus: 41.67,
      methods: { bazin: 41.67, graham: 45.0, gordon: 40.0 },
      assumptions: [],
      investorProfile: "moderate",
      bazin: 41.67,
      graham: 45.0,
      gordon: 40.0,
      gordonConfidence: "high",
      consensus: 41.67,
      dividendYield: 8.77,
      positive: true,
      isUnavailable: false,
      yieldTrapWarning: false,
      shareholderYield: null,
    },
  };
  return { ...base, ...overrides, valuation: { ...base.valuation, ...(overrides.valuation || {}) } };
}

function emptyTaxState(overrides: Partial<WithdrawTaxState> = {}): WithdrawTaxState {
  return {
    realizedGainEvents: [],
    assetTypeByTicker: new Map(),
    currencyByTicker: new Map(),
    fxRate: 5,
    ...overrides,
  };
}

describe("WithdrawEngine: runWithdraw", () => {
  it("returns no_eligible_assets when there are no positions", () => {
    const ctx: WithdrawStrategyContext = {
      eligiblePositions: [],
      neededAmountBRL: 1000,
      taxState: emptyTaxState(),
      asOf: "2026-08-20T12:00:00Z",
    };
    const result = runWithdraw(ctx, minimizeTaxStrategy);
    expect(result.state).toBe("no_eligible_assets");
  });

  it("sells exactly enough shares to reach the needed amount, respecting owned quantity", () => {
    const pos = createMockPosition({ ticker: "BBAS3", quantity: 1000, livePrice: 30, averagePrice: 25 });
    const ctx: WithdrawStrategyContext = {
      eligiblePositions: [pos],
      neededAmountBRL: 3000,
      taxState: emptyTaxState({
        assetTypeByTicker: new Map([["BBAS3", "STOCK_BR"]]),
        currencyByTicker: new Map([["BBAS3", "BRL"]]),
      }),
      asOf: "2026-08-20T12:00:00Z",
    };
    const result = runWithdraw(ctx, minimizeTaxStrategy);
    expect(result.state).toBe("success");
    expect(result.allocations).toHaveLength(1);
    // ceil(3000 / 30) = 100 shares, capped by owned 1000 -> 100
    expect(result.allocations[0].quantity).toBe(100);
    expect(result.leftoverBRL).toBe(0);
    // 100 shares * R$30 = R$3,000 in proceeds this month, within the R$20k exemption -> no tax.
    expect(result.totalTaxBRL).toBe(0);
  });

  it("reports insufficient_position when total owned value can't cover the need", () => {
    const pos = createMockPosition({ ticker: "BBAS3", quantity: 10, livePrice: 30 });
    const ctx: WithdrawStrategyContext = {
      eligiblePositions: [pos],
      neededAmountBRL: 10000,
      taxState: emptyTaxState({
        assetTypeByTicker: new Map([["BBAS3", "STOCK_BR"]]),
        currencyByTicker: new Map([["BBAS3", "BRL"]]),
      }),
      asOf: "2026-08-20T12:00:00Z",
    };
    const result = runWithdraw(ctx, minimizeTaxStrategy);
    expect(result.state).toBe("insufficient_position");
    expect(result.allocations[0].quantity).toBe(10);
    expect(result.leftoverBRL).toBeGreaterThan(0);
  });

  it("minimizeIncomeLossStrategy sells the lowest dividend-yield-on-cost position first", () => {
    const lowYield = createMockPosition({
      ticker: "LOWY3",
      quantity: 1000,
      livePrice: 20,
      averagePrice: 20,
      annualDividend: 0.4, // 2% on cost
    });
    const highYield = createMockPosition({
      ticker: "HIGHY3",
      quantity: 1000,
      livePrice: 20,
      averagePrice: 20,
      annualDividend: 2.0, // 10% on cost
    });
    const ctx: WithdrawStrategyContext = {
      eligiblePositions: [highYield, lowYield],
      neededAmountBRL: 5000,
      taxState: emptyTaxState({
        assetTypeByTicker: new Map([
          ["LOWY3", "STOCK_BR"],
          ["HIGHY3", "STOCK_BR"],
        ]),
        currencyByTicker: new Map([
          ["LOWY3", "BRL"],
          ["HIGHY3", "BRL"],
        ]),
      }),
      asOf: "2026-08-20T12:00:00Z",
    };
    const result = runWithdraw(ctx, minimizeIncomeLossStrategy);
    expect(result.allocations[0].ticker).toBe("LOWY3");
  });

  it("sellOverpricedStrategy sells the position furthest above its ceiling first", () => {
    const cheap = createMockPosition({
      ticker: "CHEAP3",
      quantity: 1000,
      livePrice: 20,
      valuation: { margin: 30 } as any,
    });
    const expensive = createMockPosition({
      ticker: "EXP3",
      quantity: 1000,
      livePrice: 20,
      valuation: { margin: -15 } as any,
    });
    const ctx: WithdrawStrategyContext = {
      eligiblePositions: [cheap, expensive],
      neededAmountBRL: 5000,
      taxState: emptyTaxState({
        assetTypeByTicker: new Map([
          ["CHEAP3", "STOCK_BR"],
          ["EXP3", "STOCK_BR"],
        ]),
        currencyByTicker: new Map([
          ["CHEAP3", "BRL"],
          ["EXP3", "BRL"],
        ]),
      }),
      asOf: "2026-08-20T12:00:00Z",
    };
    const result = runWithdraw(ctx, sellOverpricedStrategy);
    expect(result.allocations[0].ticker).toBe("EXP3");
  });

  it("converts a USD (foreign) position's proceeds to BRL when capping against neededAmountBRL", () => {
    const pos = createMockPosition({
      ticker: "O",
      type: "REIT",
      currency: "USD",
      quantity: 1000,
      livePrice: 60,
      averagePrice: 50,
    });
    const ctx: WithdrawStrategyContext = {
      eligiblePositions: [pos],
      neededAmountBRL: 3000, // BRL 3,000 / (60 * fx 5 = 300 BRL/share) = 10 shares
      taxState: emptyTaxState({
        assetTypeByTicker: new Map([["O", "REIT"]]),
        currencyByTicker: new Map([["O", "USD"]]),
      }),
      asOf: "2026-08-20T12:00:00Z",
    };
    const result = runWithdraw(ctx, minimizeTaxStrategy);
    expect(result.allocations[0].quantity).toBe(10);
    expect(result.leftoverBRL).toBe(0);
  });
});
