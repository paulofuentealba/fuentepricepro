import { describe, it, expect } from "vitest";
import { classifyBr, B3_STOCK_UNIT_PREFIXES, getShareClassBadge } from "../classify";

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

  it("classifies BDR-of-ETF tickers (suffix 39) as ETF in fallback mode, without apiType — regression for Auditoria UX 1.3 / BIVB39", () => {
    // Before the fix, classifyBr("BIVB39") with no apiType fell through to the generic
    // STOCK_BR default (same bug family as the .SA-before-REIT ordering bug from Prompt 86).
    expect(classifyBr("BIVB39")).toBe("ETF");
    expect(classifyBr("BIVB39.SA")).toBe("ETF");
  });

  it("checks the '39' suffix BEFORE the '11' fallback, so the two never collide (order regression)", () => {
    // No real B3 ticker is both, but this locks in that the suffix checks are independent
    // ifs, not an if/else chain that could accidentally shadow one another later.
    expect(classifyBr("BIVB39")).toBe("ETF");
    expect(classifyBr("HGLG11")).toBe("FII");
  });

  it("documents known fallback gaps NOT fixed in this round (Prompt 93 scope: suffix 39 only)", () => {
    // BDR-of-stock (34/35) without apiType still falls through to STOCK_BR — relies on
    // apiType === "bdr" from the API, same as before this round. Verified, not fixed here.
    expect(classifyBr("AAPL34")).toBe("STOCK_BR");
    expect(classifyBr("AAPL35")).toBe("STOCK_BR");

    // A genuine ETF ending in "11" without apiType still reads as FII — pre-existing,
    // documented tradeoff of the "ends with 11" fallback heuristic, unchanged here.
    expect(classifyBr("IVVB11")).toBe("FII");
    expect(classifyBr("BOVA11")).toBe("FII");
  });
});

describe("getShareClassBadge", () => {
  it("returns correct share class badges for B3 tickers", () => {
    expect(getShareClassBadge("VALE3")?.label).toBe("ON");
    expect(getShareClassBadge("PETR4")?.label).toBe("PN");
    expect(getShareClassBadge("TAEE11", "STOCK_BR")?.label).toBe("UNIT");
    expect(getShareClassBadge("AAPL34")?.label).toBe("BDR");
    expect(getShareClassBadge("VALE3F")?.label).toBe("Fracionário");
  });

  it("uses distinct --chart-1..--chart-5 design tokens for each share class, never raw Tailwind palette colors", () => {
    const cases: { ticker: string; type?: string; label: string; expectedToken: string }[] = [
      { ticker: "AAPL34", label: "BDR", expectedToken: "chart-1" },
      { ticker: "TAEE11", type: "STOCK_BR", label: "UNIT", expectedToken: "chart-2" },
      { ticker: "VALE3F", label: "Fracionário", expectedToken: "chart-3" },
      { ticker: "VALE3", label: "ON", expectedToken: "chart-4" },
      { ticker: "PETR4", label: "PN", expectedToken: "chart-5" },
    ];

    const usedTokens = new Set<string>();

    for (const { ticker, type, label, expectedToken } of cases) {
      const badge = getShareClassBadge(ticker, type);
      expect(badge?.label).toBe(label);
      expect(badge?.className).toContain(`chart-${expectedToken.split("-")[1]}`);
      // Must reference the semantic token, never a raw Tailwind palette color.
      expect(badge?.className).not.toMatch(
        /\b(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/,
      );
      usedTokens.add(expectedToken);
    }

    // All 5 badges must map to 5 distinct chart tokens (chart-1..chart-5).
    expect(usedTokens.size).toBe(5);
    expect([...usedTokens].sort()).toEqual(["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]);
  });
});
