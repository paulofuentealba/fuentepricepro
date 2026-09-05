import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getPositionValue } from "@/lib/calculations";
import { convertCurrency } from "@/lib/currency";
import { formatCurrency } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Currency } from "@/lib/domain";

interface BrokerCustodyCardsProps {
  valuedItems: ValuedWatchlistItem[];
  currency: Currency;
  usdBrlRate: number;
  macroRates?: { cdi: number; ipca: number };
  isLoading: boolean;
}

export function BrokerCustodyCards({
  valuedItems,
  currency,
  usdBrlRate,
  macroRates,
  isLoading,
}: BrokerCustodyCardsProps) {
  const { locale, t } = useI18n();

  const groups = useMemo(() => {
    const byBroker = new Map<string, number>();
    for (const item of valuedItems) {
      if (item.isClosedPosition) continue;
      const key = item.broker?.trim() || t.portfolio.unassignedBroker;
      // getPositionValue returns the value in the ASSET's own currency, so each
      // position must be converted to the display currency before accumulating —
      // otherwise a broker holding both BRL and USD assets yields a mixed sum.
      const rawValue = getPositionValue(item, macroRates);
      const value = convertCurrency(rawValue, item.currency, currency, usdBrlRate);
      byBroker.set(key, (byBroker.get(key) ?? 0) + value);
    }
    return Array.from(byBroker.entries())
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [valuedItems, macroRates, currency, usdBrlRate, t.portfolio.unassignedBroker]);

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="mb-4">
        <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
          {t.portfolio.custodyEyebrow}
        </div>
        <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
          {t.portfolio.custodyTitle}
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {groups.map(([broker, value]) => (
            <div key={broker} className="rounded-lg border border-border p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{broker}</div>
              <div className="mt-1 font-serif text-lg font-semibold text-foreground">
                {formatCurrency(value, currency, locale)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
