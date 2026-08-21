import { describe, it, expect } from "vitest";
import type { WatchlistItem } from "../watchlist";
import {
  avgDividend,
  ceilingPrice,
  safetyMargin,
  netAfterTax,
  dividendTaxRate,
  isUsAsset,
  getAssetValuation,
  calculateBvps,
  gordonPrice,
  calculateHistoricalYieldAverage,
  isYieldTrap,
  calculateShareholderYield,
  calculateFixedIncomeBalance,
  getPositionValue,
  projectFixedIncomeValueAtMaturity,
  GORDON_MIN_DISCOUNT_MARGIN,
  GORDON_TERMINAL_GROWTH_RATE,
} from "../calculations";
import type { BenchmarkPoint } from "../benchmark";

describe("Bazin ceiling price math", () => {
  it("averages dividends", () => {
    expect(avgDividend([1, 2, 3])).toBe(2);
    expect(avgDividend([])).toBe(0);
  });

  it("computes ceiling price with target yield", () => {
    // Bazin: avgDiv / (targetYield%)
    expect(ceilingPrice(2, 6)).toBeCloseTo(33.333, 2);
    expect(ceilingPrice(0, 6)).toBe(0);
  });

  it("returns 0 ceiling when target yield is 0", () => {
    expect(ceilingPrice(5, 0)).toBe(0);
  });

  it("computes safety margin", () => {
    // ceiling above current = positive margin
    expect(safetyMargin(120, 100)).toBe(20);
    expect(safetyMargin(80, 100)).toBe(-20);
    expect(safetyMargin(100, 0)).toBe(0);
  });

  it("applies US withholding to USD dividends only", () => {
    expect(isUsAsset("STOCK_US", "USD")).toBe(true);
    expect(isUsAsset("STOCK_BR", "BRL")).toBe(false);
    expect(dividendTaxRate("REIT", "USD")).toBe(0.3);
    expect(dividendTaxRate("STOCK_BR", "BRL")).toBe(0);
    expect(netAfterTax(100, "REIT", "USD")).toBeCloseTo(70);
    expect(netAfterTax(100, "STOCK_BR", "BRL")).toBe(100);
  });

  it("applies 15% withholding to JCP events", () => {
    expect(dividendTaxRate("STOCK_BR", "BRL", undefined, true)).toBe(0.15);
    expect(netAfterTax(100, "STOCK_BR", "BRL", undefined, true)).toBe(85);
  });
});

describe("getAssetValuation — Gordon Guard & Robust Consensus", () => {
  it("applies singularity guard to terminal growth rate (gTerminal=3%), avoiding explosion when gInitial is high", () => {
    // k = 0.105, gInitial = 0.103, gTerminal = 0.03 => k - gTerminal = 0.075 (>= 0.02)
    // 2-Stage Gordon returns 38.80 safely
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.4, // Bazin = 2.4 / 0.06 = 40
      dividendCagr: 10.3,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.gordon).not.toBeNull();
    expect(result.gordon!).toBeCloseTo(38.80, 1);
    expect(result.bazin).toBeCloseTo(40);
  });

  it("calculates 2-stage Gordon model when (k - gTerminal) >= GORDON_MIN_DISCOUNT_MARGIN (e.g. Selic 10.5%, CAGR 5.0%)", () => {
    // k = 0.105, gInitial = 0.05, gTerminal = 0.03 => k - gTerminal = 0.075 (>= 0.02)
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.4,
      dividendCagr: 5.0,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    // 2-stage Gordon = 32.96 + 1.60 = 34.56
    expect(result.gordon).not.toBeNull();
    expect(result.gordon!).toBeCloseTo(34.56, 1);
  });

  it("uses median consensus to prevent single outlier from distorting active ceiling", () => {
    // bazin = 40, graham = 30, gordon = 33.96 => sorted [30, 33.96, 40] => median = 33.96
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.4,
      eps: 2,
      bvps: 20, // Graham = sqrt(22.5 * 2 * 20) = sqrt(900) = 30
      dividendCagr: 4.25, // 2-stage Gordon = 33.96
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.bazin).toBeCloseTo(40);
    expect(result.graham).toBeCloseTo(30);
    expect(result.gordon).toBeCloseTo(33.96, 1);
    // Median of [30, 33.96, 40] is 33.96
    expect(result.consensus).toBeCloseTo(33.96, 1);
    expect(result.activeCeiling).toBeCloseTo(33.96, 1);
  });

  it("verifies VALE3 @ 6% target yield has matching activeCeiling and consensus", () => {
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 62.0,
      avgDividend: 2.954,
      eps: 2.66,
      bvps: 42.56,
      dividendCagr: 5.0,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.consensus).not.toBeNull();
    expect(result.activeCeiling).toBe(result.consensus);
    expect(result.activeCeiling).toBeGreaterThan(0);
    expect(result.isUnavailable).toBe(false);
  });

  it("returns isUnavailable: true when asset has no dividend history", () => {
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 50.0,
      avgDividend: 0,
      eps: null,
      bvps: null,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(result.isUnavailable).toBe(true);
    expect(result.consensus).toBeNull();
    expect(result.bazin).toBeNull();
  });
});

