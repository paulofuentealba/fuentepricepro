import { describe, it, expect } from "vitest";
import { getDividendTypeLabel } from "../dividendLabel";
import { ptBR } from "../i18n/dict.ptBR";
import { en } from "../i18n/dict.en";
import { es } from "../i18n/dict.es";

describe("getDividendTypeLabel", () => {
  it("returns JCP for JCP events regardless of asset class", () => {
    expect(getDividendTypeLabel("STOCK_BR", true, ptBR)).toBe("JCP");
    expect(getDividendTypeLabel("STOCK_BR", true, en)).toBe("JCP");
    expect(getDividendTypeLabel("STOCK_BR", true, es)).toBe("JCP");
  });

  it("returns Rendimento for FIIs, FII_INFRA and FIAGRO", () => {
    expect(getDividendTypeLabel("FII", false, ptBR)).toBe("Rendimento");
    expect(getDividendTypeLabel("FII_INFRA", false, ptBR)).toBe("Rendimento");
    expect(getDividendTypeLabel("FIAGRO", false, ptBR)).toBe("Rendimento");

    expect(getDividendTypeLabel("FII", false, en)).toBe("Income");
    expect(getDividendTypeLabel("FII", false, es)).toBe("Rendimiento");
  });

  it("returns Distribuição for ETFs", () => {
    expect(getDividendTypeLabel("ETF", false, ptBR)).toBe("Distribuição");
    expect(getDividendTypeLabel("ETF", false, en)).toBe("Distribution");
    expect(getDividendTypeLabel("ETF", false, es)).toBe("Distribución");
  });

  it("returns Dividendo for STOCK_BR and STOCK_US and REITs", () => {
    expect(getDividendTypeLabel("STOCK_BR", false, ptBR)).toBe("Dividendo");
    expect(getDividendTypeLabel("STOCK_US", false, ptBR)).toBe("Dividendo");
    expect(getDividendTypeLabel("REIT", false, ptBR)).toBe("Dividendo");

    expect(getDividendTypeLabel("STOCK_BR", false, en)).toBe("Dividend");
    expect(getDividendTypeLabel("STOCK_US", false, en)).toBe("Dividend");
    expect(getDividendTypeLabel("REIT", false, en)).toBe("Dividend");
  });
});
