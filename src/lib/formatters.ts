import type { Currency } from "./domain";

export type Locale = "en" | "ptBR" | "es";

const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "US$",
  BRL: "R$",
};

function currencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOL[currency] ?? currency;
}

export function formatCurrency(value: number, currency: Currency, _locale: Locale): string {
  // Override locale based on currency to strictly enforce correct formatting ($ vs R$)
  const forcedLocale = currency === "USD" ? "en-US" : "pt-BR";
  const num = new Intl.NumberFormat(forcedLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currencySymbol(currency)} ${num}`;
}

export function toIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR";
}

export function formatPercent(value: number, locale: Locale, digits = 2): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 100);
}

export function formatNumber(value: number, locale: Locale, digits = 2): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCompactCurrency(
  valueMillions: number,
  currency: Currency,
  _locale: Locale,
): string {
  const forcedLocale = currency === "USD" ? "en-US" : "pt-BR";
  const num = new Intl.NumberFormat(forcedLocale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(valueMillions * 1_000_000);
  return `${currencySymbol(currency)} ${num}`;
}

export function cleanTicker(ticker: string): string {
  if (!ticker) return "";
  // Strip Yahoo Finance market-suffix notation (e.g. "PETR4.SA" -> "PETR4",
  // "AAPL34.SA" -> "AAPL34"). This used to be a no-op, which let any
  // Brazilian ticker resolved via the Yahoo .SA fallback path in
  // fetchAssetFn leak the suffix into storage and every screen that
  // displays item.ticker. Applied on every load (rowToItem/readLocal in
  // watchlist.ts), so previously-saved ".SA" tickers self-heal on next load.
  return ticker.trim().toUpperCase().replace(/\.[A-Z]+$/i, "");
}

export function displayTicker(ticker: string): string {
  // Kept as an alias for cleanTicker to avoid drift between the two — they
  // used to implement the same suffix-stripping logic twice, out of sync.
  return cleanTicker(ticker);
}
