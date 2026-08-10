import { describe, expect, it } from "vitest";
import { formatYahooTicker } from "../apiService.functions";

describe("formatYahooTicker (Item 1.7 Phase 4)", () => {
  it("1. appends .SA suffix to Brazilian stock tickers missing .SA", () => {
    expect(formatYahooTicker("PETR4")).toBe("PETR4.SA");
    expect(formatYahooTicker("VALE3")).toBe("VALE3.SA");
    expect(formatYahooTicker("BBAS3")).toBe("BBAS3.SA");
    expect(formatYahooTicker("TAEE11")).toBe("TAEE11.SA");
  });

  it("2. preserves Brazilian stock tickers that already have .SA without duplicating", () => {
    expect(formatYahooTicker("PETR4.SA")).toBe("PETR4.SA");
    expect(formatYahooTicker("VALE3.SA")).toBe("VALE3.SA");
    expect(formatYahooTicker("vale3.sa")).toBe("VALE3.SA");
  });

  it("3. preserves US tickers and index symbols without adding .SA", () => {
    expect(formatYahooTicker("AAPL")).toBe("AAPL");
    expect(formatYahooTicker("MSFT")).toBe("MSFT");
    expect(formatYahooTicker("O")).toBe("O");
    expect(formatYahooTicker("VYM")).toBe("VYM");
    expect(formatYahooTicker("^GSPC")).toBe("^GSPC");
    expect(formatYahooTicker("^BVSP")).toBe("^BVSP");
  });

  it("4. normalizes lowercase tickers and handles surrounding whitespace", () => {
    expect(formatYahooTicker(" aapl ")).toBe("AAPL");
    expect(formatYahooTicker(" petr4 ")).toBe("PETR4.SA");
    expect(formatYahooTicker(" msft ")).toBe("MSFT");
  });

  it("5. returns empty string for empty or invalid input without throwing exceptions", () => {
    expect(formatYahooTicker("")).toBe("");
    expect(formatYahooTicker("   ")).toBe("");
    expect(formatYahooTicker(null as any)).toBe("");
    expect(formatYahooTicker(undefined as any)).toBe("");
  });
});
