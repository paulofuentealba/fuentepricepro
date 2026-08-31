import { describe, it, expect } from "vitest";
import { simulateSnowballScenario } from "@/lib/snowballScenario";

describe("simulateSnowballScenario", () => {
  it("returns one year point per year of the horizon", () => {
    const result = simulateSnowballScenario({
      baseEquity: 100000,
      monthlyContribution: 1000,
      yieldPct: 8,
      growthPct: 0,
      years: 5,
    });
    expect(result.yearPoints).toHaveLength(5);
    expect(result.yearPoints[0].year).toBe(1);
    expect(result.yearPoints[4].year).toBe(5);
  });

  it("grows the balance monotonically year over year with positive yield/growth", () => {
    const result = simulateSnowballScenario({
      baseEquity: 100000,
      monthlyContribution: 1000,
      yieldPct: 8,
      growthPct: 6,
      years: 10,
    });
    for (let i = 1; i < result.yearPoints.length; i++) {
      expect(result.yearPoints[i].balance).toBeGreaterThan(result.yearPoints[i - 1].balance);
    }
    expect(result.finalBalance).toBe(result.yearPoints[result.yearPoints.length - 1].balance);
  });

  it("derives finalMonthlyIncome from finalBalance and yieldPct", () => {
    const result = simulateSnowballScenario({
      baseEquity: 500000,
      monthlyContribution: 0,
      yieldPct: 12,
      growthPct: 0,
      years: 1,
    });
    const expectedMonthlyIncome = (result.finalBalance * 0.12) / 12;
    expect(result.finalMonthlyIncome).toBeCloseTo(expectedMonthlyIncome, 6);
  });

  it("with zero yield/growth, final balance equals base equity plus contributions", () => {
    const result = simulateSnowballScenario({
      baseEquity: 10000,
      monthlyContribution: 500,
      yieldPct: 0,
      growthPct: 0,
      years: 2,
    });
    expect(result.finalBalance).toBeCloseTo(10000 + 500 * 24, 6);
  });

  it("clamps negative baseEquity and monthlyContribution to zero", () => {
    const result = simulateSnowballScenario({
      baseEquity: -100,
      monthlyContribution: -50,
      yieldPct: 5,
      growthPct: 0,
      years: 1,
    });
    expect(result.finalBalance).toBe(0);
  });
});
