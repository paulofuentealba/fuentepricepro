import type { TradeRecord, UnresolvedTradeRecord } from "./b3Parser";

/**
 * Parser for Charles Schwab International Account "Trade Confirmation" PDFs — the first
 * non-Brazilian broker supported by the import flow. Unlike B3 SINACOR notes, Schwab prints the
 * exact ticker symbol directly in the trade row (no issuer-name matching needed), so this parser
 * never produces unresolvedTrades.
 *
 * Row shape observed (after row-reconstruction, `reconstructRowsFromTextItems`):
 *   "08/24   Purchase   SCM STELLUS CAPITAL INVE   5   8.60   43.00   43.00   F3, A1"
 *   SettleDate Action Symbol Description... Quantity Price($) Principal($) [Charges/Interest($)] Amount($) Disclosure
 * The CUSIP prints on its own line below the symbol (different Y baseline) and is ignored.
 */

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** Parses a Schwab-format numeric string (US convention: ',' thousands, '.' decimal). */
export function parseUsFloat(value: string): number {
  if (!value) throw new Error("Invalid value");
  const clean = value.replace(/,/g, "");
  const num = parseFloat(clean);
  if (isNaN(num)) throw new Error("Not a number");
  return num;
}

/** Converts "August 21, 2026" to "21/08/2026" — the DD/MM/YYYY format parseDdMmYyyyToTimestamp
 * (brokerNoteImport.ts, shared across all brokers) already expects. */
export function parseUsLongDateToDdMmYyyy(raw: string): string | null {
  const m = raw.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

export function detectSchwab(rawText: string): boolean {
  return /charles schwab/i.test(rawText) || /schwab one/i.test(rawText);
}

const TRADE_ROW = /^\d{2}\/\d{2}\s+(Purchase|Sale|Bought|Sold)\s+([A-Z]{1,6}(?:\.[A-Z]{1,2})?)\s+(.+)$/;

/**
 * Extracts whitespace-delimited numeric tokens from a row remainder, deliberately excluding
 * digits embedded in adjacent letters (e.g. the "F3, A1" disclosure codes trailing the row) via
 * whitespace lookaround — a bare `\d+` scan would otherwise pick up the "3" inside "F3".
 */
function extractNumbers(text: string): string[] {
  const padded = ` ${text} `;
  return padded.match(/(?<=\s)\d{1,3}(?:,\d{3})*(?:\.\d+)?(?=\s|$)/g) || [];
}

export function parseSchwabTradeConfirmation(rawText: string): {
  trades: TradeRecord[];
  unresolvedTrades: UnresolvedTradeRecord[];
} {
  const trades: TradeRecord[] = [];

  const dateMatch = rawText.match(/([A-Za-z]+ \d{1,2}, \d{4})/);
  const tradeDate = dateMatch ? parseUsLongDateToDdMmYyyy(dateMatch[1]) : null;

  for (const line of rawText.split("\n")) {
    const m = line.trim().match(TRADE_ROW);
    if (!m) continue;

    const [, actionRaw, symbol, rest] = m;
    const type: "buy" | "sell" = /purchase|bought/i.test(actionRaw) ? "buy" : "sell";

    const numbers = extractNumbers(rest);
    // Quantity, Price, Principal are always present; Charges/Interest is only present (as a 4th
    // number before Amount) when the broker actually charged something — most Schwab online
    // equity trades are $0 commission, so a 3-number row (Amount === Principal) is the common
    // case, not a parse failure.
    if (numbers.length < 4) continue;

    try {
      const quantity = parseUsFloat(numbers[0]);
      const price = parseUsFloat(numbers[1]);
      const amount = parseUsFloat(numbers[numbers.length - 1]);
      const principal = parseUsFloat(numbers[2]);
      const fees = numbers.length >= 5 ? parseUsFloat(numbers[3]) : 0;

      if (quantity <= 0 || price <= 0) continue;
      void amount;
      void principal;

      trades.push({
        ticker: symbol.toUpperCase(),
        quantity,
        price,
        date: tradeDate || "Unknown",
        type,
        fees: fees > 0 ? fees : undefined,
      });
    } catch {
      // Malformed numeric token on this row — skip it rather than abort the whole document.
      continue;
    }
  }

  return { trades, unresolvedTrades: [] };
}
