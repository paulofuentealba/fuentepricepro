/**
 * Canonical ticker normalization: trims whitespace, uppercases, and strips
 * the ".SA" B3 suffix. This is the SSOT for ticker identity used to key
 * caches, compare tickers across providers, and classify B3 assets — import
 * this instead of reimplementing `.toUpperCase().replace(/\.SA$/, "")`.
 */
export function normalizeTicker(ticker: string): string {
  return (ticker || "").trim().toUpperCase().replace(/\.SA$/, "");
}
