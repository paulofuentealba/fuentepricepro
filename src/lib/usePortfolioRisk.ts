import { useMemo } from "react";
import { useValuedPortfolio } from "./useValuedPortfolio";
import { useAuth } from "./auth-provider";
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "./queryOptions";
import { useI18n } from "./i18n-provider";

export type RiskWarning = {
  id: string;
  type: "yield_trap" | "payout_audit" | "concentration";
  assetId?: string;
  ticker?: string;
  messageKey: string;
  severity: "yellow" | "red";
  extraData?: Record<string, any>;
};

export type AssetConcentration = {
  id: string;
  ticker: string;
  type: string;
  weightPct: number;
  valueBase: number;
};

export type SectorConcentration = {
  sector: string;
  weightPct: number;
  valueBase: number;
};

export type CurrencyConcentration = {
  currency: string;
  weightPct: number;
  valueBase: number;
};

export type TypeConcentration = {
  type: string;
  weightPct: number;
  valueBase: number;
};

export function usePortfolioRisk() {
  const { t } = useI18n();
  const { valuedItems: items } = useValuedPortfolio();
  const { user } = useAuth();
  const fxQuery = useQuery(exchangeRateQueryOptions());
  const fx = fxQuery.data?.USDBRL || 5.0;

  const baseCurrency = "BRL" as string; // Hardcoded default for now since smartAllocationCurrency isn't on User

  return useMemo(() => {
    let totalEquity = 0;
    const assets: AssetConcentration[] = [];
    const sectorMap: Record<string, number> = {};
    const currencyMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    const warnings: RiskWarning[] = [];

    // Calculate total equity and absolute values
    const payoutTickers: string[] = [];
    for (const item of items) {
      const qty = item.quantity || 0;
      if (qty <= 0) continue;

      let value = qty * item.currentPrice;
      const itemCurrency = ["Stock", "REIT"].includes(item.type) ? "USD" : "BRL";

      // Convert to base currency
      if (baseCurrency === "BRL" && itemCurrency === "USD") {
        value *= fx;
      } else if (baseCurrency === "USD" && itemCurrency === "BRL") {
        value /= fx;
      }

      totalEquity += value;

      assets.push({
        id: item.id,
        ticker: item.ticker,
        type: item.type,
        weightPct: 0,
        valueBase: value,
      });

      // Currency
      currencyMap[itemCurrency] = (currencyMap[itemCurrency] || 0) + value;

      // Type
      typeMap[item.type] = (typeMap[item.type] || 0) + value;

      // Sector
      const sector = item.sector || t.common.other;
      sectorMap[sector] = (sectorMap[sector] || 0) + value;

      // Warnings
      // 1. Yield Trap
      const dividendYield =
        item.currentPrice > 0 ? (item.annualDividend / item.currentPrice) * 100 : 0;
      if (dividendYield > 10 && item.safetyMargin < 0) {
        warnings.push({
          id: `yield_trap_${item.id}`,
          type: "yield_trap",
          assetId: item.id,
          ticker: item.ticker,
          messageKey: "yieldTrap",
          severity: "red",
        });
      }

      // 2. Payout Audit
      if (!["FII", "REIT"].includes(item.type)) {
        if (typeof item.payoutRatio === "number" && item.payoutRatio > 80) {
          payoutTickers.push(item.ticker);
        }
      }
    }

    if (payoutTickers.length > 0) {
      warnings.push({
        id: "payout_grouped",
        type: "payout_audit",
        messageKey: "payoutAudit",
        severity: "yellow",
        extraData: { tickers: payoutTickers },
      });
    }

    // Calculate weights
    if (totalEquity > 0) {
      assets.forEach((a) => {
        a.weightPct = (a.valueBase / totalEquity) * 100;
      });

      // Sort assets by weight
      assets.sort((a, b) => b.weightPct - a.weightPct);
    }

    const sectors: SectorConcentration[] = Object.entries(sectorMap)
      .map(([sector, value]) => ({
        sector,
        valueBase: value,
        weightPct: totalEquity > 0 ? (value / totalEquity) * 100 : 0,
      }))
      .sort((a, b) => b.weightPct - a.weightPct);

    const currencies: CurrencyConcentration[] = Object.entries(currencyMap)
      .map(([currency, value]) => ({
        currency,
        valueBase: value,
        weightPct: totalEquity > 0 ? (value / totalEquity) * 100 : 0,
      }))
      .sort((a, b) => b.weightPct - a.weightPct);

    const types: TypeConcentration[] = Object.entries(typeMap)
      .map(([type, value]) => ({
        type,
        valueBase: value,
        weightPct: totalEquity > 0 ? (value / totalEquity) * 100 : 0,
      }))
      .sort((a, b) => b.weightPct - a.weightPct);

    // 3. Concentration Warnings
    sectors.forEach((s) => {
      if (s.weightPct > 25 && s.sector !== t.common.other) {
        warnings.push({
          id: `conc_sector_${s.sector}`,
          type: "concentration",
          messageKey: "sectorConcentration",
          severity: "yellow",
          extraData: { sector: s.sector },
        });
      }
    });

    assets.forEach((a) => {
      if (a.weightPct > 15) {
        warnings.push({
          id: `conc_asset_${a.id}`,
          type: "concentration",
          assetId: a.id,
          ticker: a.ticker,
          messageKey: "assetConcentration",
          severity: "red",
        });
      }
    });

    return {
      totalEquity,
      baseCurrency,
      assets,
      sectors,
      currencies,
      types,
      warnings,
    };
  }, [items, baseCurrency, fx, t]);
}
