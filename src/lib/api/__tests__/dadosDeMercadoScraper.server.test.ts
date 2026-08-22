import { describe, it, expect } from "vitest";
import { escapeRegExp } from "../dadosDeMercadoScraper.server";

describe("dadosDeMercadoScraper - escapeRegExp & regex safety (Item 6)", () => {
  it("escapes all 14 regex special characters properly (individually and combined)", () => {
    const characters = [".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"];
    
    // 1. Verify each of the 14 characters individually
    for (const char of characters) {
      const escaped = escapeRegExp(char);
      expect(escaped).toBe(`\\${char}`);
      
      // Must compile to RegExp and match only the literal char
      const re = new RegExp(`^${escaped}$`);
      expect(re.test(char)).toBe(true);
      expect(re.test("a")).toBe(false);
    }

    // 2. Verify all 14 characters combined in a single string
    const specials = ".-*+?^${}()|[]\\";
    const escapedSpecials = escapeRegExp(specials);
    expect(escapedSpecials).toBe("\\.-\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
    const reSpecials = new RegExp(`^${escapedSpecials}$`);
    expect(reSpecials.test(".-*+?^${}()|[]\\")).toBe(true);
    expect(reSpecials.test("other")).toBe(false);
  });

  it("handles tickers and labels with regex characters without throwing SyntaxError or wildcard matching", () => {
    const rawTickers = ["TEST.11", "ABC+3", "FOO*4", "BAR?1", "VALE(3)", "PETR[4]", "MGLU^3", "ITUB$4"];

    for (const raw of rawTickers) {
      const escaped = escapeRegExp(raw);
      expect(() => new RegExp(`Histórico de dividendos de ${escaped}`)).not.toThrow();

      const regex = new RegExp(`Histórico de dividendos de ${escaped}`);
      expect(regex.test(`Histórico de dividendos de ${raw}`)).toBe(true);

      // Verify that '.' or other chars don't act as wildcards
      if (raw.includes(".")) {
        const falseMatch = raw.replace(".", "X");
        expect(regex.test(`Histórico de dividendos de ${falseMatch}`)).toBe(false);
      }
    }
  });

  it("safely escapes labels such as P/VP, P/L, and custom metric names", () => {
    const labels = ["P/VP", "P/L", "ROE (12M)", "Dividend Yield (%)", "EV/EBITDA [Adjusted]"];

    for (const label of labels) {
      const escaped = escapeRegExp(label);
      expect(() => new RegExp(`<tr>\\s*<td>\\s*${escaped}\\s*</td>`)).not.toThrow();
      const regex = new RegExp(`<tr>\\s*<td>\\s*${escaped}\\s*</td>`);
      expect(regex.test(`<tr> <td> ${label} </td>`)).toBe(true);
    }
  });
});
