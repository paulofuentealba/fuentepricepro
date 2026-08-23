import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, AlertTriangle, DollarSign, Wallet, Layers } from "lucide-react";
import type { WatchlistItem } from "@/lib/watchlist";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Asset, Currency } from "@/lib/domain";
import { simulateDividendProjection } from "@/lib/dividendProjection";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatNumber } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  item: WatchlistItem | ValuedWatchlistItem;
  asset?: Asset | null;
  currency: Currency;
}

export function AssetProjectionPanel({ item, asset, currency }: Props) {
  const { t, locale } = useI18n();
  const [periodYears, setPeriodYears] = useState<1 | 3 | 5>(1);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0);

  const initialShares = item.quantity ?? 0;
  const currentPrice = item.currentPrice ?? 0;

  // Canonical yield (SSOT): item.annualDividend / item.currentPrice with fallback to asset.metrics.currentDy
  const annualYield = useMemo(() => {
    if (item.annualDividend != null && currentPrice > 0) {
      return item.annualDividend / currentPrice;
    }
    if (asset?.metrics?.currentDy != null) {
      return asset.metrics.currentDy / 100;
    }
    return 0;
  }, [item.annualDividend, currentPrice, asset?.metrics?.currentDy]);

  const projection = useMemo(() => {
    return simulateDividendProjection({
      initialShares,
      currentPrice,
      annualYield,
      monthlyContribution,
      periodYears,
    });
  }, [initialShares, currentPrice, annualYield, monthlyContribution, periodYears]);

  const chartData = useMemo(() => {
    return projection.timeline.map((point) => ({
      month: point.month,
      shares: Number(point.shares.toFixed(2)),
      monthlyIncome: Number(point.monthlyIncome.toFixed(2)),
      totalInvested: Number(point.totalInvested.toFixed(2)),
      reinvestedIncomeAcc: Number(point.reinvestedIncomeAcc.toFixed(2)),
    }));
  }, [projection.timeline]);

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm p-4 sm:p-5 shadow-sm space-y-5">
      {/* Top Controls: Title, Period selector chips & Monthly contribution */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t.projection.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t.projection.subtitle}
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
          <Button
            type="button"
            variant={periodYears === 1 ? "secondary" : "ghost"}
            size="sm"
            className={cn("h-7 px-2.5 text-xs font-medium", periodYears === 1 && "shadow-xs font-semibold")}
            onClick={() => setPeriodYears(1)}
          >
            {t.projection.period1y}
          </Button>
          <Button
            type="button"
            variant={periodYears === 3 ? "secondary" : "ghost"}
            size="sm"
            className={cn("h-7 px-2.5 text-xs font-medium", periodYears === 3 && "shadow-xs font-semibold")}
            onClick={() => setPeriodYears(3)}
          >
            {t.projection.period3y}
          </Button>
          <Button
            type="button"
            variant={periodYears === 5 ? "secondary" : "ghost"}
            size="sm"
            className={cn("h-7 px-2.5 text-xs font-medium", periodYears === 5 && "shadow-xs font-semibold")}
            onClick={() => setPeriodYears(5)}
          >
            {t.projection.period5y}
          </Button>
        </div>
      </div>

      {/* Prominent Risk Warning at Top */}
      <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
        <p className="leading-relaxed">{t.projection.riskWarning}</p>
      </div>

      {/* Input: Monthly Contribution */}
      <div className="flex items-center gap-3">
        <div className="w-48 sm:w-56">
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            {t.projection.monthlyContribution}
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
              {currency === "USD" ? "$" : "R$"}
            </span>
            <Input
              type="number"
              min={0}
              step={50}
              placeholder="0,00"
              value={monthlyContribution || ""}
              onChange={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value) || 0))}
              className="h-8 pl-8 text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Recharts Two-line Chart */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} />
            <XAxis
              dataKey="month"
              tickFormatter={(m) => `${m}m`}
              stroke="var(--muted-foreground)"
              fontSize={11}
            />
            <YAxis
              yAxisId="shares"
              orientation="left"
              stroke="var(--muted-foreground)"
              fontSize={10}
              hide
            />
            <YAxis
              yAxisId="income"
              orientation="right"
              stroke="var(--muted-foreground)"
              fontSize={10}
              hide
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border/80 bg-background/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
                    <p className="font-semibold text-foreground border-b border-border/50 pb-1">
                      {t.projection.month} {data.month}
                    </p>
                    <div className="flex justify-between items-center text-success">
                      <span>{t.projection.sharesLabel}:</span>
                      <span className="font-bold tabular-nums">{formatNumber(data.shares, locale, 2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-primary">
                      <span>{t.projection.incomeLabel}:</span>
                      <span className="font-bold tabular-nums">{formatCurrency(data.monthlyIncome, currency, locale)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-border/40 text-[10px]">
                      <span>{t.projection.totalInvestedCardTitle}:</span>
                      <span className="tabular-nums">{formatCurrency(data.totalInvested, currency, locale)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              yAxisId="shares"
              type="monotone"
              dataKey="shares"
              stroke="var(--success)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "var(--success)" }}
              name={t.projection.sharesLabel}
            />
            <Line
              yAxisId="income"
              type="monotone"
              dataKey="monthlyIncome"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "var(--primary)" }}
              name={t.projection.incomeLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="bg-background/40 p-3 rounded-lg border border-border/40 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
            <Layers className="h-3.5 w-3.5 text-success" />
            <span>{t.projection.sharesCardTitle}</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">
            {formatNumber(projection.initialShares, locale, 1)} → {formatNumber(projection.finalShares, locale, 1)}
          </p>
        </div>

        <div className="bg-background/40 p-3 rounded-lg border border-border/40 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span>{t.projection.incomeCardTitle}</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-primary tabular-nums">
            {formatCurrency(projection.initialMonthlyIncome, currency, locale)} → {formatCurrency(projection.finalMonthlyIncome, currency, locale)}
          </p>
        </div>

        <div className="bg-background/40 p-3 rounded-lg border border-border/40 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            <span>{t.projection.totalInvestedCardTitle}</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">
            {formatCurrency(projection.totalOutOfPocket, currency, locale)}
          </p>
          <p className="text-[10px] text-success font-medium tabular-nums">
            +{formatCurrency(projection.totalReinvested, currency, locale)} {t.projection.reinvestedCardTitle.toLowerCase()}
          </p>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <p className="text-[11px] text-muted-foreground/70 leading-relaxed border-t border-border/30 pt-3">
        {t.projection.disclaimer}
      </p>
    </div>
  );
}
