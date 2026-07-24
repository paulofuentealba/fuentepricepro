import { useMemo } from "react";
import { isUsAsset, netAfterTax } from "@/lib/calculations";
import { formatCurrency, formatPercent, type Locale } from "@/lib/i18n";
import type { WatchlistItem } from "@/lib/watchlist";

export interface AssetDerived {
  grossIncome: number;
  isUs: boolean;
  netIncome: number;
  positive: boolean;
  hasAvg: boolean;
  totalReturn: number;
  returnPct: number;
  returnPositive: boolean;
  yoc: number | null;
  totalCost: number;
  currentValue: number;
}

export function useAssetCardDerived(item: WatchlistItem): AssetDerived {
  return useMemo(() => {
    const grossIncome = item.annualDividend * item.quantity;
    const isUs = isUsAsset(item.type, item.currency);
    const netIncome = netAfterTax(grossIncome, item.type, item.currency, item.customTaxRate);
    const positive = item.safetyMargin >= 0;
    const hasAvg = item.averagePrice != null && item.averagePrice > 0;
    const totalCost = hasAvg ? (item.averagePrice as number) * item.quantity : 0;
    const currentValue = item.currentPrice * item.quantity;
    const totalReturn = hasAvg ? currentValue - totalCost : 0;
    const returnPct = hasAvg && totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
    const returnPositive = totalReturn >= 0;
    const annualPerShare = item.quantity > 0 ? grossIncome / item.quantity : 0;
    const yoc =
      hasAvg && (item.averagePrice as number) > 0
        ? (annualPerShare / (item.averagePrice as number)) * 100
        : null;
    return {
      grossIncome,
      isUs,
      netIncome,
      positive,
      hasAvg,
      totalReturn,
      returnPct,
      returnPositive,
      yoc,
      totalCost,
      currentValue,
    };
  }, [item]);
}

export function buildAssetShareText(
  item: WatchlistItem,
  yoc: number | null,
  locale: Locale,
): string {
  const yocValue = yoc ?? item.targetYield;
  return `Just analyzed ${item.ticker} on Fuente Price Pro! 🚀\nCeiling Price: ${formatCurrency(item.ceilingPrice, item.currency, locale)} | Projected YoC: ${formatPercent(yocValue, locale, 2)}.\nCheck your portfolio strategy at https://fuentepricepro.web.app`;
}