describe("2-Stage Gordon Growth (H-Model) & Volatility Confidence Tests", () => {
  it("KNCR11 Regression: Singularity guard prevents singularity explosion when terminal spread (k - gTerminal) < 0.02", () => {
    // k = 0.04, gTerminal = 0.03 => k - gTerminal = 0.01 (< 0.02)
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 100,
      avgDividend: 10,
      dividendCagr: 15.0,
      selicPct: 4.0, // Low discount rate k = 4.0%
      currency: "BRL",
      type: "FII",
    });

    expect(result.gordon).toBeNull();
  });

  it("calculates gordonConfidence: 'high' for regular growth and 'low' for volatile growth", () => {
    // Regular growth: 10%, 11%, 12% YoY -> low volatility
    const regularResult = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.0,
      dividendCagr: 8.0,
      dividendHistory: [
        { year: 2021, amount: 1.0 },
        { year: 2022, amount: 1.1 },
        { year: 2023, amount: 1.21 },
        { year: 2024, amount: 1.33 },
      ],
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(regularResult.gordon).not.toBeNull();
    expect(regularResult.gordonConfidence).toBe("high");

    // Volatile growth: +150%, -60%, +200% YoY -> high volatility
    const volatileResult = getAssetValuation({
      targetYield: 6,
      currentPrice: 40,
      avgDividend: 2.0,
      dividendCagr: 8.0,
      dividendHistory: [
        { year: 2021, amount: 1.0 },
        { year: 2022, amount: 2.5 },
        { year: 2023, amount: 1.0 },
        { year: 2024, amount: 3.0 },
      ],
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(volatileResult.gordon).not.toBeNull();
    expect(volatileResult.gordonConfidence).toBe("low");
  });

  it("Fallback test: asset without dividendCagr falls back to single-stage Gordon (g = 0)", () => {
    // dividendCagr is null -> single stage fallback avgDividend / k = 2.0 / 0.105 = 19.047
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 20,
      avgDividend: 2.0,
      dividendCagr: null,
      selicPct: 10.5,
      currency: "BRL",
      type: "FII",
    });

    expect(result.gordon).not.toBeNull();
    expect(result.gordon!).toBeCloseTo(19.05, 1);
  });
});

