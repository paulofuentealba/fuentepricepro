import { describe, it, expect } from "vitest";
import {
  computeUs1099Div,
  computeUs1099B,
  buildUsTaxYearSummary,
  generate1099Csv,
} from "../form1099";
import type { RealizedIncomeEvent } from "@/lib/realizedIncome";
import type { Transaction } from "@/lib/transactionsLogic";

describe("US Form 1099 Engine (IRS Form 1040 Tax Residency)", () => {
  describe("Form 1099-DIV: Dividends and Distributions", () => {
    it("1. calculates Box 1a Ordinary and Box 1b Qualified Dividends for stocks held > 60 days", () => {
      const txs: Transaction[] = [
        {
          id: "tx-aapl-buy",
          ticker: "AAPL",
          type: "buy",
          date: new Date("2025-01-10").getTime(),
          pricePerShare: 200,
          quantity: 100,
        },
      ];

      // Ex-date: 2025-05-10 (4 months later, held > 60 days)
      const realizedEvents: RealizedIncomeEvent[] = [
        {
          ticker: "AAPL",
          currency: "USD",
          exDate: "2025-05-10",
          paymentDate: "2025-05-20",
          amountGross: 150,
          amountNet: 150,
          quantityHeld: 100,
          amountPerShareGross: 1.5,
          isPaid: true,
          taxType: "dividend",
        },
      ];

      const meta = {
        AAPL: { type: "STOCK_US" as const, name: "Apple Inc." },
      };

      const result = computeUs1099Div(realizedEvents, txs, meta, 2025);

      expect(result.year).toBe(2025);
      expect(result.totalOrdinaryDividends).toBe(150);
      expect(result.totalQualifiedDividends).toBe(150); // Qualified!
      expect(result.totalSection199aDividends).toBe(0);
      expect(result.totalNonQualifiedOrdinary).toBe(0);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].ticker).toBe("AAPL");
      expect(result.items[0].qualifiedDividends).toBe(150);
    });

    it("2. classifies stock dividends as ordinary (non-qualified) if held for less than 60 days", () => {
      const txs: Transaction[] = [
        {
          id: "tx-nvda-buy",
          ticker: "NVDA",
          type: "buy",
          date: new Date("2025-05-01").getTime(),
          pricePerShare: 120,
          quantity: 50,
        },
      ];

      // Ex-date: 2025-05-15 (14 days later, held < 60 days)
      const realizedEvents: RealizedIncomeEvent[] = [
        {
          ticker: "NVDA",
          currency: "USD",
          exDate: "2025-05-15",
          paymentDate: "2025-05-28",
          amountGross: 80,
          amountNet: 80,
          quantityHeld: 50,
          amountPerShareGross: 1.6,
          isPaid: true,
          taxType: "dividend",
        },
      ];

      const meta = {
        NVDA: { type: "STOCK_US" as const, name: "Nvidia Corp." },
      };

      const result = computeUs1099Div(realizedEvents, txs, meta, 2025);

      expect(result.totalOrdinaryDividends).toBe(80);
      expect(result.totalQualifiedDividends).toBe(0); // Not qualified!
      expect(result.totalNonQualifiedOrdinary).toBe(80);
    });

    it("3. categorizes REIT dividends into Box 5 Section 199A Dividends (QBI deduction)", () => {
      const txs: Transaction[] = [
        {
          id: "tx-o-buy",
          ticker: "O",
          type: "buy",
          date: new Date("2024-01-01").getTime(),
          pricePerShare: 52,
          quantity: 200,
        },
      ];

      const realizedEvents: RealizedIncomeEvent[] = [
        {
          ticker: "O",
          currency: "USD",
          exDate: "2025-03-01",
          paymentDate: "2025-03-15",
          amountGross: 300,
          amountNet: 300,
          quantityHeld: 200,
          amountPerShareGross: 1.5,
          isPaid: true,
          taxType: "dividend",
        },
      ];

      const meta = {
        O: { type: "REIT" as const, name: "Realty Income Corp." },
      };

      const result = computeUs1099Div(realizedEvents, txs, meta, 2025);

      expect(result.totalOrdinaryDividends).toBe(300);
      expect(result.totalQualifiedDividends).toBe(0); // REITs are not qualified
      expect(result.totalSection199aDividends).toBe(300); // 100% Section 199A eligible
      expect(result.totalNonQualifiedOrdinary).toBe(300);
    });

    it("4. shields Roth IRA dividends from Form 1099-DIV (100% tax-free earnings)", () => {
      const txs: Transaction[] = [
        {
          id: "tx-roth-buy",
          ticker: "SCHD",
          type: "buy",
          date: new Date("2024-01-01").getTime(),
          pricePerShare: 26,
          quantity: 500,
          accountType: "roth_ira",
        },
      ];

      const realizedEvents: RealizedIncomeEvent[] = [
        {
          ticker: "SCHD",
          currency: "USD",
          exDate: "2025-06-15",
          paymentDate: "2025-06-25",
          amountGross: 450,
          amountNet: 450,
          quantityHeld: 500,
          amountPerShareGross: 0.9,
          isPaid: true,
          taxType: "dividend",
        },
      ];

      const meta = {
        SCHD: {
          type: "ETF" as const,
          name: "Schwab US Dividend Equity ETF",
          accountType: "roth_ira" as const,
        },
      };

      const result = computeUs1099Div(realizedEvents, txs, meta, 2025);

      expect(result.totalOrdinaryDividends).toBe(0); // Taxable reportable is $0
      expect(result.totalQualifiedDividends).toBe(0);
      expect(result.rothIraDividendsShielded).toBe(450); // $450 shielded tax-free
      expect(result.items).toHaveLength(0); // No taxable 1099 items
    });
  });

  describe("Form 1099-B: Capital Gains, Holding Periods & Wash Sales", () => {
    it("5. separates Short-Term (<= 365 days) from Long-Term (> 365 days) capital gains via FIFO", () => {
      const txs: Transaction[] = [
        // Lot 1: Bought 2023-01-10 (Held > 1 year -> Long Term)
        {
          id: "buy-1",
          ticker: "AAPL",
          type: "buy",
          date: new Date("2023-01-10").getTime(),
          pricePerShare: 150,
          quantity: 10,
        },
        // Lot 2: Bought 2025-01-10 (Held < 1 year -> Short Term)
        {
          id: "buy-2",
          ticker: "AAPL",
          type: "buy",
          date: new Date("2025-01-10").getTime(),
          pricePerShare: 200,
          quantity: 10,
        },
        // Sale: Sold 15 shares on 2025-08-10 at $250
        // FIFO: 10 shares from Lot 1 (Long Term: 250 - 150 = +$1000)
        //        5 shares from Lot 2 (Short Term: 250 - 200 = +$250)
        {
          id: "sell-1",
          ticker: "AAPL",
          type: "sell",
          date: new Date("2025-08-10").getTime(),
          pricePerShare: 250,
          quantity: 15,
        },
      ];

      const result = computeUs1099B(txs, 2025);

      expect(result.sales).toHaveLength(2);
      expect(result.longTermGains).toBe(1000);
      expect(result.netLongTerm).toBe(1000);
      expect(result.shortTermGains).toBe(250);
      expect(result.netShortTerm).toBe(250);
      expect(result.netTaxableGainOrLoss).toBe(1250);
      expect(result.totalWashSaleDisallowed).toBe(0);
    });

    it("6. identifies Wash Sale (IRC § 1091) when sold at a loss and repurchased within 30 days", () => {
      const txs: Transaction[] = [
        // Buy 1: Bought on 2025-02-01 at $100
        {
          id: "b1",
          ticker: "TSLA",
          type: "buy",
          date: new Date("2025-02-01").getTime(),
          pricePerShare: 100,
          quantity: 20,
        },
        // Sell at loss: Sold on 2025-05-01 at $70 (Loss of -$600)
        {
          id: "s1",
          ticker: "TSLA",
          type: "sell",
          date: new Date("2025-05-01").getTime(),
          pricePerShare: 70,
          quantity: 20,
        },
        // Replacement Buy: Bought 20 shares on 2025-05-15 (14 days after sale -> WASH SALE!)
        {
          id: "b2",
          ticker: "TSLA",
          type: "buy",
          date: new Date("2025-05-15").getTime(),
          pricePerShare: 65,
          quantity: 20,
        },
      ];

      const result = computeUs1099B(txs, 2025);

      expect(result.sales).toHaveLength(1);
      const sale = result.sales[0];
      expect(sale.isWashSale).toBe(true);
      expect(sale.washSaleLossDisallowed).toBe(600); // $600 loss disallowed
      expect(sale.gainOrLoss).toBe(0); // -600 + 600 = $0 allowed net loss
      expect(result.totalWashSaleDisallowed).toBe(600);
    });

    it("7. caps net deductible capital losses against ordinary income at $3,000 with carryforward", () => {
      const txs: Transaction[] = [
        {
          id: "b1",
          ticker: "RIVN",
          type: "buy",
          date: new Date("2024-01-01").getTime(),
          pricePerShare: 100,
          quantity: 100,
        },
        // Sold on 2025-06-01 at $40 -> Loss of $6,000
        {
          id: "s1",
          ticker: "RIVN",
          type: "sell",
          date: new Date("2025-06-01").getTime(),
          pricePerShare: 40,
          quantity: 100,
        },
      ];

      const result = computeUs1099B(txs, 2025);

      expect(result.netTaxableGainOrLoss).toBe(-6000);
      expect(result.deductibleLossAgainstIncome).toBe(3000); // Capped at $3,000 for the tax year
      expect(result.carryforwardLoss).toBe(3000); // Remaining $3,000 carried forward to next year
    });

    it("8. shields Roth IRA sales from Form 1099-B reportable capital gains", () => {
      const txs: Transaction[] = [
        {
          id: "b-roth",
          ticker: "VOO",
          type: "buy",
          date: new Date("2024-01-01").getTime(),
          pricePerShare: 350,
          quantity: 10,
          accountType: "roth_ira",
        },
        {
          id: "s-roth",
          ticker: "VOO",
          type: "sell",
          date: new Date("2025-06-01").getTime(),
          pricePerShare: 450,
          quantity: 10,
          accountType: "roth_ira",
        },
      ];

      const result = computeUs1099B(txs, 2025);

      expect(result.netTaxableGainOrLoss).toBe(0);
      expect(result.rothIraCapitalGainsShielded).toBe(1000); // $1,000 capital gain shielded inside Roth
    });
  });

  describe("buildUsTaxYearSummary & CSV Export", () => {
    it("9. compiles a complete summary and formats a clean Form 1099 CSV", () => {
      const txs: Transaction[] = [
        {
          id: "b1",
          ticker: "AAPL",
          type: "buy",
          date: new Date("2024-01-01").getTime(),
          pricePerShare: 180,
          quantity: 50,
        },
        {
          id: "s1",
          ticker: "AAPL",
          type: "sell",
          date: new Date("2025-03-01").getTime(),
          pricePerShare: 220,
          quantity: 20,
        },
      ];

      const realizedEvents: RealizedIncomeEvent[] = [
        {
          ticker: "AAPL",
          currency: "USD",
          exDate: "2025-02-01",
          paymentDate: "2025-02-15",
          amountGross: 50,
          amountNet: 50,
          quantityHeld: 50,
          amountPerShareGross: 1.0,
          isPaid: true,
          taxType: "dividend",
        },
      ];

      const meta = {
        AAPL: { type: "STOCK_US" as const, name: "Apple Inc." },
      };

      const summary = buildUsTaxYearSummary(realizedEvents, txs, meta, 2025);

      expect(summary.year).toBe(2025);
      expect(summary.divSummary.totalOrdinaryDividends).toBe(50);
      expect(summary.bSummary.netTaxableGainOrLoss).toBe(800); // 20 * (220 - 180) = 800

      const csv = generate1099Csv(summary);
      expect(csv).toContain("IRS Form 1099 Report (Tax Year 2025)");
      expect(csv).toContain("FORM 1099-DIV: DIVIDENDS AND DISTRIBUTIONS");
      expect(csv).toContain("FORM 1099-B: PROCEEDS FROM BROKER TRANSACTIONS");
      expect(csv).toContain('"AAPL"');
    });
  });
});
