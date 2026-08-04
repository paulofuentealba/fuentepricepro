import { describe, expect, it } from "vitest";
import { calculateIrr, buildCashFlowsFromPortfolio, type CashFlow } from "../portfolioIrr";
import { type Transaction } from "../transactions";
import { type RealizedIncomeEvent } from "../realizedIncome";

describe("portfolioIrr", () => {
  describe("calculateIrr", () => {
    it("returns null for insufficient or invalid cash flows", () => {
      expect(calculateIrr([])).toBeNull();
      expect(calculateIrr([{ date: 1000, amount: -100 }])).toBeNull();
      expect(calculateIrr([{ date: 1000, amount: 100 }, { date: 2000, amount: 200 }])).toBeNull(); // no outflows
      expect(calculateIrr([{ date: 1000, amount: -100 }, { date: 2000, amount: -200 }])).toBeNull(); // no inflows
    });

    it("scenario 1: single buy of 10,000 one year ago doubling to 20,000 -> IRR ~100%", () => {
      const now = new Date("2026-01-01T00:00:00Z").getTime();
      const oneYearAgo = now - 365.25 * 24 * 60 * 60 * 1000;

      const flows: CashFlow[] = [
        { date: oneYearAgo, amount: -10000 },
        { date: now, amount: 20000 },
      ];

      const irr = calculateIrr(flows);
      expect(irr).not.toBeNull();
      expect(irr).toBeCloseTo(1.0, 3); // 100% a.a.
    });

    it("scenario 2: buy 10,000 1yr ago + dividend 500 at 6mo (paymentDate) + final value 11,000 -> IRR ~15.3705%", () => {
      const t0 = new Date("2025-01-01T00:00:00Z").getTime();
      const t1 = t0 + 182.625 * 24 * 60 * 60 * 1000; // 0.5 years (6 months)
      const t2 = t0 + 365.25 * 24 * 60 * 60 * 1000; // 1.0 year

      const flows: CashFlow[] = [
        { date: t0, amount: -10000 },
        { date: t1, amount: 500 },
        { date: t2, amount: 11000 },
      ];

      const irr = calculateIrr(flows);
      expect(irr).not.toBeNull();
      // Analytical solution derived in prompt review: r = (1.07410675)^2 - 1 = 15.3705%
      expect(irr).toBeCloseTo(0.1537, 4);
    });

    it("scenario 3: handles bisection fallback for complex multi-period flows gracefully", () => {
      const t0 = new Date("2024-01-01").getTime();
      const t1 = new Date("2024-07-01").getTime();
      const t2 = new Date("2025-01-01").getTime();
      const t3 = new Date("2025-07-01").getTime();

      const flows: CashFlow[] = [
        { date: t0, amount: -50000 },
        { date: t1, amount: -20000 },
        { date: t2, amount: 3000 },
        { date: t3, amount: 80000 },
      ];

      const irr = calculateIrr(flows);
      expect(irr).not.toBeNull();
      expect(typeof irr).toBe("number");
      expect(irr!).toBeGreaterThan(0.05);
      expect(irr!).toBeLessThan(0.30);
    });
  });

  describe("buildCashFlowsFromPortfolio", () => {
    it("uses paymentDate for dividends (falling back to exDate ONLY when paymentDate is null)", () => {
      const t0 = new Date("2025-01-01").getTime();
      const txs: Transaction[] = [
        {
          id: "tx1",
          ticker: "PETR4.SA",
          type: "buy",
          date: t0,
          quantity: 100,
          pricePerShare: 30,
        },
      ];

      const realized: RealizedIncomeEvent[] = [
        {
          ticker: "PETR4.SA",
          exDate: "2025-04-01",
          paymentDate: "2025-05-15", // Payment date is 1.5 months after exDate!
          quantityHeld: 100,
          amountPerShareGross: 1.0,
          amountGross: 100,
          amountNet: 100,
          taxType: "dividend",
        },
        {
          ticker: "AAPL",
          exDate: "2025-06-01",
          paymentDate: null, // Fallback to exDate!
          quantityHeld: 10,
          amountPerShareGross: 0.5,
          amountGross: 5,
          amountNet: 3.5,
          taxType: "us_dividend",
        },
      ];

      const now = new Date("2025-12-31").getTime();
      const flows = buildCashFlowsFromPortfolio(txs, realized, 3500, now, 5.0, {
        "PETR4.SA": "BRL",
        AAPL: "USD",
      });

      expect(flows).toHaveLength(4); // 1 buy + 2 dividends + 1 terminal value

      // Check buy
      expect(flows[0].amount).toBe(-3000);

      // Check PETR4 dividend -> MUST use paymentDate ("2025-05-15")
      const petr4Flow = flows.find((f) => f.amount === 100)!;
      expect(new Date(petr4Flow.date).toISOString().slice(0, 10)).toBe("2025-05-15");

      // Check AAPL dividend -> fallback to exDate ("2025-06-01") converted to BRL (3.5 * 5.0 = 17.5)
      const aaplFlow = flows.find((f) => f.amount === 17.5)!;
      expect(new Date(aaplFlow.date).toISOString().slice(0, 10)).toBe("2025-06-01");

      // Check terminal value
      expect(flows[3].amount).toBe(3500);
      expect(flows[3].date).toBe(now);
    });
  });
});
