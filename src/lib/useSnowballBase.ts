import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { exchangeRateQueryOptions, macroRatesQueryOptions } from "@/lib/queryOptions";
import { getPositionValue } from "@/lib/calculations";
import { convertCurrency } from "@/lib/currency";
import { EXCHANGE_RATE_FALLBACK } from "@/lib/macroDefaults";
import type { Currency } from "@/lib/domain";

export interface SnowballBase {
  /** Current portfolio value, in `currency`. */
  currentTotal: number;
  /** Blended annual dividend yield across open positions, as a fraction (0.085 = 8.5%). */
  blendedYield: number;
  currency: Currency;
}

/**
 * Canonical starting point ("função canônica") for every Snowball scenario tool: current
 * portfolio value and blended dividend yield, in the user's display currency. Both
 * SnowballSimulator (/app/snowballeffectsimulator) and the Explore > Snowball Effect tab derive
 * their base equity from this single hook — no duplicated portfolio aggregation.
 */
export function useSnowballBase(): SnowballBase {
  const { valuedItems: items } = useValuedPortfolio();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const { data: macroRates } = useQuery(macroRatesQueryOptions());
  const usdRate = fx?.USDBRL ?? EXCHANGE_RATE_FALLBACK;
  const { settings } = useUserSettings();
  const currency = settings.displayCurrency;

  return useMemo(() => {
    let totalValue = 0;
    let totalAnnualDividend = 0;

    for (const item of items) {
      if (item.isClosedPosition || !item.quantity || item.quantity <= 0) continue;
      const itemValue = getPositionValue(item, macroRates);
      const convertedValue = convertCurrency(itemValue, item.currency, currency, usdRate);
      const itemDividend = (item.annualDividend || 0) * item.quantity;
      const convertedDividend = convertCurrency(itemDividend, item.currency, currency, usdRate);

      totalValue += convertedValue;
      totalAnnualDividend += convertedDividend;
    }

    const yieldPct = totalValue > 0 ? totalAnnualDividend / totalValue : 0.08; // Default to 8% if empty
    return { currentTotal: totalValue, blendedYield: yieldPct, currency };
  }, [items, currency, macroRates, usdRate]);
}
