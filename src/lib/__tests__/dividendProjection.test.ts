import { describe, it, expect } from "vitest";
import { simulateDividendProjection } from "../dividendProjection";

describe("simulateDividendProjection", () => {
  it("Case 1: Simulação com aporte mensal zero -> cotas crescem só por reinvestimento", () => {
    // 100 cotas a R$ 100 cada = R$ 10.000.
    // Yield anual = 12% -> 1% ao mês.
    // Mês 1: Renda = 100 * 0.01 * 100 = 100. Novas cotas = 100/100 = 1 cota. Cotas = 101.
    // Mês 2: Renda = 101 * 0.01 * 100 = 101. Novas cotas = 1.01 cotas. Cotas = 102.01.
    // Mês 12: Cotas = 100 * (1 + 0.01)^12 ≈ 112.6825.
    const result = simulateDividendProjection({
      initialShares: 100,
      currentPrice: 100,
      annualYield: 0.12,
      monthlyContribution: 0,
      periodYears: 1,
    });

    expect(result.initialShares).toBe(100);
    expect(result.finalShares).toBeCloseTo(100 * Math.pow(1.01, 12), 4);
    expect(result.initialMonthlyIncome).toBeCloseTo(100, 2);
    expect(result.finalMonthlyIncome).toBeCloseTo(result.finalShares * 0.01 * 100, 2);
    expect(result.totalOutOfPocket).toBe(10000);
    expect(result.timeline).toHaveLength(13); // month 0 to 12
  });

  it("Case 2: Simulação com aporte mensal > 0 -> cotas crescem por aporte + reinvestimento combinados", () => {
    const result = simulateDividendProjection({
      initialShares: 100,
      currentPrice: 100,
      annualYield: 0.12,
      monthlyContribution: 500, // 5 cotas por mês de aporte
      periodYears: 1,
    });

    expect(result.initialShares).toBe(100);
    expect(result.finalShares).toBeGreaterThan(100 * Math.pow(1.01, 12) + 60);
    expect(result.totalOutOfPocket).toBe(10000 + 500 * 12);
    expect(result.timeline).toHaveLength(13);
  });

  it("Case 3: Simulação com yield 0 (edge case) -> cotas crescem só por aporte, renda permanece 0", () => {
    const result = simulateDividendProjection({
      initialShares: 50,
      currentPrice: 50,
      annualYield: 0,
      monthlyContribution: 200, // 4 cotas por mês
      periodYears: 1,
    });

    expect(result.initialShares).toBe(50);
    expect(result.finalShares).toBe(50 + 4 * 12); // 98 cotas
    expect(result.initialMonthlyIncome).toBe(0);
    expect(result.finalMonthlyIncome).toBe(0);
    expect(result.totalReinvested).toBe(0);
    expect(result.totalOutOfPocket).toBe(50 * 50 + 200 * 12);
  });

  it("Case 4: Simulação com 0 cotas iniciais e aporte > 0 -> começa do zero e funciona sem erro", () => {
    const result = simulateDividendProjection({
      initialShares: 0,
      currentPrice: 100,
      annualYield: 0.12, // 1% ao mês
      monthlyContribution: 1000, // 10 cotas por mês
      periodYears: 1,
    });

    expect(result.initialShares).toBe(0);
    expect(result.initialMonthlyIncome).toBe(0);
    expect(result.finalShares).toBeGreaterThan(120); // 120 do aporte + reinvestimento
    expect(result.totalOutOfPocket).toBe(12000);
    expect(result.totalReinvested).toBeGreaterThan(0);
  });
});
