import { describe, it, expect } from "vitest";
import {
  detectSchwab,
  parseSchwabTradeConfirmation,
  parseUsFloat,
  parseUsLongDateToDdMmYyyy,
} from "../schwabParser";
import { parseBrokerNote } from "../brokerNoteParser";

/**
 * Real reconstructed text (via the app's own reconstructRowsFromTextItems) from a genuine
 * Charles Schwab "Schwab One® International Account" Trade Confirmation PDF for a 5-share SCM
 * (Stellus Capital Investment Corp) purchase — the exact document that failed to import.
 */
const SCHWAB_PAGE_1 = `Schwab One® International Account   of
P DE OLIVEIRA FUENTEALBA
Account Number Trade Confirmation
4485-3419 August 21, 2026
Terms & Conditions
It is agreed between Charles Schwab & Co., Inc. ("Schwab") and the customer: (1) If you find any errors or omissions.
Charles Schwab & Co., Inc., 3000 Schwab Way, Westlake, TX 76262. Telephone: 800-435-4000.   www.schwab.com.
©2026 Charles Schwab & Co., Inc. All rights reserved. Member SIPC.`;

const SCHWAB_PAGE_2 = `Schwab One® International Account   of
P DE OLIVEIRA FUENTEALBA
Account Number Trade Confirmation Trade Confirmation
4485-3419 August 21, 2026 August 21, 2026
Total Trades   Total Purchases   Total Sales   Net Charges and/or Interest   Net Amount
1   ($43.00)   $0.00   $0.00   ($43.00)
Settle Symbol/ Charges/
Date   Action CUSIP   Description   Quantity   Price($)   Principal($) Interest($)   Amount($) Disclosure
08/24   Purchase   SCM STELLUS CAPITAL INVE   5   8.60   43.00   43.00   F3, A1
858568108
Disclosures Disclosures
A1   Schwab acted as your agent. F3   Payment Type: Margin.`;

const FULL_SCHWAB_DOCUMENT = `${SCHWAB_PAGE_1}\n${SCHWAB_PAGE_2}`;

describe("schwabParser", () => {
  describe("detectSchwab", () => {
    it("recognizes a Schwab document by its letterhead text", () => {
      expect(detectSchwab(FULL_SCHWAB_DOCUMENT)).toBe(true);
      expect(detectSchwab("XP INVESTIMENTOS CCTVM S.A.")).toBe(false);
    });
  });

  describe("parseUsFloat", () => {
    it("parses US-convention numbers (comma thousands, dot decimal)", () => {
      expect(parseUsFloat("43.00")).toBe(43);
      expect(parseUsFloat("1,234.56")).toBe(1234.56);
      expect(parseUsFloat("8.60")).toBe(8.6);
    });
  });

  describe("parseUsLongDateToDdMmYyyy", () => {
    it("converts a long-form US date to DD/MM/YYYY", () => {
      expect(parseUsLongDateToDdMmYyyy("August 21, 2026")).toBe("21/08/2026");
      expect(parseUsLongDateToDdMmYyyy("January 1, 2025")).toBe("01/01/2025");
    });
  });

  describe("parseSchwabTradeConfirmation", () => {
    it("extracts the SCM purchase from the real reconstructed document text", () => {
      const { trades, unresolvedTrades } = parseSchwabTradeConfirmation(FULL_SCHWAB_DOCUMENT);

      expect(unresolvedTrades).toHaveLength(0);
      expect(trades).toHaveLength(1);
      expect(trades[0]).toEqual({
        ticker: "SCM",
        quantity: 5,
        price: 8.6,
        date: "21/08/2026",
        type: "buy",
        fees: undefined,
      });
    });

    it("never mistakes the trailing disclosure codes (F3, A1) for numeric columns", () => {
      const { trades } = parseSchwabTradeConfirmation(FULL_SCHWAB_DOCUMENT);
      // If the disclosure codes leaked into the number scan, quantity/price would be corrupted.
      expect(trades[0].quantity).toBe(5);
      expect(trades[0].price).toBe(8.6);
    });

    it("captures an explicit Charges/Interest amount as fees when the column is populated", () => {
      const withFee = `08/24   Purchase   SCM STELLUS CAPITAL INVE   5   8.60   43.00   1.50   44.50   F3, A1`;
      const { trades } = parseSchwabTradeConfirmation(`August 21, 2026\n${withFee}`);
      expect(trades[0].fees).toBe(1.5);
    });

    it("marks a Sale action as a sell trade", () => {
      const sellRow = `08/24   Sale   SCM STELLUS CAPITAL INVE   5   9.00   45.00   45.00   F3, A1`;
      const { trades } = parseSchwabTradeConfirmation(`August 21, 2026\n${sellRow}`);
      expect(trades[0].type).toBe("sell");
    });
  });
});

describe("parseBrokerNote: international dispatch", () => {
  it("routes a Schwab document to the Schwab parser instead of the B3 SINACOR parser", () => {
    const result = parseBrokerNote(FULL_SCHWAB_DOCUMENT, "AUTO");
    expect(result.success).toBe(true);
    expect(result.broker).toBe("SCHWAB");
    expect(result.trades).toHaveLength(1);
    expect(result.trades?.[0].ticker).toBe("SCM");
  });
});
