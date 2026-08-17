import { describe, it, expect, vi } from "vitest";
import {
  calculateDailyCompoundedReturn,
  calculatePriceCumulativeReturn,
  annualizeReturn,
  type DailyRatePoint,
  type PricePoint,
} from "../benchmark";
import {
  fetchBcbBenchmarkSeries,
  fetchYahooBenchmarkSeries,
} from "../benchmark.server";
import { fetchBenchmarkHistoryFn } from "../apiService.functions";

describe("Benchmark History Calculations (Shared Layer SSOT)", () => {
  it("should annualize cumulative returns correctly over a period of days", () => {
    // 10% cumulative return in 180 days -> (1 + 0.10)^(365/180) - 1 = ~21.323% a.a.
    const result180 = annualizeReturn(10, 180);
    expect(result180).toBeGreaterThan(10);
    expect(result180).toBeCloseTo(21.323, 2);

    // 10% cumulative return in 365 days -> 10% a.a.
    const result365 = annualizeReturn(10, 365);
    expect(result365).toBeCloseTo(10, 2);

    // Edge cases: days <= 0 or invalid return
    expect(annualizeReturn(10, 0)).toBe(0);
    expect(annualizeReturn(NaN, 100)).toBe(0);
  });
  it("should calculate compounded cumulative return from daily rates (3 days at 0.05% compounding)", () => {
    // Baseline + 3 days of 0.05% daily rate
    const dailyRates: DailyRatePoint[] = [
      { date: "2024-01-01", ratePct: 0.05 },
      { date: "2024-01-02", ratePct: 0.05 },
      { date: "2024-01-03", ratePct: 0.05 },
      { date: "2024-01-04", ratePct: 0.05 },
    ];

    const results = calculateDailyCompoundedReturn(dailyRates);

    expect(results).toHaveLength(4);

    // Day 0: Baseline date starts at 0%
    expect(results[0]).toEqual({ date: "2024-01-01", cumulativeReturnPct: 0 });

    // Day 1: 1.0005 - 1 = 0.05%
    expect(results[1]).toEqual({ date: "2024-01-02", cumulativeReturnPct: 0.05 });

    // Day 2: 1.0005^2 - 1 = 0.100025%
    expect(results[2]).toEqual({ date: "2024-01-03", cumulativeReturnPct: 0.100025 });

    // Day 3: 1.0005^3 - 1 = 0.1500750125% -> 0.150075%
    // Verify that compounded return is strictly greater than simple sum (0.15%)
    expect(results[3].cumulativeReturnPct).toBeGreaterThan(0.15);
    expect(results[3]).toEqual({ date: "2024-01-04", cumulativeReturnPct: 0.150075 });
  });

  it("should calculate cumulative return from closing price series (IBOV / SPX)", () => {
    const prices: PricePoint[] = [
      { date: "2024-01-01", close: 100 },
      { date: "2024-01-02", close: 105 },
      { date: "2024-01-03", close: 98 },
      { date: "2024-01-04", close: 110 },
    ];

    const results = calculatePriceCumulativeReturn(prices);

    expect(results).toHaveLength(4);
    expect(results[0]).toEqual({ date: "2024-01-01", cumulativeReturnPct: 0 });
    expect(results[1]).toEqual({ date: "2024-01-02", cumulativeReturnPct: 5 });
    expect(results[2]).toEqual({ date: "2024-01-03", cumulativeReturnPct: -2 });
    expect(results[3]).toEqual({ date: "2024-01-04", cumulativeReturnPct: 10 });
  });

  it("should gracefully handle empty or invalid price series without throwing", () => {
    expect(calculatePriceCumulativeReturn([])).toEqual([]);
    expect(calculateDailyCompoundedReturn([])).toEqual([]);
  });

  it("should gracefully fall back to empty array when network/API fails without throwing exceptions", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network Error simulation"));

    try {
      const bcbResult = await fetchBcbBenchmarkSeries(12, "2024-01-01", "2024-01-10");
      expect(bcbResult).toEqual([]);

      const yahooResult = await fetchYahooBenchmarkSeries("^BVSP", "2024-01-01", "2024-01-10");
      expect(yahooResult).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
