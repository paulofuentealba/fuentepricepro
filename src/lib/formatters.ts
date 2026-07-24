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

export function formatPercent(value: number, locale: Locale, digits = 2): string {
  const l = locale === "en" ? "en-US" : locale === "ptBR" ? "pt-BR" : "es-ES";
  return new Intl.NumberFormat(l, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 100);
}

export function formatNumber(value: number, locale: Locale, digits = 2): string {
  const l = locale === "en" ? "en-US" : locale === "ptBR" ? "pt-BR" : "es-ES";
  return new Intl.NumberFormat(l, {
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
  return ticker;
}

export function displayTicker(ticker: string): string {
  if (!ticker) return "";
  return ticker.replace(/\.[A-Z]+$/i, "");
}
