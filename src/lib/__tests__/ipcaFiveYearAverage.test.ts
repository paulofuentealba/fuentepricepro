import { describe, it, expect, vi } from "vitest";
import {
  composeAnnualizedRateFromMonthlyPct,
  fetchIpcaFiveYearAverage,
} from "../benchmark.server";

describe("IPCA médio de 5 anos — composição geométrica (Gordon terminal growth rate)", () => {
  it("composes 12 synthetic monthly rates into the correct annualized geometric mean", () => {
    // 12 months at a flat 0.5% monthly variation.
    // By hand: (1.005)^12 - 1 = 0.06167781186...  (~6.1678%)
    const flatMonths = Array(12).fill(0.5);
    const flatResult = composeAnnualizedRateFromMonthlyPct(flatMonths);
    expect(flatResult).toBeCloseTo(Math.pow(1.005, 12) - 1, 10);
    expect(flatResult * 100).toBeCloseTo(6.1678, 3);

    // 12 months varying, e.g. alternating between 0.3% and 0.6% (6x each).
    // By hand: (1.003)^6 * (1.006)^6 - 1
    const varyingMonths = [0.3, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3, 0.6, 0.3, 0.6];
    const varyingResult = composeAnnualizedRateFromMonthlyPct(varyingMonths);
    const expected = Math.pow(1.003, 6) * Math.pow(1.006, 6) - 1;
    expect(varyingResult).toBeCloseTo(expected, 10);
  });

  it("fetchIpcaFiveYearAverage returns null gracefully when the BCB fetch fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network Error simulation"));
    try {
      const result = await fetchIpcaFiveYearAverage();
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fetchIpcaFiveYearAverage returns null when the BCB series has too few months (< 48)", async () => {
    const originalFetch = globalThis.fetch;
    // Only 12 months returned — well below the 48-month minimum tolerance.
    const shortSeries = Array.from({ length: 12 }, (_, i) => ({
      data: `01/${String((i % 12) + 1).padStart(2, "0")}/2024`,
      valor: "0.50",
    }));
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => shortSeries,
    } as Response);
    try {
      const result = await fetchIpcaFiveYearAverage();
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fetchIpcaFiveYearAverage composes a full 60-month synthetic series correctly", async () => {
    const originalFetch = globalThis.fetch;
    const fullSeries = Array.from({ length: 60 }, (_, i) => ({
      data: `01/${String((i % 12) + 1).padStart(2, "0")}/2020`,
      valor: "0.40",
    }));
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fullSeries,
    } as Response);
    try {
      const result = await fetchIpcaFiveYearAverage();
      expect(result).not.toBeNull();
      // By hand: (1.004)^60 - 1 = ~26.99% cumulative over 5 years -> annualized = 12/60 exponent = same as monthly compounding formula
      const expected = Math.pow(1.004, 12) - 1;
      expect(result!).toBeCloseTo(expected, 10);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
