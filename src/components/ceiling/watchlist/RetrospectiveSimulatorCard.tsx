import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, TrendingUp, Sparkles } from "lucide-react";
import type { Asset } from "@/lib/domain";
import { assetPriceHistoryQueryOptions } from "@/lib/queryOptions";
import { simulateRetrospectiveInvestment } from "@/lib/retrospectiveSimulator";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatPercent } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  asset: Asset;
}

export function RetrospectiveSimulatorCard({ asset }: Props) {
  const { t, locale } = useI18n();
  const [periodYears, setPeriodYears] = useState<1 | 3 | 5>(1);
  const [initialCapital, setInitialCapital] = useState<number>(1000);

  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    const toDateStr = now.toISOString().split("T")[0];
    const start = new Date(now.getTime() - periodYears * 365.25 * 24 * 60 * 60 * 1000);
    const fromDateStr = start.toISOString().split("T")[0];
    return { fromDate: fromDateStr, toDate: toDateStr };
  }, [periodYears]);

  const { data: priceSeries } = useQuery(
    assetPriceHistoryQueryOptions(asset.ticker, fromDate, toDate),
  );

  const simResult = useMemo(() => {
    return simulateRetrospectiveInvestment(asset, priceSeries, initialCapital, periodYears);
  }, [asset, priceSeries, initialCapital, periodYears]);

  const currency = asset.currency;

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t.retrospectiveSimulator.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t.retrospectiveSimulator.subtitle}
            </p>
          </div>
        </div>

        {/* Period selector chips */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
          <Button
            type="button"
            variant={periodYears === 1 ? "secondary" : "ghost"}
            size="sm"
            className={cn("h-7 px-2.5 text-xs font-medium", periodYears === 1 && "shadow-xs font-semibold")}
            onClick={() => setPeriodYears(1)}
          >
            {t.retrospectiveSimulator.period1y}
          </Button>
          <Button
            type="button"
            variant={periodYears === 3 ? "secondary" : "ghost"}
            size="sm"
            className={cn("h-7 px-2.5 text-xs font-medium", periodYears === 3 && "shadow-xs font-semibold")}
            onClick={() => setPeriodYears(3)}
          >
            {t.retrospectiveSimulator.period3y}
          </Button>
          <Button
            type="button"
            variant={periodYears === 5 ? "secondary" : "ghost"}
            size="sm"
            className={cn("h-7 px-2.5 text-xs font-medium", periodYears === 5 && "shadow-xs font-semibold")}
            onClick={() => setPeriodYears(5)}
          >
            {t.retrospectiveSimulator.period5y}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-40 sm:w-48">
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            {t.retrospectiveSimulator.initialAmountLabel}
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
              {currency === "USD" ? "$" : "R$"}
            </span>
            <Input
              type="number"
              min={10}
              step={100}
              value={initialCapital || ""}
              onChange={(e) => setInitialCapital(Math.max(0, Number(e.target.value) || 0))}
              className="h-8 pl-8 text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Main Result Banner */}
      <div className="p-3.5 rounded-lg border border-success/20 bg-success/5 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <span className="text-[11px] text-muted-foreground font-medium">
              {t.retrospectiveSimulator.todayYouWouldHave}
            </span>
            <div className="text-xl sm:text-2xl font-bold text-success tracking-tight">
              {formatCurrency(simResult.finalValue, currency, locale)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-muted-foreground font-medium block">
              {t.retrospectiveSimulator.totalReturn}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md",
                simResult.totalReturnPct >= 0
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning",
              )}
            >
              <TrendingUp className="h-3 w-3" />
              {formatPercent(simResult.totalReturnPct, locale)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/30 text-xs">
          <div className="bg-background/40 p-2 rounded border border-border/30">
            <span className="text-[10px] text-muted-foreground block">
              {t.retrospectiveSimulator.capitalAppreciation}
            </span>
            <span className="font-semibold text-foreground">
              {formatCurrency(simResult.capitalAppreciationValue, currency, locale)}
            </span>
          </div>

          <div className="bg-background/40 p-2 rounded border border-border/30">
            <span className="text-[10px] text-muted-foreground block">
              {t.retrospectiveSimulator.dividendsReinvested}
            </span>
            <span className="font-semibold text-success">
              +{formatCurrency(simResult.dividendsReinvestedValue, currency, locale)}
            </span>
          </div>

          <div className="bg-background/40 p-2 rounded border border-border/30">
            <span className="text-[10px] text-muted-foreground block">
              {t.retrospectiveSimulator.sharesAccumulated}
            </span>
            <span className="font-semibold text-foreground">
              {t.retrospectiveSimulator.fromToShares
                .replace("{{initial}}", simResult.initialShares.toFixed(1))
                .replace("{{final}}", simResult.finalShares.toFixed(1))}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed border-t border-border/30 pt-2">
        {t.retrospectiveSimulator.disclaimer}
      </p>
    </div>
  );
}
