import type { Currency } from "../domain";

export type Locale = "en" | "ptBR" | "es";

const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "US$",
  BRL: "R$",
};

function currencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOL[currency] ?? currency;
}

export function formatCurrency(value: number, currency: Currency, locale: Locale): string {
  const l = locale === "en" ? "en-US" : locale === "ptBR" ? "pt-BR" : "es-ES";
  const num = new Intl.NumberFormat(l, {
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
  locale: Locale,
): string {
  const l = locale === "en" ? "en-US" : locale === "ptBR" ? "pt-BR" : "es-ES";
  const num = new Intl.NumberFormat(l, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(valueMillions * 1_000_000);
  return `${currencySymbol(currency)} ${num}`;
}
