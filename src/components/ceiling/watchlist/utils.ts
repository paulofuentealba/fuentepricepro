import type { Currency } from "@/lib/domain";
import { toIntlLocale, type Locale } from "@/lib/i18n";

export function flagFor(currency: Currency): string {
  return currency === "USD" ? "US" : "BR";
}

export function formatExDate(iso: string, locale: Locale): string | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  if (d.getTime() <= Date.now()) return null;
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
