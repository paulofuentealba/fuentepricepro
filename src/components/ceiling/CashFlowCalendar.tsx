import { useCallback, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
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
import { useTransactions } from "@/lib/transactions";
import { assetQueryOptions, exchangeRateQueryOptions } from "@/lib/queryOptions";
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

import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { PortfolioIrrCard } from "./cashflow/PortfolioIrrCard";
import { usePortfolioSnapshot } from "@/lib/portfolioSnapshot";

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

  const defaultMode = useMemo(() => {
    if (items.length === 0) return "calendar";
    const oldest = Math.min(...items.map((it) => it.addedAt));
    const oldestDate = new Date(oldest);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setMonth(oneYearAgo.getMonth() + 1); // 12 rolling months back
    return oldestDate >= oneYearAgo ? "journey" : "calendar";
  }, [items]);

  const [mode, setMode] = useState<"calendar" | "journey">(defaultMode);

  const queryOptions = useMemo(
    () => items.map((it) => assetQueryOptions(it.ticker)),
    [items],
  );
  const assetQueries = useQueries({
    queries: queryOptions,
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

  const { transactions } = useTransactions();

  // SSOT: dividendEventsMap/effectiveTransactions -> realizedEvents/summary
  // vem de `useRealizedIncomeSummary` (extraído desta duplicação — ver
  // `src/lib/useRealizedIncomeSummary.ts`). `dividendEventsMap` continua
  // calculado localmente logo abaixo porque também alimenta
  // `buildMonthlyBuckets`/`computeInvestedVsReceived`, que não fazem parte
  // do escopo do hook.
  const { events: realizedEvents, summary: realizedSummary } =
    useRealizedIncomeSummary(activeCurrency);

  const { data: fxData } = useQuery(exchangeRateQueryOptions());
  const fxRate = fxData?.USDBRL ?? 5.5;

  const calendarData = useMemo(
    () => buildMonthlyBuckets(items, activeCurrency, months, dividendEventsMap, "calendar", transactions, fxRate),
    [items, activeCurrency, months, dividendEventsMap, transactions, fxRate],
  );

  const chartData = useMemo(
    () => buildMonthlyBuckets(items, activeCurrency, months, dividendEventsMap, mode, transactions, fxRate),
    [items, activeCurrency, months, dividendEventsMap, mode, transactions, fxRate],
  );

  const investedVsReceived = useMemo(
    () => computeInvestedVsReceived(items, activeCurrency, dividendEventsMap, transactions, fxRate),
    [items, activeCurrency, dividendEventsMap, transactions, fxRate],
  );

  const { totals, valuedItems } = useValuedPortfolio();
  const currentPortfolioValue = totals.consolidatedNetWorth;
  const totalInvestedBRL = valuedItems.reduce((acc, it) => acc + (it.quantity * it.currentPrice), 0);

  // Periodic daily snapshot recorded in Firestore (idempotent YYYY-MM-DD doc ID)
  usePortfolioSnapshot(currentPortfolioValue, totalInvestedBRL);

  const assetCurrenciesMap = useMemo(() => {
    const map: Record<string, Currency> = {};
    for (const it of items) map[it.ticker.toUpperCase()] = it.currency;
    return map;
  }, [items]);

  const summary = useMemo(() => computeCashFlowSummary(calendarData), [calendarData]);

  const finalCumulative = chartData[chartData.length - 1]?.cumulativeTotal ?? 0;
  const sparklinePath = useMemo(() => buildSparklinePath(calendarData.map((d) => d.amount)), [calendarData]);
  const cumulativePath = useMemo(
    () => buildSparklinePath(calendarData.map((d) => d.cumulativeTotal)),
    [calendarData],
  );

  const hasData = chartData.some((d) => d.amount > 0 || d.realizedAmount > 0);
  const bestMonth = chartData.find((d) => d.isBest);

  if (items.length === 0 || !hasData) {
    return <CashFlowEmptyState onNavigateToCalculator={onNavigateToCalculator} />;
  }

  return (
    <Card className="border border-border/50 bg-background/60 backdrop-blur-md shadow-2xl">
      <CardContent className="pt-5 space-y-6">
        <CashFlowHeader
          title={t.watchlist.cashFlowTitle}
          availableCurrencies={availableCurrencies}
          activeCurrency={activeCurrency}
          onCurrencyChange={(c) => updateSettings({ displayCurrency: c })}
          mode={mode}
          onModeChange={setMode}
        />
        <PortfolioIrrCard
          transactions={transactions}
          realizedEvents={realizedEvents}
          currentPortfolioValue={currentPortfolioValue}
          activeCurrency={activeCurrency}
          assetCurrencies={assetCurrenciesMap}
        />
        <CashFlowSummaryCards
          summary={summary}
          realizedSummary={realizedSummary}
          activeCurrency={activeCurrency}
          sparklinePath={sparklinePath}
          cumulativePath={cumulativePath}
        />
        <CashFlowChart
          data={chartData}
          activeCurrency={activeCurrency}
          bestMonth={bestMonth}
          finalCumulative={finalCumulative}
          investedVsReceived={investedVsReceived}
        />
      </CardContent>
    </Card>
  );
}
