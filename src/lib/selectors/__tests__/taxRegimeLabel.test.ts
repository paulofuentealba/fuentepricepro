import { describe, it, expect } from "vitest";
import { computeTaxRegimeKey } from "../taxRegimeLabel";

describe("computeTaxRegimeKey", () => {
  describe("Brazilian jurisdiction (BR)", () => {
    it("returns exemptStockBr for Brazilian stocks (Lei 9.249/95 Art. 10)", () => {
      expect(computeTaxRegimeKey("STOCK_BR", "BRL", "BR")).toBe("exemptStockBr");
    });

    it("returns exemptDividend for FII and FIAGRO (Lei 11.033)", () => {
      expect(computeTaxRegimeKey("FII", "BRL", "BR")).toBe("exemptDividend");
      expect(computeTaxRegimeKey("FIAGRO", "BRL", "BR")).toBe("exemptDividend");
    });

    it("returns exemptDouble for FII_INFRA (Lei 12.431)", () => {
      expect(computeTaxRegimeKey("FII_INFRA", "BRL", "BR")).toBe("exemptDouble");
    });

    it("returns whtCompensable for USD assets held by BR tax resident", () => {
      expect(computeTaxRegimeKey("STOCK_US", "USD", "BR")).toBe("whtCompensable");
      expect(computeTaxRegimeKey("REIT", "USD", "BR")).toBe("whtCompensable");
      expect(computeTaxRegimeKey("ETF", "USD", "BR")).toBe("whtCompensable");
    });
  });

  describe("US jurisdiction (US)", () => {
    it("returns usQualified for US stocks", () => {
      expect(computeTaxRegimeKey("STOCK_US", "USD", "US")).toBe("usQualified");
    });

    it("returns usReitQbi for REITs", () => {
      expect(computeTaxRegimeKey("REIT", "USD", "US")).toBe("usReitQbi");
    });

    it("returns usEtf for ETFs", () => {
      expect(computeTaxRegimeKey("ETF", "USD", "US")).toBe("usEtf");
    });

    it("returns foreignBr for Brazilian assets held by US tax resident", () => {
      expect(computeTaxRegimeKey("STOCK_BR", "BRL", "US")).toBe("foreignBr");
      expect(computeTaxRegimeKey("FII", "BRL", "US")).toBe("foreignBr");
    });
  });
});
