import { describe, expect, it } from "vitest";
import { calculateRealizedIncome, getTaxType, normalizeDateStr } from "../realizedIncome";
import { type Transaction } from "../transactions";
import { type DividendEvent } from "../domain";

describe("realizedIncome", () => {
  describe("normalizeDateStr", () => {
    it("converts timestamps and ISO strings to YYYY-MM-DD", () => {
      const ts = new Date("2024-04-10T12:00:00Z").getTime();
      expect(normalizeDateStr(ts)).toBe("2024-04-10");
      expect(normalizeDateStr("2024-04-16T15:30:00Z")).toBe("2024-04-16");
      expect(normalizeDateStr("2024-04-16")).toBe("2024-04-16");
    });
  });

  describe("getTaxType", () => {
    it("returns correct tax category for US and BR assets", () => {
      expect(getTaxType("STOCK_US", "USD")).toBe("us_dividend");
      expect(getTaxType("REIT", "USD")).toBe("us_dividend");
      expect(getTaxType("FII", "BRL")).toBe("rendimento_fii");
      expect(getTaxType("FIAGRO", "BRL")).toBe("rendimento_fii");
      expect(getTaxType("STOCK_BR", "BRL")).toBe("dividend");
    });
  });

  describe("calculateRealizedIncome", () => {
    const mockDividendEvents: Record<string, DividendEvent[]> = {
      BBSE3: [
        {
          exDate: "2024-04-16",
          paymentDate: "2024-04-30",
          amountPerShare: 1.5,
        },
      ],
      HGLG11: [
        {
          exDate: "2024-04-30",
          paymentDate: "2024-05-15",
          paymentDateEstimated: true,
          amountPerShare: 1.1,
        },
      ],
    };

    it("scenario 1: buy BEFORE ex-date -> receives dividend", () => {
      const txs: Transaction[] = [
        {
          id: "t1",
          ticker: "BBSE3",
          type: "buy",
          date: new Date("2024-04-10").getTime(),
          quantity: 100,
          pricePerShare: 30,
        },
      ];

      const res = calculateRealizedIncome(txs, mockDividendEvents, {
        BBSE3: { ticker: "BBSE3", type: "STOCK_BR", currency: "BRL" },
      });

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        ticker: "BBSE3",
        exDate: "2024-04-16",
        paymentDate: "2024-04-30",
        paymentDateEstimated: false,
        quantityHeld: 100,
        amountPerShareGross: 1.5,
        amountGross: 150,
        amountNet: 150,
        taxType: "dividend",
      });
    });

    it("scenario 2: buy AFTER ex-date -> does NOT receive dividend", () => {
      const txs: Transaction[] = [
        {
          id: "t1",
          ticker: "BBSE3",
          type: "buy",
          date: new Date("2024-04-18").getTime(), // bought 2 days after ex-date April 16
          quantity: 100,
          pricePerShare: 30,
        },
      ];

      const res = calculateRealizedIncome(txs, mockDividendEvents);
      expect(res).toHaveLength(0);
    });

    it("scenario 3: sell BEFORE ex-date -> does NOT receive even if bought earlier", () => {
      const txs: Transaction[] = [
        {
          id: "t1",
          ticker: "BBSE3",
          type: "buy",
          date: new Date("2024-04-01").getTime(),
          quantity: 100,
          pricePerShare: 30,
        },
        {
          id: "t2",
          ticker: "BBSE3",
          type: "sell",
          date: new Date("2024-04-14").getTime(), // sold 2 days before ex-date April 16
          quantity: 100,
          pricePerShare: 32,
        },
      ];

      const res = calculateRealizedIncome(txs, mockDividendEvents);
      expect(res).toHaveLength(0);
    });

    it("scenario 4: sell AFTER ex-date -> receives dividend for shares held on ex-date", () => {
      const txs: Transaction[] = [
        {
          id: "t1",
          ticker: "BBSE3",
          type: "buy",
          date: new Date("2024-04-01").getTime(),
          quantity: 100,
          pricePerShare: 30,
        },
        {
          id: "t2",
          ticker: "BBSE3",
          type: "sell",
          date: new Date("2024-04-18").getTime(), // sold AFTER ex-date April 16
          quantity: 100,
          pricePerShare: 32,
        },
      ];

      const res = calculateRealizedIncome(txs, mockDividendEvents);
      expect(res).toHaveLength(1);
      expect(res[0].quantityHeld).toBe(100);
      expect(res[0].amountNet).toBe(150);
    });

    it("scenario 5: partial sell BEFORE ex-date -> receives only on remaining quantity", () => {
      const txs: Transaction[] = [
        {
          id: "t1",
          ticker: "BBSE3",
          type: "buy",
          date: new Date("2024-04-01").getTime(),
          quantity: 100,
          pricePerShare: 30,
        },
        {
          id: "t2",
          ticker: "BBSE3",
          type: "sell",
          date: new Date("2024-04-12").getTime(), // sold 40 shares before ex-date
          quantity: 40,
          pricePerShare: 31,
        },
      ];

      const res = calculateRealizedIncome(txs, mockDividendEvents);
      expect(res).toHaveLength(1);
      expect(res[0].quantityHeld).toBe(60);
      expect(res[0].amountGross).toBe(90); // 60 * 1.5
    });

    it("scenario 6: multiple transactions across multiple tickers with US withholding tax", () => {
      const txs: Transaction[] = [
        {
          id: "t1",
          ticker: "BBSE3",
          type: "buy",
          date: new Date("2024-04-01").getTime(),
          quantity: 50,
          pricePerShare: 30,
        },
        {
          id: "t2",
          ticker: "HGLG11",
          type: "buy",
          date: new Date("2024-04-05").getTime(),
          quantity: 200,
          pricePerShare: 160,
        },
        {
          id: "t3",
          ticker: "AAPL",
          type: "buy",
          date: new Date("2024-05-01").getTime(),
          quantity: 10,
          pricePerShare: 180,
        },
      ];

      const events: Record<string, DividendEvent[]> = {
        ...mockDividendEvents,
        AAPL: [
          {
            exDate: "2024-05-10",
            paymentDate: "2024-05-16",
            amountPerShare: 0.25,
          },
        ],
      };

      const res = calculateRealizedIncome(txs, events, {
        BBSE3: { ticker: "BBSE3", type: "STOCK_BR", currency: "BRL" },
        HGLG11: { ticker: "HGLG11", type: "FII", currency: "BRL" },
        AAPL: { ticker: "AAPL", type: "STOCK_US", currency: "USD" },
      });

      expect(res).toHaveLength(3);

      const aaplRes = res.find((r) => r.ticker === "AAPL")!;
      expect(aaplRes.quantityHeld).toBe(10);
      expect(aaplRes.amountGross).toBe(2.5); // 10 * 0.25
      expect(aaplRes.amountNet).toBeCloseTo(1.75, 4); // 2.5 * (1 - 0.3) = 1.75
      expect(aaplRes.taxType).toBe("us_dividend");

      const fiiRes = res.find((r) => r.ticker === "HGLG11")!;
      expect(fiiRes.quantityHeld).toBe(200);
      expect(fiiRes.amountGross).toBe(220); // 200 * 1.1
      expect(fiiRes.taxType).toBe("rendimento_fii");
    });
  });
});
