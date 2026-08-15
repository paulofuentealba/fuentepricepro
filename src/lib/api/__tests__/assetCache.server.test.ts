import { describe, it, expect, beforeEach } from "vitest";
import {
  ASSET_CACHE_TTL_MS,
  getAssetFromMemoryCache,
  saveAssetToMemoryCache,
  clearAssetMemoryCache,
  getCachedAsset,
  setCachedAsset,
} from "../assetCache.server";
import type { ApiAsset } from "../types";

const mockAsset: ApiAsset = {
  ticker: "PETR4",
  name: "Petróleo Brasileiro S.A. - Petrobras",
  currentPrice: 38.5,
  dividends3y: [4.2, 5.8, 3.9],
  dividendHistory: [
    { year: 2025, amount: 4.2 },
    { year: 2024, amount: 5.8 },
    { year: 2023, amount: 3.9 },
  ],
  exDividendDate: null,
  epsCurrent: 6.2,
  epsNext: 6.5,
  paymentMonths: [5, 8, 11],
  metrics: {
    peRatio: 5.2,
    pbRatio: 1.1,
    eps: 6.2,
    roe: 22.5,
    currentDy: 12.8,
    capRate: null,
    vacancy: null,
    expenseRatio: null,
    aum: null,
    trackingError: null,
    payoutRatio: 45,
    dividendCagr5y: 8.5,
  },
  type: "STOCK_BR",
  currency: "BRL",
  sector: "Energy",
  dividendEvents: [],
};

describe("assetCache.server", () => {
  beforeEach(() => {
    clearAssetMemoryCache();
  });

  it("should have a named constant TTL of 5 minutes (300,000 ms)", () => {
    expect(ASSET_CACHE_TTL_MS).toBe(300_000);
  });

  it("should save and retrieve asset from memory cache when fresh", () => {
    const now = 1_000_000;
    saveAssetToMemoryCache("PETR4", mockAsset, now);

    const retrieved = getAssetFromMemoryCache("PETR4", now + 10_000);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.ticker).toBe("PETR4");
    expect(retrieved?.currentPrice).toBe(38.5);
  });

  it("should normalize tickers (case insensitive and trimmed)", () => {
    const now = 1_000_000;
    saveAssetToMemoryCache("  petr4  ", mockAsset, now);

    const retrieved = getAssetFromMemoryCache("PETR4", now);
    expect(retrieved?.ticker).toBe("PETR4");
  });

  it("should return null and evict entry when TTL has expired", () => {
    const now = 1_000_000;
    saveAssetToMemoryCache("PETR4", mockAsset, now);

    // After TTL (300,000 ms + 1 ms)
    const expired = getAssetFromMemoryCache("PETR4", now + ASSET_CACHE_TTL_MS + 1);
    expect(expired).toBeNull();

    // Verify it was evicted
    expect(getAssetFromMemoryCache("PETR4", now + 100)).toBeNull();
  });

  it("should work smoothly with getCachedAsset and setCachedAsset async helpers", async () => {
    await setCachedAsset("VALE3", { ...mockAsset, ticker: "VALE3" });

    const cached = await getCachedAsset("VALE3");
    expect(cached?.ticker).toBe("VALE3");

    const missing = await getCachedAsset("NONEXISTENT");
    expect(missing).toBeNull();
  });
});
