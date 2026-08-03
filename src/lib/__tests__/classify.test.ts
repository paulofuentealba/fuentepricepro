import { describe, it, expect } from "vitest";
import { classifyBr, B3_STOCK_UNIT_PREFIXES } from "../classify";

describe("classifyBr", () => {
  it("classifies all known B3 stock units (ending in 11) as STOCK_BR in fallback mode", () => {
    for (const prefix of B3_STOCK_UNIT_PREFIXES) {
      const ticker = `${prefix}11`;
      expect(classifyBr(ticker)).toBe("STOCK_BR");
      expect(classifyBr(`${ticker}.SA`)).toBe("STOCK_BR");
    }
  });

  it("classifies actual FIIs and non-unit tickers ending in 11 as FII in fallback mode", () => {
    const realFiis = ["HGLG11", "MXRF11", "KNRI11", "VISC11", "XPLG11", "BTLG11", "ALZR11"];
    for (const fii of realFiis) {
      expect(classifyBr(fii)).toBe("FII");
      expect(classifyBr(`${fii}.SA`)).toBe("FII");
    }

    // Tickers that never issued stock units (e.g. RPMG, ELET, SOMA, PARD, ALPK, ALLD) must NOT be in B3_STOCK_UNIT_PREFIXES
    const falseUnitTickers = ["RPMG11", "ELET11", "SOMA11", "PARD11", "ALPK11", "ALLD11"];
    for (const falseTicker of falseUnitTickers) {
      expect(classifyBr(falseTicker)).toBe("FII");
    }
  });


  it("classifies standard stocks ending in numbers other than 11 as STOCK_BR", () => {
    expect(classifyBr("PETR4")).toBe("STOCK_BR");
    expect(classifyBr("VALE3")).toBe("STOCK_BR");
    expect(classifyBr("BBAS3")).toBe("STOCK_BR");
  });

  it("prioritizes apiType when present over the fallback heuristic", () => {
    // If apiType says fund/fii, even a known stock unit prefix gets classified as FII
    expect(classifyBr("TAEE11", "fii")).toBe("FII");
    expect(classifyBr("TAEE11", "fund")).toBe("FII");

    // If apiType says stock/equity, even a real FII ticker gets classified as STOCK_BR
    expect(classifyBr("HGLG11", "stock")).toBe("STOCK_BR");
    expect(classifyBr("HGLG11", "equity")).toBe("STOCK_BR");

    // ETF & BDR apiType mappings
    expect(classifyBr("BOVA11", "etf")).toBe("ETF");
    expect(classifyBr("AAPL34", "bdr")).toBe("STOCK_US");
  });
});
