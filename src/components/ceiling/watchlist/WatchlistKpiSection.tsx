import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { convertCurrency } from "@/lib/currency";
import { EXCHANGE_RATE_FALLBACK } from "@/lib/macroDefaults";
import { useUserSettings } from "@/lib/useUserSettings";
import type { DividendEventsMap } from "@/lib/cashflow";
import { Globe, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { MetricBox } from "@/components/shared/MetricBox";
import { AllocationChart } from "./AllocationChart";
import { NextPaymentBanner } from "./NextPaymentBanner";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { displayTicker } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

interface WatchlistKpiSectionProps {
  valuedItems: ValuedWatchlistItem[];
  meta: Record<string, any>;
  dividendEventsMap?: DividendEventsMap;
  totals: {
    consolidatedNetWorth: number;
    consolidatedIncome: number;
    usd: number;
    countUsd: number;
    brl: number;
    countBrl: number;
  };
  locale: Locale;
  typeFilter: string | null;
  onSelectType: (type: string | null) => void;
  topAndWorst: {
    best: { item: ValuedWatchlistItem; returnPct: number; price: number } | null;
    worst: { item: ValuedWatchlistItem; returnPct: number; price: number } | null;
  };
  contextStats: { over: number; under: number; total: number };
}

export function WatchlistKpiSection({
  valuedItems,
  meta,
  dividendEventsMap,
  totals,
  locale,
  typeFilter,
  onSelectType,
  topAndWorst,
  contextStats,
}: WatchlistKpiSectionProps) {
  const { t } = useI18n();

  const { settings } = useUserSettings();
  const displayCurrency = settings.displayCurrency;
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const exchangeRate = fx?.USDBRL ?? EXCHANGE_RATE_FALLBACK;

  const displayNetWorth = convertCurrency(
    totals.consolidatedNetWorth,
    "BRL",
    displayCurrency,
    exchangeRate,
  );
  const displayIncome = convertCurrency(
    totals.consolidatedIncome,
    "BRL",
    displayCurrency,
    exchangeRate,
  );

  return (
    <>
      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <AllocationChart
            items={valuedItems}
            selectedType={typeFilter}
            onSelectType={onSelectType}
          />
          <NextPaymentBanner
            items={valuedItems}
            meta={meta}
            dividendEventsMap={dividendEventsMap}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col rounded-xl border border-primary/30 bg-background/60 backdrop-blur-md p-4 lg:p-6 transition-colors hover:bg-background/80">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {t.watchlist.consolidatedNetWorth}
            </span>
            <div className="flex items-center gap-2 text-4xl lg:text-5xl font-bold tabular-nums">
              <Globe className="h-8 w-8 text-primary" />
              <span className="bg-gradient-to-r from-white via-primary to-cyan-500 bg-clip-text text-transparent drop-shadow-sm">
                {formatCurrency(displayNetWorth, displayCurrency, locale)}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground/80">
              {t.watchlist.consolidatedNetWorthSub}
            </div>
          </div>

          <MetricBox
            label={t.watchlist.consolidatedIncome}
            value={
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Globe className="h-5 w-5 text-primary" />
                {formatCurrency(displayIncome, displayCurrency, locale)}
              </div>
            }
            subValue={t.watchlist.consolidatedIncomeSub}
            className="bg-background/60 backdrop-blur-md border border-primary/20 py-4"
          />

          <div className="grid grid-cols-2 gap-3">
            <MetricBox
              label={t.watchlist.totalUsdIncome}
              value={
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇺🇸</span>
                  {formatCurrency(totals.usd, "USD", locale)}
                </div>
              }
              subValue={`${totals.countUsd} ${t.watchlist.assets}`}
              className="bg-card/40 backdrop-blur-md"
            />
            <MetricBox
              label={t.watchlist.totalBrlIncome}
              value={
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇧🇷</span>
                  {formatCurrency(totals.brl, "BRL", locale)}
                </div>
              }
              subValue={`${totals.countBrl} ${t.watchlist.assets}`}
              className="bg-card/40 backdrop-blur-md"
            />

            {topAndWorst.best ? (
              <MetricBox
                label={t.watchlist.topPerformer}
                value={
                  <span className="text-success truncate">
                    {displayTicker(topAndWorst.best.item.ticker)} (+
                    {topAndWorst.best.returnPct.toFixed(2)}%)
                  </span>
                }
                subValue={formatCurrency(
                  topAndWorst.best.price,
                  topAndWorst.best.item.currency,
                  locale,
                )}
                variant="default"
                className="bg-card/40 backdrop-blur-md hover:border-success/30 overflow-hidden"
                tooltip={<TrendingUp className="h-3 w-3 text-success/80" />}
              />
            ) : (
              <div />
            )}

            {topAndWorst.worst ? (
              <MetricBox
                label={t.watchlist.worstPerformer}
                value={
                  <span className="text-danger truncate">
                    {displayTicker(topAndWorst.worst.item.ticker)} (
                    {topAndWorst.worst.returnPct.toFixed(2)}%)
                  </span>
                }
                subValue={formatCurrency(
                  topAndWorst.worst.price,
                  topAndWorst.worst.item.currency,
                  locale,
                )}
                variant="default"
                className="bg-card/40 backdrop-blur-md hover:border-danger/30 overflow-hidden"
                tooltip={<TrendingDown className="h-3 w-3 text-danger/80" />}
              />
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>

      {contextStats.total > 0 && (
        <div className="mb-4 w-full py-2 px-3 rounded-md bg-muted/20 border border-muted/30">
          <span className="text-sm text-muted-foreground italic">
            {contextStats.over > contextStats.under
              ? t.watchlist.contextOvervalued
                  .replace("{{over}}", contextStats.over.toString())
                  .replace("{{total}}", contextStats.total.toString())
              : contextStats.under > contextStats.over
                ? t.watchlist.contextUndervalued
                    .replace("{{under}}", contextStats.under.toString())
                    .replace("{{total}}", contextStats.total.toString())
                : t.watchlist.contextBalanced
                    .replace("{{under}}", contextStats.under.toString())
                    .replace("{{total}}", contextStats.total.toString())}
          </span>
        </div>
      )}
    </>
  );
}
