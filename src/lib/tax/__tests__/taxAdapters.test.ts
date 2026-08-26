import { describe, it, expect } from "vitest";
import {
  simulateBrDividendTax,
  simulateBrJcpTax,
  simulateUsWithholdingTax,
  type TaxSimulationPositionInput,
} from "../index";
import { netAfterTax, dividendTaxRate, JCP_TAX_RATE, US_DIVIDEND_TAX_RATE } from "@/lib/calculations";

describe("Tax Simulation Adapters (Prompt 138 / Item 2.1a)", () => {
  describe("simulateBrDividendTax (Common BR Dividends & FIIs)", () => {
    it("matches SSOT netAfterTax and dividendTaxRate with 0% effective tax", () => {
      const positions: TaxSimulationPositionInput[] = [
        { ticker: "BBAS3", type: "STOCK_BR", grossAmount: 1000 },
        { ticker: "HGLG11", type: "FII", grossAmount: 500 },
        { ticker: "KNCA11", type: "FIAGRO", grossAmount: 250 },
      ];

      const result = simulateBrDividendTax(positions, "2026-08-26");

      expect(result.jurisdiction).toBe("BR");
      expect(result.totalGross).toBe(1750);
      expect(result.totalNet).toBe(1750);
      expect(result.totalTax).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
      expect(result.calculatedAt).toBe("2026-08-26");

      // Verify each position matches direct SSOT calls
      for (let i = 0; i < positions.length; i++) {
        const input = positions[i];
        const out = result.positions[i];
        const expectedRate = dividendTaxRate(input.type, "BRL", undefined, false);
        const expectedNet = netAfterTax(input.grossAmount, input.type, "BRL", undefined, false);

        expect(out.taxRate).toBe(expectedRate);
        expect(out.netAmount).toBe(expectedNet);
        expect(out.withheldTax).toBe(input.grossAmount - expectedNet);
        expect(out.isJCP).toBe(false);
      }
    });

    it("records structured error when US asset is passed to BR dividend adapter", () => {
      const positions: TaxSimulationPositionInput[] = [
        { ticker: "AAPL", type: "STOCK_US", grossAmount: 100 },
      ];

      const result = simulateBrDividendTax(positions);
      expect(result.positions).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toEqual({
        ticker: "AAPL",
        code: "INCOMPATIBLE_JURISDICTION",
        message: "Ativo US incompatível com adaptador de dividendos BR",
      });
    });

    it("records structured error for invalid or negative amounts without throwing", () => {
      const positions: TaxSimulationPositionInput[] = [
        { ticker: "VALE3", type: "STOCK_BR", grossAmount: -50 },
        { ticker: "PETR4", type: "STOCK_BR", grossAmount: NaN },
      ];

      const result = simulateBrDividendTax(positions);
      expect(result.positions).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.[0].code).toBe("INVALID_AMOUNT");
      expect(result.errors?.[1].code).toBe("INVALID_AMOUNT");
    });
  });

  describe("simulateBrJcpTax (Brazilian Juros sobre Capital Próprio)", () => {
    it("matches SSOT netAfterTax and dividendTaxRate with 15% withholding tax", () => {
      const positions: TaxSimulationPositionInput[] = [
        { ticker: "BBDC4", type: "STOCK_BR", grossAmount: 1000 },
        { ticker: "ITUB4", type: "STOCK_BR", grossAmount: 2000 },
      ];

      const result = simulateBrJcpTax(positions, "2026-08-26");

      expect(result.jurisdiction).toBe("BR");
      expect(result.totalGross).toBe(3000);
      expect(result.totalNet).toBe(2550); // 3000 * 0.85
      expect(result.totalTax).toBe(450);  // 3000 * 0.15
      expect(result.effectiveTaxRate).toBe(JCP_TAX_RATE);

      // Verify each position matches direct SSOT calls with isJCP = true
      for (let i = 0; i < positions.length; i++) {
        const input = positions[i];
        const out = result.positions[i];
        const expectedRate = dividendTaxRate(input.type, "BRL", undefined, true);
        const expectedNet = netAfterTax(input.grossAmount, input.type, "BRL", undefined, true);

        expect(out.taxRate).toBe(expectedRate);
        expect(out.taxRate).toBe(0.15);
        expect(out.netAmount).toBe(expectedNet);
        expect(out.withheldTax).toBe(input.grossAmount * 0.15);
        expect(out.isJCP).toBe(true);
      }
    });

    it("records structured error when US asset is passed to BR JCP adapter", () => {
      const positions: TaxSimulationPositionInput[] = [
        { ticker: "O", type: "REIT", grossAmount: 100 },
      ];

      const result = simulateBrJcpTax(positions);
      expect(result.positions).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toEqual({
        ticker: "O",
        code: "INCOMPATIBLE_JURISDICTION",
        message: "Ativo US incompatível com adaptador de JCP BR",
      });
    });
  });

  describe("simulateUsWithholdingTax (US 30% Statutory Retained Tax)", () => {
    it("matches SSOT netAfterTax and dividendTaxRate with 30% withholding tax", () => {
      const positions: TaxSimulationPositionInput[] = [
        { ticker: "KO", type: "STOCK_US", grossAmount: 100 },
        { ticker: "O", type: "REIT", grossAmount: 200 },
        { ticker: "SCHD", type: "ETF", currency: "USD", grossAmount: 300 },
      ];

      const result = simulateUsWithholdingTax(positions, "2026-08-26");

      expect(result.jurisdiction).toBe("US");
      expect(result.totalGross).toBe(600);
      expect(result.totalNet).toBe(420); // 600 * 0.70
      expect(result.totalTax).toBe(180); // 600 * 0.30
      expect(result.effectiveTaxRate).toBe(US_DIVIDEND_TAX_RATE);

      // Verify each position matches direct SSOT calls
      for (let i = 0; i < positions.length; i++) {
        const input = positions[i];
        const out = result.positions[i];
        const currency = input.currency || "USD";
        const expectedRate = dividendTaxRate(input.type, currency, undefined, false);
        const expectedNet = netAfterTax(input.grossAmount, input.type, currency, undefined, false);

        expect(out.taxRate).toBe(expectedRate);
        expect(out.taxRate).toBe(0.3);
        expect(out.netAmount).toBe(expectedNet);
        expect(out.withheldTax).toBe(input.grossAmount * 0.3);
        expect(out.jurisdiction).toBe("US");
      }
    });

    it("records structured error when non-US asset is passed to US adapter", () => {
      const positions: TaxSimulationPositionInput[] = [
        { ticker: "BBAS3", type: "STOCK_BR", grossAmount: 500 },
        { ticker: "BOVA11", type: "ETF", currency: "BRL", grossAmount: 200 },
      ];

      const result = simulateUsWithholdingTax(positions);
      expect(result.positions).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.[0]).toEqual({
        ticker: "BBAS3",
        code: "INCOMPATIBLE_JURISDICTION",
        message: "Ativo não elegível para retenção US (não é STOCK_US, REIT ou ETF em USD)",
      });
      expect(result.errors?.[1]).toEqual({
        ticker: "BOVA11",
        code: "INCOMPATIBLE_JURISDICTION",
        message: "Ativo não elegível para retenção US (não é STOCK_US, REIT ou ETF em USD)",
      });
    });

    it("supports customTaxRate override through the SSOT", () => {
      const positions: TaxSimulationPositionInput[] = [
        { ticker: "TSM", type: "STOCK_US", grossAmount: 100, customTaxRate: 20 },
      ];

      const result = simulateUsWithholdingTax(positions);
      expect(result.positions[0].taxRate).toBe(0.2);
      expect(result.positions[0].netAmount).toBe(80);
      expect(result.positions[0].withheldTax).toBe(20);
      expect(result.effectiveTaxRate).toBe(0.2);
    });
  });

  describe("Purity & Idempotency", () => {
    it("produces identical outputs for identical inputs across consecutive calls", () => {
      const positions: TaxSimulationPositionInput[] = [
        { ticker: "BBAS3", type: "STOCK_BR", grossAmount: 500 },
      ];

      const res1 = simulateBrDividendTax(positions, "2026-08-26");
      const res2 = simulateBrDividendTax(positions, "2026-08-26");

      expect(res1).toEqual(res2);
    });
  });
});