describe("terminalGrowthRate threading (IPCA médio de 5 anos dinâmico)", () => {
  const base = {
    targetYield: 6,
    currentPrice: 100,
    avgDividend: 10,
    dividendCagr: 8.0,
    selicPct: 10.5,
    currency: "BRL" as const,
    type: "STOCK_BR" as const,
  };

  it("gordonPrice uses the provided terminal growth rate instead of the constant", () => {
    const k = 0.105;
    const gInitial = 0.08;
    const withConstant = gordonPrice(10, k, gInitial, GORDON_TERMINAL_GROWTH_RATE);
    const withCustomRate = gordonPrice(10, k, gInitial, 0.045); // e.g. IPCA médio ~4.5%

    expect(withCustomRate).not.toBeNull();
    expect(withConstant).not.toBeNull();
    expect(withCustomRate).not.toBeCloseTo(withConstant!, 4);
  });

  it("getAssetValuation forwards terminalGrowthRate to gordonPrice when provided", () => {
    const withIpca = getAssetValuation({ ...base, terminalGrowthRate: 0.045 });
    const withConstant = getAssetValuation({ ...base, terminalGrowthRate: GORDON_TERMINAL_GROWTH_RATE });

    expect(withIpca.gordon).not.toBeNull();
    expect(withConstant.gordon).not.toBeNull();
    expect(withIpca.gordon).not.toBeCloseTo(withConstant.gordon!, 4);
  });

  it("getAssetValuation falls back to GORDON_TERMINAL_GROWTH_RATE when terminalGrowthRate is omitted", () => {
    const omitted = getAssetValuation({ ...base });
    const explicitConstant = getAssetValuation({ ...base, terminalGrowthRate: GORDON_TERMINAL_GROWTH_RATE });

    expect(omitted.gordon).toBeCloseTo(explicitConstant.gordon!, 8);
  });
});

describe("calculateBvps SSOT & convergence", () => {
  it("prioritizes direct bvps over pbRatio recalculated value when direct bvps exists and diverges", () => {
    // Direct bvps = 15.0, currentPrice = 100, pbRatio = 2.0 (100 / 2 = 50.0)
    // Direct bvps (15.0) must prevail, NOT the 50.0 recalculated value
    const directBvps = 15.0;
    const pbRatio = 2.0;
    const currentPrice = 100;

    const result = calculateBvps(directBvps, pbRatio, currentPrice);
    expect(result).toBe(15.0);

    // Verify Graham model in getAssetValuation uses 15.0 (Graham = sqrt(22.5 * 2 * 15) = 25.98), NOT 47.43 (from 50.0)
    const valuation = getAssetValuation({
      targetYield: 6,
      currentPrice: 100,
      avgDividend: 2,
      eps: 2,
      bvps: result,
      selicPct: 10.5,
      currency: "BRL",
      type: "STOCK_BR",
    });

    expect(valuation.graham).toBeCloseTo(25.98, 2);
  });

  it("falls back to currentPrice / pbRatio when direct bvps is null or 0", () => {
    expect(calculateBvps(null, 2.0, 100)).toBe(50);
    expect(calculateBvps(0, 2.0, 100)).toBe(50);
    expect(calculateBvps(undefined, 2.5, 50)).toBe(20);
  });

  it("returns null when neither direct bvps nor valid pbRatio/currentPrice are available", () => {
    expect(calculateBvps(null, null, 100)).toBeNull();
    expect(calculateBvps(null, 2.0, 0)).toBeNull();
  });

  it("guarantees useValuedPortfolio and AssetCard receive identical bvps for identical asset metrics", () => {
    const assetMeta = { bvps: 18.5, pbRatio: 1.5 };
    const currentPrice = 30;

    const bvpsForValuedPortfolio = calculateBvps(assetMeta.bvps, assetMeta.pbRatio, currentPrice);
    const bvpsForAssetCard = calculateBvps(assetMeta.bvps, assetMeta.pbRatio, currentPrice);

    expect(bvpsForValuedPortfolio).toBe(bvpsForAssetCard);
    expect(bvpsForValuedPortfolio).toBe(18.5);
  });
});

