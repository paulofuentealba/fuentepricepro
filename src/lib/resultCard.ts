import type { Asset } from "@/lib/domain";
import { getCanonicalAnnualDividend } from "@/lib/calculations";
import { formatCurrency, formatPercent, toIntlLocale, type Locale } from "@/lib/i18n";

export type Timeframe = 1 | 3 | 5;
export const TIMEFRAMES: Timeframe[] = [1, 3, 5];

export function computeAvgDividend(asset: Asset, timeframe: Timeframe) {
  const history = (asset.dividendHistory ?? []).filter((p) => Number.isFinite(p.amount));
  const sorted = [...history].sort((a, b) => b.year - a.year);
  const available = TIMEFRAMES.filter((n) => sorted.length >= n);
  if (!available.includes(3)) available.push(3);
  available.sort((a, b) => a - b);

  return {
    avg: getCanonicalAnnualDividend(asset, timeframe),
    availableTimeframes: available,
  };
}

export function formatResultDate(iso: string, locale: Locale): string | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function buildResultShareText(
  displayTicker: string,
  ceiling: number,
  currency: Asset["currency"],
  yocPct: number | null,
  locale: Locale,
): string {
  return `Just analyzed ${displayTicker} on Fuente Price Pro! 🚀 \nCeiling Price: ${formatCurrency(
    ceiling,
    currency,
    locale,
  )} | Projected YoC: ${yocPct ? formatPercent(yocPct, locale, 2) : "—"}. \nCheck your portfolio strategy at https://fuentepricepro.com`;
}
