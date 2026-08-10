import { describe, it, expect } from "vitest";
import { buildComparatorCsv, type ComparatorExportRow } from "../csv";
import { formatYahooTicker } from "../apiService.functions";

describe("buildComparatorCsv (Item 1.7 Phase 2)", () => {
  it("should build CSV with correct headers, 2 rows, and empty cells for null values", () => {
    const rows: ComparatorExportRow[] = [
      {
        ticker: "VALE3",
        name: "Vale S.A.",
        type: "STOCK_BR",
        currentPrice: 60.5,
        ceilingPrice: 83.33,
        safetyMargin: 37.74,
        dividendYield: 8.26,
        cagr5y: 12.5,
        peRatio: 5.4,
        pbRatio: 1.2,
        bazin: 75.0,
        graham: 92.1,
        gordon: 83.33,
        consensus: 83.33,
      },
      {
        ticker: "PETR4",
        name: "Petróleo Brasileiro S.A.",
        type: "STOCK_BR",
        currentPrice: 38.0,
        ceilingPrice: null, // Null value test case
        safetyMargin: null, // Null value test case
        dividendYield: 14.2,
        cagr5y: null,
        peRatio: 3.8,
        pbRatio: 1.1,
        bazin: 45.0,
        graham: null,
        gordon: null,
        consensus: 45.0,
      },
    ];

    const csv = buildComparatorCsv(rows);
    const lines = csv.split("\n");

    // Verify Header
    expect(lines[0]).toBe(
      "Ticker,Nome,Tipo,Preço Atual,Preço Teto,Margem de Segurança (%),Dividend Yield (%),CAGR 5A (%),P/L,P/VP,Bazin,Graham,Gordon,Consenso",
    );

    // Verify total line count (header + 2 rows)
    expect(lines).toHaveLength(3);

    // Verify first row complete values
    expect(lines[1]).toBe(
      "VALE3,Vale S.A.,STOCK_BR,60.5,83.33,37.74,8.26,12.5,5.4,1.2,75,92.1,83.33,83.33",
    );

    // Verify second row empty cells for null values
    expect(lines[2]).toBe(
      "PETR4,Petróleo Brasileiro S.A.,STOCK_BR,38,,,14.2,,3.8,1.1,45,,,45",
    );
  });

  describe("formatYahooTicker (Item 1.7 Phase 4)", () => {
    it("appends .SA suffix to Brazilian stock tickers missing .SA", () => {
      expect(formatYahooTicker("PETR4")).toBe("PETR4.SA");
      expect(formatYahooTicker("VALE3")).toBe("VALE3.SA");
      expect(formatYahooTicker("BBAS3")).toBe("BBAS3.SA");
      expect(formatYahooTicker("TAEE11")).toBe("TAEE11.SA");
    });

    it("preserves Brazilian stock tickers that already have .SA", () => {
      expect(formatYahooTicker("PETR4.SA")).toBe("PETR4.SA");
      expect(formatYahooTicker("vale3.sa")).toBe("VALE3.SA");
    });

    it("preserves US tickers and custom symbols without adding .SA", () => {
      expect(formatYahooTicker("AAPL")).toBe("AAPL");
      expect(formatYahooTicker("MSFT")).toBe("MSFT");
      expect(formatYahooTicker("O")).toBe("O");
      expect(formatYahooTicker("VYM")).toBe("VYM");
      expect(formatYahooTicker("^GSPC")).toBe("^GSPC");
      expect(formatYahooTicker("^BVSP")).toBe("^BVSP");
    });
  });
});