describe("Yield-Trap Check + Shareholder Yield (prompt 79)", () => {
  it("calculateHistoricalYieldAverage: reconstructs yearly closing price from cumulative-return points and averages 5 years of yield correctly", () => {
    // Synthetic 10%/year price growth from a basePrice of 100:
    // 2020: 100, 2021: 110, 2022: 121, 2023: 133.1, 2024: 146.41 (= currentPrice)
    const priceHistory: BenchmarkPoint[] = [
      { date: "2020-12-31", cumulativeReturnPct: 0 },
      { date: "2021-12-31", cumulativeReturnPct: 10 },
      { date: "2022-12-31", cumulativeReturnPct: 21 },
      { date: "2023-12-31", cumulativeReturnPct: 33.1 },
      { date: "2024-12-31", cumulativeReturnPct: 46.41 },
    ];
    const dividendHistory = [
      { year: 2020, amount: 5 },
      { year: 2021, amount: 5 },
      { year: 2022, amount: 5 },
      { year: 2023, amount: 5 },
      { year: 2024, amount: 5 },
    ];
    const currentPrice = 146.41;

    const result = calculateHistoricalYieldAverage(dividendHistory, priceHistory, currentPrice);

    // yields (%): 5/100, 5/110, 5/121, 5/133.1, 5/146.41 -> avg ~= 4.1699%
    expect(result).not.toBeNull();
    expect(result).toBeCloseTo(4.1699, 2);
  });

  it("calculateHistoricalYieldAverage returns null with fewer than 3 years of valid overlapping data", () => {
    const priceHistory: BenchmarkPoint[] = [
      { date: "2023-12-31", cumulativeReturnPct: 0 },
      { date: "2024-12-31", cumulativeReturnPct: 10 },
    ];
    const dividendHistory = [
      { year: 2023, amount: 5 },
      { year: 2024, amount: 5 },
    ];
    expect(calculateHistoricalYieldAverage(dividendHistory, priceHistory, 110)).toBeNull();
    expect(calculateHistoricalYieldAverage(undefined, priceHistory, 110)).toBeNull();
    expect(calculateHistoricalYieldAverage(dividendHistory, undefined, 110)).toBeNull();
  });

  it("isYieldTrap: flags true when current yield is 2.5x the historical average", () => {
    expect(isYieldTrap(10, 4)).toBe(true); // 10 > 4*2
  });

  it("isYieldTrap: returns false when current yield is only 1.2x the historical average", () => {
    expect(isYieldTrap(4.8, 4)).toBe(false); // 4.8 <= 4*2
  });

  it("isYieldTrap: returns null (indeterminate) when historical average is unavailable, never a default false", () => {
    expect(isYieldTrap(10, null)).toBeNull();
    expect(isYieldTrap(10, undefined)).toBeNull();
  });

  it("calculateShareholderYield: positive net buyback (shares outstanding decreased) contributes positively", () => {
    const result = calculateShareholderYield({
      dividendsPaidTotal: 1_000_000,
      sharesOutstandingCurrent: 950_000,
      sharesOutstandingPrior: 1_000_000, // 50,000 shares bought back
      pricePerShare: 20,
      marketCap: 19_000_000,
    });
    // netBuyback = (1,000,000 - 950,000) * 20 = 1,000,000
    // shareholderYield (%) = ((1,000,000 + 1,000,000) / 19,000,000) * 100 = 10.526316%
    expect(result).toBeCloseTo((2_000_000 / 19_000_000) * 100, 4);
    expect(result).toBeGreaterThan(0);
  });

  it("calculateShareholderYield: net share issuance (shares outstanding increased) contributes negatively", () => {
    const result = calculateShareholderYield({
      dividendsPaidTotal: 1_000_000,
      sharesOutstandingCurrent: 1_100_000,
      sharesOutstandingPrior: 1_000_000, // 100,000 new shares issued
      pricePerShare: 20,
      marketCap: 22_000_000,
    });
    // netBuyback = (1,000,000 - 1,100,000) * 20 = -2,000,000
    // shareholderYield (%) = ((1,000,000 - 2,000,000) / 22,000,000) * 100 = -4.545455%
    expect(result).toBeCloseTo((-1_000_000 / 22_000_000) * 100, 4);
    expect(result).toBeLessThan(0);
  });

  it("calculateShareholderYield returns null (not 0) when required data is missing", () => {
    expect(
      calculateShareholderYield({
        dividendsPaidTotal: null,
        sharesOutstandingCurrent: 100,
        sharesOutstandingPrior: 100,
        pricePerShare: 10,
        marketCap: 1000,
      }),
    ).toBeNull();
    expect(
      calculateShareholderYield({
        dividendsPaidTotal: 100,
        sharesOutstandingCurrent: 100,
        sharesOutstandingPrior: 100,
        pricePerShare: 10,
        marketCap: 0,
      }),
    ).toBeNull();
  });

  it("getAssetValuation: yieldTrapWarning is null when historicalYieldAverage is not supplied, never a default false", () => {
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 100,
      avgDividend: 10,
      currency: "BRL",
      type: "STOCK_BR",
    });
    expect(result.yieldTrapWarning).toBeNull();
    expect(result.shareholderYield).toBeNull();
  });

  it("getAssetValuation: yieldTrapWarning is true when dividendYield is more than 2x historicalYieldAverage", () => {
    const result = getAssetValuation({
      targetYield: 6,
      currentPrice: 100,
      avgDividend: 20, // dividendYield = 20%
      currency: "BRL",
      type: "STOCK_BR",
      historicalYieldAverage: 8, // 20% > 8%*2 = 16%
    });
    expect(result.yieldTrapWarning).toBe(true);
  });

  it("getAssetValuation: FIXED_INCOME and unavailable-data branches also return yieldTrapWarning/shareholderYield as null", () => {
    const fi = getAssetValuation({
      targetYield: 6,
      currentPrice: 100,
      avgDividend: 10,
      currency: "BRL",
      type: "FIXED_INCOME",
    });
    expect(fi.yieldTrapWarning).toBeNull();
    expect(fi.shareholderYield).toBeNull();

    const unavailable = getAssetValuation({
      targetYield: 6,
      currentPrice: 0,
      avgDividend: 10,
      currency: "BRL",
      type: "STOCK_BR",
    });
    expect(unavailable.yieldTrapWarning).toBeNull();
    expect(unavailable.shareholderYield).toBeNull();
  });
});

