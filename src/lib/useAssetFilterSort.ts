import { useState, useMemo } from "react";
import type { AssetType, Currency } from "@/lib/domain";
import { netAfterTax } from "@/lib/calculations";

export type OppFilter = "under" | "over" | null;
export type SortOption = "ticker_asc" | "yield_desc" | "margin_desc" | "income_desc" | "yoc_desc";

export interface FilterableAsset {
  id?: string;
  ticker: string;
  type?: string;
  currency?: string;
  safetyMargin: number;
  currentPrice: number;
  annualDividend: number;
  quantity?: number;
  averagePrice?: number | null;
  customTaxRate?: number | null;
}

export function useAssetFilterSort<T extends FilterableAsset>(
  items: T[],
  defaultSort: SortOption = "ticker_asc",
) {
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [oppFilter, setOppFilter] = useState<OppFilter>(null);
  const [sortOption, setSortOption] = useState<SortOption>(defaultSort);

  const typeFilters = useMemo(() => {
    const seen = new Map<string, { key: string; type: AssetType; currency: Currency }>();
    for (const it of items) {
      if (!it.type || !it.currency) continue;
      const key = `${it.currency}:${it.type}`;
      if (!seen.has(key)) {
        seen.set(key, { key, type: it.type as AssetType, currency: it.currency as Currency });
      }
    }
    return Array.from(seen.values());
  }, [items]);

  const counts = useMemo(() => {
    const byType = new Map<string, number>();
    let under = 0;
    let over = 0;
    for (const it of items) {
      if (it.type && it.currency) {
        const key = `${it.currency}:${it.type}`;
        byType.set(key, (byType.get(key) ?? 0) + 1);
      }

      const assetKey = it.type && it.currency ? `${it.currency}:${it.type}` : null;
      if (!typeFilter || assetKey === typeFilter) {
        if (it.safetyMargin > 0) under++;
        else over++;
      }
    }
    return { total: items.length, byType, under, over };
  }, [items, typeFilter]);

  const filteredAndSorted = useMemo(() => {
    let result = items;
    if (typeFilter || oppFilter) {
      result = items.filter((it) => {
        const assetKey = it.type && it.currency ? `${it.currency}:${it.type}` : null;
        if (typeFilter && assetKey !== typeFilter) return false;
        if (oppFilter === "under" && it.safetyMargin <= 0) return false;
        if (oppFilter === "over" && it.safetyMargin > 0) return false;
        return true;
      });
    }

    return [...result].sort((a, b) => {
      switch (sortOption) {
        case "yield_desc": {
          const dyA = a.currentPrice > 0 ? a.annualDividend / a.currentPrice : 0;
          const dyB = b.currentPrice > 0 ? b.annualDividend / b.currentPrice : 0;
          return dyB - dyA;
        }
        case "margin_desc":
          return b.safetyMargin - a.safetyMargin;
        case "income_desc": {
          const qtyA = a.quantity ?? 1;
          const qtyB = b.quantity ?? 1;
          const incA =
            a.type && a.currency
              ? netAfterTax(
                  a.annualDividend * qtyA,
                  a.type as AssetType,
                  a.currency as Currency,
                  a.customTaxRate,
                )
              : a.annualDividend * qtyA;
          const incB =
            b.type && b.currency
              ? netAfterTax(
                  b.annualDividend * qtyB,
                  b.type as AssetType,
                  b.currency as Currency,
                  b.customTaxRate,
                )
              : b.annualDividend * qtyB;
          return incB - incA;
        }
        case "yoc_desc": {
          const yocA =
            a.averagePrice && a.type && a.currency
              ? netAfterTax(
                  a.annualDividend,
                  a.type as AssetType,
                  a.currency as Currency,
                  a.customTaxRate,
                ) / a.averagePrice
              : 0;
          const yocB =
            b.averagePrice && b.type && b.currency
              ? netAfterTax(
                  b.annualDividend,
                  b.type as AssetType,
                  b.currency as Currency,
                  b.customTaxRate,
                ) / b.averagePrice
              : 0;
          return yocB - yocA;
        }
        case "ticker_asc":
        default:
          return a.ticker.localeCompare(b.ticker);
      }
    });
  }, [items, typeFilter, oppFilter, sortOption]);

  return {
    typeFilter,
    setTypeFilter,
    oppFilter,
    setOppFilter,
    sortOption,
    setSortOption,
    typeFilters,
    counts,
    filteredAndSorted,
  };
}
