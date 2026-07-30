import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWatchlist, type WatchlistItem } from "./watchlist";
import { useSettings } from "./settings";
import { useLiveQuotesAndMeta } from "@/components/ceiling/watchlist/useLiveQuotesAndMeta";
import { getAssetValuation, netAfterTax, calculateFixedIncomeBalance } from "./calculations";
import { useSelic } from "./useSelic";
import { exchangeRateQueryOptions, macroRatesQueryOptions } from "./queryOptions";
import { useAuth } from "./auth-provider";

export interface ValuedWatchlistItem extends WatchlistItem {
  // Live computed fields
  livePrice: number; // Actual current price used (quote or fallback)
  // Overrides item.sector with meta.sector if available
  sector: string;
  valuation: ReturnType<typeof getAssetValuation>;
}

export function useValuedPortfolio() {
  const { items, isPending: isWatchlistPending, ...rest } = useWatchlist();
  const { loading: isAuthLoading } = useAuth();
  const { targetYield: globalYield } = useSettings();

  const isAppLoading = isAuthLoading || isWatchlistPending;

  // Base items with global yield fallback
  const baseItems = useMemo(() => {
    return (items || []).map((it) => ({
      ...it,
      targetYield: it.targetYield ?? globalYield,
    }));
  }, [items, globalYield]);

  // Live quotes and metadata
  const { quotes, meta, dataUpdatedAt: lastUpdatedAt } = useLiveQuotesAndMeta(baseItems);
  const { data: selic } = useSelic();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const { data: macroRates } = useQuery(macroRatesQueryOptions());

  const valuedItems = useMemo<ValuedWatchlistItem[]>(() => {
    return baseItems.map((it) => {
      const q = quotes[it.ticker];
      const m = meta[it.ticker];
      const livePrice = q?.price ?? it.currentPrice;
      const valuation = getAssetValuation({
        targetYield: it.targetYield,
        currentPrice: livePrice,
        avgDividend: m?.canonicalDividend3y ?? it.annualDividend,
        eps: m?.eps,
        bvps:
          m?.pbRatio && m.currentPrice != null && m.currentPrice > 0
            ? m.currentPrice / m.pbRatio
            : null,
        dividendCagr: m?.dividendCagr5y,
        selicPct: selic ?? 10.5,
        currency: it.currency,
        type: it.type,
      });

      return {
        ...it,
        annualDividend: m?.canonicalDividend3y ?? it.annualDividend,
        currentPrice: livePrice, // keep the property compatible with WatchlistItem
        livePrice,
        ceilingPrice: valuation.activeCeiling ?? 0,
        safetyMargin: valuation.margin ?? 0,
        // Single Source of Truth for Sector: live meta > item DB > default
        sector: m?.sector || it.sector || "Outros",
        valuation,
      };
    });
  }, [baseItems, quotes, meta, selic]);

  const totals = useMemo(() => {
    let usd = 0;
    let brl = 0;
    let usdWorth = 0;
    let brlWorth = 0;
    let countUsd = 0;
    let countBrl = 0;
    for (const it of valuedItems) {
      const income = netAfterTax(
        it.annualDividend * it.quantity,
        it.type,
        it.currency,
        it.customTaxRate,
      );

      let worth = it.currentPrice * it.quantity;
      if (it.type === "FIXED_INCOME" && macroRates) {
        const accrual = calculateFixedIncomeBalance(it, macroRates);
        if (accrual) {
          worth = accrual.accruedBalance;
        }
      }

      if (it.currency === "USD") {
        usd += income;
        usdWorth += worth;
        countUsd++;
      } else if (it.currency === "BRL") {
        brl += income;
        brlWorth += worth;
        countBrl++;
      }
    }

    const rate = fx?.USDBRL ?? 1; // Default to 1 if missing so it doesn't break
    const consolidatedNetWorth = brlWorth + usdWorth * rate;
    const consolidatedIncome = brl + usd * rate;

    return {
      usd,
      brl,
      usdWorth,
      brlWorth,
      countUsd,
      countBrl,
      consolidatedNetWorth,
      consolidatedIncome,
    };
  }, [valuedItems, fx, macroRates]);

  return {
    ...rest,
    items,
    valuedItems,
    totals,
    quotes,
    meta,
    isAppLoading,
    lastUpdatedAt,
    macroRates,
    fx,
    selic,
  };
}
