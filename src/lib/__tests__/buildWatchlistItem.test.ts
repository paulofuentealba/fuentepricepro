import { describe, it, expect } from "vitest";
import { buildWatchlistItem } from "../buildWatchlistItem";
import { makeId } from "../watchlist";
import type { Asset } from "../domain";

function makeMockAsset(ticker: string, type: Asset["type"], currency: Asset["currency"] = "BRL"): Asset {
  return {
    ticker,
    name: `${ticker} Test Asset`,
    type,
    currency,
    currentPrice: 100,
    dividends3y: [5, 6, 7],
    dividendHistory: [],
    exDividendDate: "2025-01-01",
    epsCurrent: 10,
    epsNext: 12,
    paymentMonths: [1, 6],
    sector: "Financials",
    dividendEvents: [],
    metrics: {
      peRatio: 10,
      pbRatio: 1.5,
      eps: 10,
      bvps: 50,
      roe: 15,
      currentDy: 6,
      capRate: null,
      vacancy: null,
      expenseRatio: null,
      aum: null,
      trackingError: null,
      payoutRatio: 50,
      dividendCagr5y: 5,
    },
  };
}

describe("buildWatchlistItem", () => {
  it("generates an ID strictly matching makeId for STOCK_BR", () => {
    const asset = makeMockAsset("PETR4", "STOCK_BR", "BRL");
    const item = buildWatchlistItem(asset, { targetYield: 6, quantity: 100 });

    expect(item.id).toBe(makeId("PETR4", "STOCK_BR"));
    expect(item.id).toBe("STOCK_BR:PETR4");
  });

  it("generates an ID strictly matching makeId for FII", () => {
    const asset = makeMockAsset("KNCR11", "FII", "BRL");
    const item = buildWatchlistItem(asset, { targetYield: 10, quantity: 50 });

    expect(item.id).toBe(makeId("KNCR11", "FII"));
    expect(item.id).toBe("FII:KNCR11");
  });

  it("generates an ID strictly matching makeId for STOCK_US and REIT", () => {
    const stockUs = makeMockAsset("AAPL", "STOCK_US", "USD");
    const itemStockUs = buildWatchlistItem(stockUs, { targetYield: 3, quantity: 10 });
    expect(itemStockUs.id).toBe(makeId("AAPL", "STOCK_US"));
    expect(itemStockUs.id).toBe("STOCK_US:AAPL");

    const reit = makeMockAsset("O", "REIT", "USD");
    const itemReit = buildWatchlistItem(reit, { targetYield: 5, quantity: 20 });
    expect(itemReit.id).toBe(makeId("O", "REIT"));
    expect(itemReit.id).toBe("REIT:O");
  });

  it("generates an ID strictly matching makeId for ETF, FII_INFRA, and FIAGRO", () => {
    const etf = makeMockAsset("IVVB11", "ETF", "BRL");
    expect(buildWatchlistItem(etf, { targetYield: 4, quantity: 15 }).id).toBe("ETF:IVVB11");

    const fiiInfra = makeMockAsset("JURO11", "FII_INFRA", "BRL");
    expect(buildWatchlistItem(fiiInfra, { targetYield: 11, quantity: 30 }).id).toBe("FII_INFRA:JURO11");

    const fiagro = makeMockAsset("VGIA11", "FIAGRO", "BRL");
    expect(buildWatchlistItem(fiagro, { targetYield: 12, quantity: 40 }).id).toBe("FIAGRO:VGIA11");
  });

  it("normalizes lowercase ticker input in makeId", () => {
    const asset = makeMockAsset("petr4", "STOCK_BR", "BRL");
    const item = buildWatchlistItem(asset, { targetYield: 6, quantity: 100 });

    expect(item.id).toBe("STOCK_BR:PETR4");
  });
});
