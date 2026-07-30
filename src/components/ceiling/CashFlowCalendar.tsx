import { useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import type { Currency } from "@/lib/domain";
import { useUserSettings } from "@/lib/useUserSettings";
import { useI18n } from "@/lib/i18n-provider";
import type { WatchlistItem } from "@/lib/watchlist";
import {
  buildMonthlyBuckets,
  buildSparklinePath,
  computeCashFlowSummary,
  computeInvestedVsReceived,
  type DividendEventsMap,
} from "@/lib/cashflow";
import { assetQueryOptions } from "@/lib/queryOptions";
import { CashFlowHeader } from "./cashflow/CashFlowHeader";
import { CashFlowSummaryCards } from "./cashflow/CashFlowSummary";
import { CashFlowChart } from "./cashflow/CashFlowChart";
import { CashFlowEmptyState } from "./cashflow/CashFlowEmptyState";

const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface Props {
  items: WatchlistItem[];
  onNavigateToCalculator?: () => void;
}

export function CashFlowCalendar({ items, onNavigateToCalculator }: Props) {
  const { t, locale } = useI18n();
  const months = locale === "en" ? MONTHS_EN : MONTHS_PT;

  const availableCurrencies = useMemo(() => {
    const set = new Set<Currency>();
    for (const it of items) set.add(it.currency);
    return Array.from(set);
  }, [items]);

  const { settings, updateSettings } = useUserSettings();
  const currency = settings.displayCurrency;
  const activeCurrency = currency;

  // Fetch fresh Asset data (with dividendEvents) for each watchlist item in parallel.
  // TanStack Query caches these (staleTime=5min), so this is cheap after first load.
  const assetQueries = useQueries({
    queries: items.map((it) => assetQueryOptions(it.ticker)),
  });

  const dividendEventsMap = useMemo<DividendEventsMap>(() => {
    const map: DividendEventsMap = {};
    assetQueries.forEach((q, i) => {
      const ticker = items[i]?.ticker;
      if (ticker && q.data?.dividendEvents) {
        map[ticker] = q.data.dividendEvents;
      }
    });
    return map;
  }, [assetQueries, items]);

  const data = useMemo(
    () => buildMonthlyBuckets(items, activeCurrency, months, dividendEventsMap),
    [items, activeCurrency, months, dividendEventsMap],
  );

  const investedVsReceived = useMemo(
    () => computeInvestedVsReceived(items, activeCurrency, dividendEventsMap),
    [items, activeCurrency, dividendEventsMap],
  );

  const summary = useMemo(() => computeCashFlowSummary(data), [data]);

  const finalCumulative = data[data.length - 1]?.cumulativeTotal ?? 0;
  const sparklinePath = useMemo(() => buildSparklinePath(data.map((d) => d.amount)), [data]);
  const cumulativePath = useMemo(
    () => buildSparklinePath(data.map((d) => d.cumulativeTotal)),
    [data],
  );

  const hasData = data.some((d) => d.amount > 0);
  const bestMonth = data.find((d) => d.isBest);

  if (items.length === 0 || !hasData) {
    return <CashFlowEmptyState onNavigateToCalculator={onNavigateToCalculator} />;
  }

  return (
    <Card className="border border-border/50 bg-background/60 backdrop-blur-md shadow-2xl">
      <CardContent className="pt-5">
        <CashFlowHeader
          title={t.watchlist.cashFlowTitle}
          availableCurrencies={availableCurrencies}
          activeCurrency={activeCurrency}
          onCurrencyChange={(c) => updateSettings({ displayCurrency: c })}
        />
        <CashFlowSummaryCards
          summary={summary}
          activeCurrency={activeCurrency}
          sparklinePath={sparklinePath}
          cumulativePath={cumulativePath}
        />
        <CashFlowChart
          data={data}
          activeCurrency={activeCurrency}
          bestMonth={bestMonth}
          finalCumulative={finalCumulative}
          investedVsReceived={investedVsReceived}
        />
      </CardContent>
    </Card>
  );
}
