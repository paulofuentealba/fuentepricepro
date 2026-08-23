import { describe, it, expect } from "vitest";
import { simulateDividendProjection } from "../dividendProjection";

describe("simulateDividendProjection", () => {
  it("Case 1: Simulação com aporte mensal zero -> cotas crescem só por reinvestimento composto geométrico", () => {
    // 100 cotas a R$ 100 cada = R$ 10.000.
    // Yield anual = 12% -> taxa mensal equivalente r_mes = (1 + 0.12)^(1/12) - 1.
    // Após 12 meses de reinvestimento, cotas finais = 100 * (1 + r_mes)^12 = 100 * 1.12 = 112 cotas exatas.
    const result = simulateDividendProjection({
      initialShares: 100,
      currentPrice: 100,
      annualYield: 0.12,
      monthlyContribution: 0,
      periodYears: 1,
    });

    const expectedMonthlyRate = Math.pow(1.12, 1 / 12) - 1;

    expect(result.initialShares).toBe(100);
    // Equivalência geométrica perfeita: 100 * (1 + 0.12) = 112
    expect(result.finalShares).toBeCloseTo(112, 4);
    expect(result.initialMonthlyIncome).toBeCloseTo(100 * expectedMonthlyRate * 100, 2);
    expect(result.finalMonthlyIncome).toBeCloseTo(result.finalShares * expectedMonthlyRate * 100, 2);
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
    expect(result.finalShares).toBeGreaterThan(112 + 60);
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
      annualYield: 0.12,
      monthlyContribution: 1000, // 10 cotas por mês
      periodYears: 1,
    });

    expect(result.initialShares).toBe(0);
    expect(result.initialMonthlyIncome).toBe(0);
    expect(result.finalShares).toBeGreaterThan(120); // 120 do aporte + reinvestimento
    expect(result.totalOutOfPocket).toBe(12000);
    expect(result.totalReinvested).toBeGreaterThan(0);
  });

  it("Case 5: Contrato estrito decimal preserva yields baixos e normais sem distorção", () => {
    // 0.8% a.a. passado como 0.008 não deve sofrer normalização indevida
    const lowYieldResult = simulateDividendProjection({
      initialShares: 1000,
      currentPrice: 10,
      annualYield: 0.008, // 0.8% a.a.
      monthlyContribution: 0,
      periodYears: 1,
    });
    const lowMonthlyRate = Math.pow(1.008, 1 / 12) - 1;
    expect(lowYieldResult.initialMonthlyIncome).toBeCloseTo(1000 * lowMonthlyRate * 10, 4);

    // 8% a.a. passado como 0.08
    const normalYieldResult = simulateDividendProjection({
      initialShares: 100,
      currentPrice: 100,
      annualYield: 0.08,
      monthlyContribution: 0,
      periodYears: 1,
    });
    const normalMonthlyRate = Math.pow(1.08, 1 / 12) - 1;
    expect(normalYieldResult.initialMonthlyIncome).toBeCloseTo(100 * normalMonthlyRate * 100, 4);
  });

  it("Case 6: Composição mensal geométrica fecha rigorosamente no yield anual exato (1 + r_ano)", () => {
    const annualYields = [0.05, 0.08, 0.10, 0.15];
    for (const y of annualYields) {
      const res = simulateDividendProjection({
        initialShares: 1000,
        currentPrice: 50,
        annualYield: y,
        monthlyContribution: 0,
        periodYears: 1,
      });
      // 1000 cotas sob taxa geométrica após 12 meses devem ser exatamente 1000 * (1 + y)
      expect(res.finalShares).toBeCloseTo(1000 * (1 + y), 4);
    }
  });
});
