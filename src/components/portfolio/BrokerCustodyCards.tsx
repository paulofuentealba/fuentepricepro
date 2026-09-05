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

interface BrokerGroupInfo {
  broker: string;
  totalValue: number;
  nativeUsdTotal: number;
  hasUsd: boolean;
  assetClassLabels: string[];
}

export function BrokerCustodyCards({
  valuedItems,
  currency,
  usdBrlRate,
  macroRates,
  isLoading,
}: BrokerCustodyCardsProps) {
  const { locale, t } = useI18n();

  const { groups, totalPortfolioValue } = useMemo(() => {
    const map = new Map<string, { value: number; nativeUsd: number; hasUsd: boolean; types: Set<string> }>();
    let total = 0;

    for (const item of valuedItems) {
      if (item.isClosedPosition) continue;
      const brokerKey = item.broker?.trim() || t.portfolio.unassignedBroker;
      const rawValue = getPositionValue(item, macroRates);
      const convertedValue = convertCurrency(rawValue, item.currency, currency, usdBrlRate);

      const existing = map.get(brokerKey) ?? {
        value: 0,
        nativeUsd: 0,
        hasUsd: false,
        types: new Set<string>(),
      };

      existing.value += convertedValue;
      if (item.currency === "USD") {
        existing.hasUsd = true;
        existing.nativeUsd += rawValue;
      }
      existing.types.add(t.types?.[item.type] || item.type);
      map.set(brokerKey, existing);
      total += convertedValue;
    }

    const groupList: BrokerGroupInfo[] = Array.from(map.entries())
      .filter(([, data]) => data.value > 0)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([broker, data]) => ({
        broker,
        totalValue: data.value,
        nativeUsdTotal: data.nativeUsd,
        hasUsd: data.hasUsd,
        assetClassLabels: Array.from(data.types).slice(0, 3),
      }));

    return { groups: groupList, totalPortfolioValue: total };
  }, [valuedItems, macroRates, currency, usdBrlRate, t.portfolio?.unassignedBroker, t.types]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 mb-6">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent-emerald-light">
          {t.portfolio?.custodyEyebrow ?? "Custódia por Corretora"}
        </div>
        <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
          {t.portfolio?.custodyTitle ?? "Onde seus ativos estão guardados"}
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {t.portfolio?.emptyPositions ?? "Nenhuma posição ainda"}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const pct = totalPortfolioValue > 0 ? (g.totalValue / totalPortfolioValue) * 100 : 0;
            const pctText = (t.portfolio?.custodyShare ?? "{{pct}}% da Carteira").replace("{{pct}}", pct.toFixed(1));
            const classesText = g.assetClassLabels.join(", ");

            return (
              <div
                key={g.broker}
                className="rounded-xl border border-border/60 bg-surface-2/80 p-4 transition-all hover:border-border"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.broker}
                </div>
                <div className="my-1.5 font-serif text-xl font-bold text-accent-gold">
                  {formatCurrency(g.totalValue, currency, locale)}
                </div>
                <div className="text-xs font-medium text-accent-emerald-light truncate">
                  {g.hasUsd && currency === "BRL"
                    ? `US$ ${g.nativeUsdTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pct.toFixed(1)}%) • ${classesText}`
                    : `${pctText}${classesText ? ` • ${classesText}` : ""}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
