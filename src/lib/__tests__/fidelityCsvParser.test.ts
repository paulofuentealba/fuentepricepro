import { describe, it, expect } from "vitest";
import { parseFile, matchColumn, parseOperationType } from "../dynamicCsvParser";
import { parseWatchlistCsv } from "../csv";

describe("Fidelity CSV Parser & Ingestion (Etapa 1)", () => {
  describe("Fidelity Activity / History CSV", () => {
    const fidelityActivityHeaders = [
      "Run Date",
      "Action",
      "Symbol",
      "Description",
      "Type",
      "Quantity",
      "Price ($)",
      "Commission ($)",
      "Fees ($)",
      "Accrued Interest ($)",
      "Amount ($)",
      "Cash Balance ($)",
      "Settlement Date",
    ];

    it("1. automatically maps Fidelity Activity columns with high confidence", () => {
      const mapping = matchColumn(fidelityActivityHeaders);
      expect(mapping.ticker.sourceHeader).toBe("Symbol");
      expect(mapping.operationType.sourceHeader).toBe("Action");
      expect(mapping.quantity.sourceHeader).toBe("Quantity");
      expect(mapping.price.sourceHeader).toBe("Price ($)");
      expect(mapping.costs.sourceHeader).toBe("Commission ($)");
      expect(mapping.date.sourceHeader).toBe("Run Date");
    });

    it("2. correctly parses Fidelity Action strings into BUY or SELL without fallback errors", () => {
      expect(parseOperationType("YOU BOUGHT")).toEqual({ type: "BUY", isFallback: false });
      expect(parseOperationType("YOU BOUGHT OPENING TRANSACTION")).toEqual({ type: "BUY", isFallback: false });
      expect(parseOperationType("BOUGHT")).toEqual({ type: "BUY", isFallback: false });
      expect(parseOperationType("REINVESTMENT")).toEqual({ type: "BUY", isFallback: false });
      expect(parseOperationType("YOU SOLD")).toEqual({ type: "SELL", isFallback: false });
      expect(parseOperationType("YOU SOLD CLOSING TRANSACTION")).toEqual({ type: "SELL", isFallback: false });
      expect(parseOperationType("SOLD")).toEqual({ type: "SELL", isFallback: false });
    });

    it("3. parses a full Fidelity Activity CSV dataset with fractional shares and skips trailing disclaimers", () => {
      const rows: unknown[][] = [
        ["03/01/2026", "YOU BOUGHT", "AAPL", "APPLE INC", "Cash", "15.428", "240.50", "0.00", "0.00", "", "-3710.43", "1250.00", "03/03/2026"],
        ["03/02/2026", "REINVESTMENT", "O", "REALTY INCOME CORP", "Cash", "2.115", "53.20", "0.00", "0.00", "", "-112.52", "1137.48", "03/04/2026"],
        ["03/05/2026", "YOU SOLD", "MSFT", "MICROSOFT CORP", "Cash", "5.000", "415.00", "0.00", "0.03", "", "+2074.97", "3212.45", "03/07/2026"],
        ["03/06/2026", "DIVIDEND RECEIVED", "O", "REALTY INCOME CORP", "Cash", "", "", "", "", "", "+112.52", "3324.97", ""],
        ["", "", "", "The data and information contained herein is not intended to be...", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "Brokerage services provided by Fidelity Brokerage Services LLC...", "", "", "", "", "", "", "", "", ""],
      ];

      const result = parseFile(rows, fidelityActivityHeaders);

      // Should have extracted exactly 3 share transactions
      expect(result.transactions.length).toBe(3);

      // Row 1: AAPL Buy (fractional shares)
      expect(result.transactions[0].ticker).toBe("AAPL");
      expect(result.transactions[0].type).toBe("BUY");
      expect(result.transactions[0].quantity).toBe(15.428);
      expect(result.transactions[0].price).toBe(240.5);
      expect(result.transactions[0].isFallbackType).toBe(false);

      // Row 2: O Reinvestment (DRIP)
      expect(result.transactions[1].ticker).toBe("O");
      expect(result.transactions[1].type).toBe("BUY");
      expect(result.transactions[1].quantity).toBe(2.115);
      expect(result.transactions[1].price).toBe(53.2);
      expect(result.transactions[1].isFallbackType).toBe(false);

      // Row 3: MSFT Sell
      expect(result.transactions[2].ticker).toBe("MSFT");
      expect(result.transactions[2].type).toBe("SELL");
      expect(result.transactions[2].quantity).toBe(5);
      expect(result.transactions[2].price).toBe(415);
      expect(result.transactions[2].costs).toBe(0.03);
      expect(result.transactions[2].isFallbackType).toBe(false);

      // Dividend and disclaimers safely categorized in ignored without crashing
      expect(result.ignored.length).toBe(3);
    });
  });

  describe("Fidelity Positions CSV (Snapshot)", () => {
    it("4. parses a Fidelity Portfolio Positions CSV with Cost Basis Per Share and fractional shares", () => {
      const fidelityPositionsCsv = [
        "Account Name/Number,Symbol,Description,Quantity,Last Price,Last Price Change,Current Value,Today's Gain/Loss Dollar,Today's Gain/Loss Percent,Total Gain/Loss Dollar,Total Gain/Loss Percent,Cost Basis Per Share,Cost Basis Total,Type",
        'Individual - Z12345678,AAPL,APPLE INC,25.500,$242.10,+$1.25,"$6,173.55",+$31.88,+0.52%,+$825.10,+15.42%,$209.74,"$5,348.45",Cash',
        'Individual - Z12345678,O,REALTY INCOME CORP,100.250,$54.20,-$0.30,"$5,433.55",-$30.08,-0.55%,+$420.00,+8.40%,$50.00,"$5,012.50",Cash',
        'Individual - Z12345678,SCHD,SCHWAB US DIVIDEND EQUITY ETF,50.000,$28.40,+$0.10,"$1,420.00",+$5.00,+0.35%,+$120.00,+9.23%,$26.00,"$1,300.00",Cash',
        'Individual - Z12345678,Pending Activity,,,,,,,,,,,""',
        '"The data and information contained herein is not intended to be..."',
      ].join("\n");

      const rows = parseWatchlistCsv(fidelityPositionsCsv);

      expect(rows.length).toBe(3);

      expect(rows[0].ticker).toBe("AAPL");
      expect(rows[0].quantity).toBe(25.5);
      expect(rows[0].averagePrice).toBe(209.74);

      expect(rows[1].ticker).toBe("O");
      expect(rows[1].quantity).toBe(100.25);
      expect(rows[1].averagePrice).toBe(50.0);

      expect(rows[2].ticker).toBe("SCHD");
      expect(rows[2].quantity).toBe(50);
      expect(rows[2].averagePrice).toBe(26.0);
    });
  });
});
