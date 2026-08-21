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

/**
 * Formata uma duração em meses como "X anos e Y meses" (pt-BR).
 *
 * - `months <= 0` -> "" (nada a formatar; caller decide o texto de "atingido").
 * - `!Number.isFinite(months)` -> "" (nunca imprime "Infinity anos").
 * - Singular/plural tratado ("1 ano" vs "2 anos", "1 mês" vs "2 meses").
 * - Quando só há anos (ou só meses), omite a parte zerada em vez de "0 meses".
 */
export function formatMonthsAsYearsMonths(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return "";

  const totalMonths = Math.round(months);
  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  if (remainingMonths > 0) {
    parts.push(`${remainingMonths} ${remainingMonths === 1 ? "mês" : "meses"}`);
  }

  if (parts.length === 0) return "menos de 1 mês";
  return parts.join(" e ");
}

/**
 * Converte uma data para string no formato ISO 'YYYY-MM-DD' usando os componentes
 * de calendário LOCAL (ano, mês, dia), prevenindo o desvio/skew de UTC de toISOString().
 *
 * Exemplo: às 22h00 em GMT-3 do dia 2026-08-21:
 * - new Date().toISOString().split("T")[0] -> "2026-08-22" (ERRADO / UTC)
 * - getLocalDateISOString(new Date())      -> "2026-08-21" (CORRETO / Local)
 */
export function getLocalDateISOString(input?: Date | number | string | null): string {
  if (input === null || input === undefined || input === "") {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

