import { describe, it, expect } from "vitest";
import { classifyYahoo } from "../classify.server";

describe("classifyYahoo (regression — .SA suffix must be checked BEFORE the REIT name regex)", () => {
  it("classifies Brazilian FII tickers (.SA suffix) as FII, never REIT — even when the name matches the US REIT regex", () => {
    expect(classifyYahoo({ symbol: "HGLG11.SA", longname: "CSHG Logística Fundo de Investimento Imobiliário" })).toBe(
      "FII",
    );
    expect(classifyYahoo({ symbol: "KNCR11.SA", longname: "Kinea Rendimentos Imobiliários Fundo de Investimento" })).toBe(
      "FII",
    );
  });

  it("classifies a Brazilian stock (.SA suffix, not ending in 11) as STOCK_BR via classifyBr fallback", () => {
    expect(classifyYahoo({ symbol: "O.SA" })).toBe("STOCK_BR");
  });

  it("classifies a US ticker without .SA whose name matches the REIT regex as REIT", () => {
    expect(classifyYahoo({ symbol: "O", longname: "Realty Income Corporation" })).toBe("REIT");
  });

  it("classifies ETFs and mutual funds regardless of ticker suffix", () => {
    expect(classifyYahoo({ symbol: "BOVA11.SA", quoteType: "ETF" })).toBe("ETF");
    expect(classifyYahoo({ symbol: "SCHD", quoteType: "ETF" })).toBe("ETF");
  });

  it("falls back to STOCK_US for a plain US ticker with no REIT signal in the name", () => {
    expect(classifyYahoo({ symbol: "AAPL", longname: "Apple Inc." })).toBe("STOCK_US");
  });
});
