import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Percent, TrendingUp, Info, ShieldCheck, BarChart2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Currency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { useSelic } from "@/lib/useSelic";
import { benchmarkHistoryQueryOptions } from "@/lib/queryOptions";
import { type Transaction } from "@/lib/transactions";
import { type RealizedIncomeEvent } from "@/lib/realizedIncome";
import { calculateIrr, buildCashFlowsFromPortfolio, getEffectiveTransactions, isUsdAsset } from "@/lib/portfolioIrr";
import { annualizeReturn } from "@/lib/benchmark";
import { useWatchlist } from "@/lib/watchlist";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  transactions: Transaction[];
  realizedEvents: RealizedIncomeEvent[];
  currentPortfolioValue: number;
  activeCurrency: Currency;
  assetCurrencies?: Record<string, Currency>;
}

export function PortfolioIrrCard({
  transactions,
  realizedEvents,
  currentPortfolioValue,
  activeCurrency,
  assetCurrencies = {},
}: Props) {
  const { t } = useI18n();
  const { items } = useWatchlist();
  const { data: selicRaw } = useSelic();
  const fallbackSelic = selicRaw ?? 10.5;

  const effectiveTransactions = useMemo(() => {
    return getEffectiveTransactions(transactions, items);
  }, [transactions, items]);

  // Filter transactions for active currency
  const filteredTransactions = useMemo(() => {
    return effectiveTransactions.filter((tx) => {
      const isUsd = isUsdAsset(tx.ticker, assetCurrencies);
      const txCurrency: Currency = isUsd ? "USD" : "BRL";
      return txCurrency === activeCurrency;
    });
  }, [effectiveTransactions, assetCurrencies, activeCurrency]);

  // Determine evaluation timeframe (fromDate to toDate)
  const { fromDate, toDate, daysInPeriod, hasTransactions } = useMemo(() => {
    if (filteredTransactions.length === 0) {
      return { fromDate: "", toDate: "", daysInPeriod: 0, hasTransactions: false };
    }
    const fromTimestamp = Math.min(...filteredTransactions.map((tx) => tx.date));
    const days = Math.max(1, Math.round((Date.now() - fromTimestamp) / (1000 * 60 * 60 * 24)));
    const fDate = new Date(fromTimestamp).toISOString().slice(0, 10);
    const tDate = new Date().toISOString().slice(0, 10);
    return { fromDate: fDate, toDate: tDate, daysInPeriod: days, hasTransactions: true };
  }, [filteredTransactions]);

  // Calculate native current market value of assets in activeCurrency
  const nativeCurrentValue = useMemo(() => {
    const matchingItems = (items || []).filter((it) => {
      const isUsd =
        assetCurrencies[it.ticker.toUpperCase()] !== undefined
          ? assetCurrencies[it.ticker.toUpperCase()] === "USD"
          : it.currency === "USD";
      const itemCurrency: Currency = isUsd ? "USD" : "BRL";
      return itemCurrency === activeCurrency;
    });
    if (matchingItems.length > 0) {
      return matchingItems.reduce(
        (acc, it) => acc + (it.quantity || 0) * (it.currentPrice || 0),
        0,
      );
    }
    return currentPortfolioValue > 0 ? currentPortfolioValue : 0;
  }, [items, assetCurrencies, activeCurrency, currentPortfolioValue]);

  // Fetch benchmark historical series
  const cdiQuery = useQuery({
    ...benchmarkHistoryQueryOptions("CDI", fromDate, toDate),
    enabled: hasTransactions && activeCurrency === "BRL",
  });

  const selicQuery = useQuery({
    ...benchmarkHistoryQueryOptions("SELIC", fromDate, toDate),
    enabled: hasTransactions && activeCurrency === "BRL",
  });

  const spxQuery = useQuery({
    ...benchmarkHistoryQueryOptions("SPX", fromDate, toDate),
    enabled: hasTransactions && activeCurrency === "USD",
  });

  // Annualized benchmark returns
  const annualizedCdi = useMemo(() => {
    if (!cdiQuery.data || cdiQuery.data.length === 0 || daysInPeriod <= 0) return null;
    const lastCum = cdiQuery.data[cdiQuery.data.length - 1].cumulativeReturnPct;
    return annualizeReturn(lastCum, daysInPeriod);
  }, [cdiQuery.data, daysInPeriod]);

  const annualizedSelic = useMemo(() => {
    if (!selicQuery.data || selicQuery.data.length === 0 || daysInPeriod <= 0) return fallbackSelic;
    const lastCum = selicQuery.data[selicQuery.data.length - 1].cumulativeReturnPct;
    return annualizeReturn(lastCum, daysInPeriod);
  }, [selicQuery.data, daysInPeriod, fallbackSelic]);

  const annualizedSpx = useMemo(() => {
    if (!spxQuery.data || spxQuery.data.length === 0 || daysInPeriod <= 0) return null;
    const lastCum = spxQuery.data[spxQuery.data.length - 1].cumulativeReturnPct;
    return annualizeReturn(lastCum, daysInPeriod);
  }, [spxQuery.data, daysInPeriod]);

  // Calculate native cashflows and IRR
  const cashFlows = useMemo(
    () =>
      buildCashFlowsFromPortfolio(
        effectiveTransactions,
        realizedEvents,
        nativeCurrentValue,
        Date.now(),
        1,
        assetCurrencies,
        activeCurrency,
      ),
    [effectiveTransactions, realizedEvents, nativeCurrentValue, assetCurrencies, activeCurrency],
  );

  const irrRate = useMemo(() => calculateIrr(cashFlows), [cashFlows]);
  const irrPct = irrRate !== null ? irrRate * 100 : null;

  // Comparison differences
  const diffVsCdi = irrPct !== null && annualizedCdi !== null ? irrPct - annualizedCdi : null;
  const diffVsSpx = irrPct !== null && annualizedSpx !== null ? irrPct - annualizedSpx : null;

  // Empty state if no transactions exist in the active currency
  if (!hasTransactions) {
    return (
      <Card className="border border-border/50 bg-background/40 backdrop-blur-md">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center border border-border/60 shrink-0">
            <Percent className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col text-center sm:text-left">
            <h4 className="text-sm font-semibold text-foreground">
              {t.tabs.chart.irrEmptyStateTitle.replace("{{currency}}", activeCurrency)}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.tabs.chart.irrEmptyStateDesc.replace("{{currency}}", activeCurrency)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardTitleLabel = activeCurrency === "BRL" ? t.tabs.chart.irrBrlLabel : t.tabs.chart.irrUsdLabel;

  return (
    <Card className="border border-success/30 bg-success/10 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.15)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-success/20 flex items-center justify-center border border-success/30 shrink-0">
              <Percent className="h-4 w-4 text-success" />
            </div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-semibold text-success uppercase tracking-wider">
                {t.tabs.chart.irrTitle} ({activeCurrency})
              </h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-success/70 hover:text-success cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {t.tabs.chart.irrTooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {activeCurrency === "BRL" && diffVsCdi !== null && (
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                diffVsCdi >= 0
                  ? "bg-success/20 text-success border-success/40"
                  : "bg-warning/20 text-warning border-warning/40"
              }`}
            >
              {diffVsCdi >= 0 ? "+" : ""}
              {diffVsCdi.toFixed(1)}% vs CDI
            </span>
          )}

          {activeCurrency === "USD" && diffVsSpx !== null && (
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                diffVsSpx >= 0
                  ? "bg-success/20 text-success border-success/40"
                  : "bg-warning/20 text-warning border-warning/40"
              }`}
            >
              {diffVsSpx >= 0 ? "+" : ""}
              {diffVsSpx.toFixed(1)}% vs S&P 500
            </span>
          )}
        </div>

        {activeCurrency === "BRL" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="rounded-lg bg-background/60 border border-success/25 p-3">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                {cardTitleLabel}
              </span>
              <p className="text-xl font-extrabold text-success mt-1">
                {irrPct !== null ? `${irrPct.toFixed(1)}% a.a.` : t.tabs.chart.irrInsufficientData}
              </p>
            </div>

            <div className="rounded-lg bg-background/60 border border-success/25 p-3">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                <BarChart2 className="h-3.5 w-3.5 text-success/80" />
                {t.tabs.chart.cdiBenchmark}
              </span>
              <p className="text-xl font-extrabold text-foreground mt-1">
                {annualizedCdi !== null ? `${annualizedCdi.toFixed(1)}% a.a.` : `${fallbackSelic.toFixed(1)}% a.a.`}
              </p>
            </div>

            <div className="rounded-lg bg-background/60 border border-success/25 p-3">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-success/80" />
                {t.tabs.chart.selicBenchmark}
              </span>
              <p className="text-xl font-extrabold text-foreground mt-1">
                {annualizedSelic !== null ? `${annualizedSelic.toFixed(1)}% a.a.` : `${fallbackSelic.toFixed(1)}% a.a.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg bg-background/60 border border-success/25 p-3">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                {cardTitleLabel}
              </span>
              <p className="text-xl font-extrabold text-success mt-1">
                {irrPct !== null ? `${irrPct.toFixed(1)}% a.a.` : t.tabs.chart.irrInsufficientData}
              </p>
            </div>

            <div className="rounded-lg bg-background/60 border border-success/25 p-3">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                <BarChart2 className="h-3.5 w-3.5 text-success/80" />
                {t.tabs.chart.spxBenchmark}
              </span>
              <p className="text-xl font-extrabold text-foreground mt-1">
                {annualizedSpx !== null ? `${annualizedSpx.toFixed(1)}% a.a.` : "--"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
