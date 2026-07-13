import { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { Currency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import type { WatchlistItem } from "@/lib/watchlist";
import {
  buildMonthlyBuckets,
  buildSparklinePath,
  computeCashFlowSummary,
  exportCashFlowCsv,
} from "@/lib/cashflow";
import { CashFlowHeader, type ViewMode } from "./cashflow/CashFlowHeader";
import { CashFlowSummaryCards } from "./cashflow/CashFlowSummary";
import { CashFlowChart } from "./cashflow/CashFlowChart";
import { CashFlowEmptyState } from "./cashflow/CashFlowEmptyState";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

  const [currency, setCurrency] = useState<Currency>(availableCurrencies[0] ?? "USD");
  const activeCurrency = availableCurrencies.includes(currency)
    ? currency
    : (availableCurrencies[0] ?? "USD");

  const data = useMemo(
    () => buildMonthlyBuckets(items, activeCurrency, months),
    [items, activeCurrency, months],
  );

  const summary = useMemo(() => computeCashFlowSummary(data), [data]);

  const finalCumulative = data[data.length - 1]?.cumulativeTotal ?? 0;
  const sparklinePath = useMemo(
    () => buildSparklinePath(data.map((d) => d.amount)),
    [data],
  );
  const cumulativePath = useMemo(
    () => buildSparklinePath(data.map((d) => d.cumulativeTotal)),
    [data],
  );

  const handleExportCsv = useCallback(
    () => exportCashFlowCsv(data, activeCurrency),
    [data, activeCurrency],
  );

  const hasData = data.some((d) => d.amount > 0);
  const bestMonth = data.find((d) => d.isBest);

  if (items.length === 0 || !hasData) {
    return <CashFlowEmptyState onNavigateToCalculator={onNavigateToCalculator} />;
  }

  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="pt-5">
        <CashFlowHeader
          title={t.watchlist.cashFlowTitle}
          onExportCsv={handleExportCsv}
          availableCurrencies={availableCurrencies}
          activeCurrency={activeCurrency}
          onCurrencyChange={setCurrency}
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
        />
      </CardContent>
    </Card>
  );
}
