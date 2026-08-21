import type { Currency } from "@/lib/domain";
import { toIntlLocale, type Locale } from "@/lib/i18n";
import { getLocalDateISOString } from "@/lib/formatters";

export function flagFor(currency: Currency): string {
  return currency === "USD" ? "US" : "BR";
}

export function formatExDate(iso: string, locale: Locale): string | null {
  if (!iso) return null;
  const targetISO = getLocalDateISOString(iso);
  if (!targetISO) return null;
  const todayISO = getLocalDateISOString();
  if (targetISO < todayISO) return null;

  const [year, month, day] = targetISO.split("-").map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0);

  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "2-digit",
    month: "short",
  }).format(d);
}

export interface AssetMeta {
  exDividendDate: string | null;
  dividendCagr5y: number | null;
  eps: number | null;
  bvps: number | null;
  pbRatio: number | null;
  sector: string | null;
  canonicalDividend3y: number | null;
  currentPrice: number | null;
}