describe("Fixed Income calculation resilience & NaN immunity (Item 1)", () => {
  const mockMacroRates = { cdi: 10.5, ipca: 4.5 };

  function makeMockItem(overrides: Partial<WatchlistItem>): WatchlistItem {
    return {
      id: "test-id",
      ticker: "TEST",
      name: "Test Asset",
      type: "FIXED_INCOME",
      currency: "BRL",
      currentPrice: 100,
      averagePrice: 100,
      quantity: 10,
      targetYield: 6,
      ceilingPrice: 100,
      safetyMargin: 0,
      annualDividend: 0,
      paymentMonths: [],
      payoutRatio: null,
      addedAt: Date.now(),
      investingSince: Date.now(),
      ...overrides,
    };
  }

  it("calculates accurate accrued balance and profit for a valid CDI fixed income asset", () => {
    // 100 days ago, 100% CDI (= 10.5% a.a.), principal = 1000 * 10 = 10000
    const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const item = makeMockItem({
      ticker: "CDB_TEST",
      name: "CDB 100% CDI",
      type: "FIXED_INCOME",
      currency: "BRL",
      currentPrice: 10,
      averagePrice: 10,
      quantity: 1000,
      startDate: hundredDaysAgo,
      indexer: "CDI",
      rate: 100, // 100% of CDI
    });

    const result = calculateFixedIncomeBalance(item, mockMacroRates);
    expect(result).not.toBeNull();
    expect(result!.accruedBalance).toBeGreaterThan(10000);
    expect(result!.profit).toBeCloseTo(result!.accruedBalance - 10000, 4);
    expect(Number.isFinite(result!.accruedBalance)).toBe(true);
  });

  it("never propagates NaN when startDate is invalid or unparseable, returning principal and 0 profit", () => {
    const item = makeMockItem({
      ticker: "CDB_MALFORMED",
      name: "CDB Malformed Date",
      type: "FIXED_INCOME",
      currency: "BRL",
      currentPrice: 100,
      averagePrice: 100,
      quantity: 50, // principal = 5000
      startDate: "invalid-date-format",
      indexer: "CDI",
      rate: 100,
    });

    const result = calculateFixedIncomeBalance(item, mockMacroRates);
    expect(result).not.toBeNull();
    expect(result!.accruedBalance).toBe(5000);
    expect(result!.profit).toBe(0);
    expect(Number.isFinite(result!.accruedBalance)).toBe(true);
  });

  it("returns principal when startDate is in the future", () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const item = makeMockItem({
      ticker: "CDB_FUTURE",
      name: "CDB Future Start",
      type: "FIXED_INCOME",
      currency: "BRL",
      currentPrice: 50,
      averagePrice: 50,
      quantity: 20, // principal = 1000
      startDate: futureDate,
      indexer: "PRE",
      rate: 12,
    });

    const result = calculateFixedIncomeBalance(item, mockMacroRates);
    expect(result).not.toBeNull();
    expect(result!.accruedBalance).toBe(1000);
    expect(result!.profit).toBe(0);
  });

  it("getPositionValue never returns NaN for FIXED_INCOME with malformed startDate or missing rate", () => {
    const item = makeMockItem({
      ticker: "LCI_CORRUPT",
      name: "LCI Corrupt",
      type: "FIXED_INCOME",
      currency: "BRL",
      currentPrice: 1000,
      averagePrice: 1000,
      quantity: 10, // principal = 10000
      startDate: "not-a-date",
      indexer: "IPCA",
      rate: 6.0,
    });

    const value = getPositionValue(item, mockMacroRates);
    expect(value).toBe(10000);
    expect(Number.isFinite(value)).toBe(true);
    expect(isNaN(value)).toBe(false);
  });

  it("getPositionValue never returns NaN for non-FIXED_INCOME with null/undefined/NaN prices", () => {
    const item = makeMockItem({
      ticker: "PETR4",
      name: "Petrobras",
      type: "STOCK_BR",
      currency: "BRL",
      currentPrice: NaN,
      averagePrice: 30,
      quantity: 100,
      annualDividend: 3,
    });

    const value = getPositionValue(item);
    expect(value).toBe(0);
    expect(Number.isFinite(value)).toBe(true);
  });

  it("projectFixedIncomeValueAtMaturity returns principal safely on invalid or reversed dates without NaN", () => {
    const invalidStart = projectFixedIncomeValueAtMaturity(5000, "CDI", 100, "invalid-start", "2026-12-31", mockMacroRates);
    expect(invalidStart.projectedBalance).toBe(5000);
    expect(invalidStart.projectedProfit).toBe(0);
    expect(Number.isFinite(invalidStart.projectedBalance)).toBe(true);

    const reversedDates = projectFixedIncomeValueAtMaturity(5000, "PRE", 10, "2026-12-31", "2025-01-01", mockMacroRates);
    expect(reversedDates.projectedBalance).toBe(5000);
    expect(reversedDates.projectedProfit).toBe(0);

    const invalidPrincipal = projectFixedIncomeValueAtMaturity(NaN as any, "PRE", 10, "2024-01-01", "2026-01-01", mockMacroRates);
    expect(invalidPrincipal.projectedBalance).toBe(0);
    expect(invalidPrincipal.projectedProfit).toBe(0);
  });
});

