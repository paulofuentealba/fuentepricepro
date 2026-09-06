import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { computeFxDecomposition, type FxAssetBreakdown } from "@/lib/selectors/fxDecomposition";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { cn } from "@/lib/utils";
import { STICKY_FIRST_COLUMN_CLASS } from "@/components/ui/responsive-table";

interface FxDecompositionPanelProps {
  valuedItems: ValuedWatchlistItem[];
  usdBrlRate: number;
  isLoading: boolean;
  onSelectItem?: (item: ValuedWatchlistItem) => void;
}

export function FxDecompositionPanel({
  valuedItems,
  usdBrlRate,
  isLoading,
  onSelectItem,
}: FxDecompositionPanelProps) {
  const { locale, t } = useI18n();

  const summary = useMemo(() => {
    return computeFxDecomposition(valuedItems, usdBrlRate);
  }, [valuedItems, usdBrlRate]);

  if (!isLoading && summary.usAssets.length === 0) {
    return null;
  }

  const diagnosisLabelMap: Record<FxAssetBreakdown["diagnosisKey"], string> = {
    doubleGain: t.portfolio.fx.diagDoubleGain,
    assetDominant: t.portfolio.fx.diagAssetDominant,
    fxProtective: t.portfolio.fx.diagFxProtective,
    hedgeCompensated: t.portfolio.fx.diagHedgeCompensated,
    stable: t.portfolio.fx.diagStable,
  };

  const radarText = summary.isAboveMa
    ? t.portfolio.fx.radarAboveMa
        .replace("{{current}}", formatCurrency(summary.currentFxRate, "BRL", locale))
        .replace("{{diff}}", `+${summary.fxDiffMaPct.toFixed(1)}%`)
        .replace("{{ma}}", formatCurrency(summary.ma200FxRate, "BRL", locale))
    : t.portfolio.fx.radarBelowMa
        .replace("{{current}}", formatCurrency(summary.currentFxRate, "BRL", locale))
        .replace("{{diff}}", `${summary.fxDiffMaPct.toFixed(1)}%`)
        .replace("{{ma}}", formatCurrency(summary.ma200FxRate, "BRL", locale));

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 mb-6 shadow-sm dark:border-[#1F4235] dark:bg-[radial-gradient(circle_at_top_right,#152B24,#0D1A16_75%)]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-emerald-light">
            {t.portfolio.fx.eyebrow}
          </div>
          <h2 className="mt-1 font-serif text-xl font-semibold text-accent-gold">
            {t.portfolio.fx.title}
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            {t.portfolio.fx.subtitle}
          </p>
        </div>

        <div className="rounded-full border border-border/80 bg-surface-2 px-3.5 py-1.5 text-xs text-accent-gold">
          {t.portfolio.fx.avgFxRateLabel}{" "}
          <strong>R$ {summary.avgFxRate.toFixed(2)}</strong> (
          {t.portfolio.fx.currentFxRateLabel} R$ {summary.currentFxRate.toFixed(2)})
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* FX Summary 3 Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">
            <div className="rounded-xl border border-border/60 bg-surface-2/80 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.portfolio.fx.kpiAssetReturnTitle}
              </div>
              <div
                className={cn(
                  "my-1 font-serif text-xl font-bold",
                  summary.assetReturnPct >= 0 ? "text-accent-emerald-light" : "text-accent-red",
                )}
              >
                {summary.assetReturnPct > 0 ? "+" : ""}
                {summary.assetReturnPct.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {t.portfolio.fx.kpiAssetReturnSub}: {summary.assetGainUsd >= 0 ? "+" : ""}
                US$ {summary.assetGainUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-surface-2/80 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.portfolio.fx.kpiFxGainTitle}
              </div>
              <div
                className={cn(
                  "my-1 font-serif text-xl font-bold",
                  summary.fxGainPct >= 0 ? "text-accent-gold" : "text-accent-red",
                )}
              >
                {summary.fxGainPct > 0 ? "+" : ""}
                {summary.fxGainPct.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {t.portfolio.fx.kpiFxGainSub}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-surface-2/80 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.portfolio.fx.kpiTotalReturnTitle}
              </div>
              <div
                className={cn(
                  "my-1 font-serif text-xl font-bold",
                  summary.totalReturnBrlPct >= 0 ? "text-foreground dark:text-white" : "text-accent-red",
                )}
              >
                {summary.totalReturnBrlPct > 0 ? "+" : ""}
                {summary.totalReturnBrlPct.toFixed(2)}%
              </div>
              <div className="text-xs text-accent-emerald-light truncate">
                {t.portfolio.fx.kpiTotalReturnSub}: {summary.totalProfitBrl >= 0 ? "+" : ""}
                {formatCurrency(summary.totalProfitBrl, "BRL", locale)}
              </div>
            </div>
          </div>

          {/* FX Assets Breakdown Table */}
          <div className="overflow-x-auto scrollbar-thin rounded-xl border border-border/60 mb-4">
            <Table className="w-full min-w-[780px]">
              <TableHeader className="bg-surface-1">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className={cn(STICKY_FIRST_COLUMN_CLASS, "bg-surface-1 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]")}>
                    {t.portfolio.fx.columnAssetUs}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t.portfolio.fx.columnAvgCostUsd}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t.portfolio.fx.columnCurrentPriceUsd}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t.portfolio.fx.columnAssetReturnUsd}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t.portfolio.fx.columnAvgFx}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t.portfolio.fx.columnFxEffect}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t.portfolio.fx.columnTotalReturnBrl}
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t.portfolio.fx.columnDiagnosis}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.usAssets.map((asset) => {
                  const originalItem = valuedItems.find((i) => i.ticker === asset.ticker);
                  return (
                    <TableRow
                      key={asset.ticker}
                      onClick={() => originalItem && onSelectItem?.(originalItem)}
                      className="group border-border/40 hover:bg-surface-hover/80 cursor-pointer transition-colors"
                    >
                      <TableCell className={cn(STICKY_FIRST_COLUMN_CLASS, "bg-card group-hover:bg-surface-hover/80 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] transition-colors")}>
                        <div className="font-bold text-accent-gold text-base leading-tight">
                          {asset.ticker}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {asset.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        US$ {asset.avgCostUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        US$ {asset.currentPriceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-bold text-xs",
                            asset.assetReturnPct >= 0 ? "text-accent-emerald-light" : "text-accent-red",
                          )}
                        >
                          {asset.assetReturnPct > 0 ? "+" : ""}
                          {asset.assetReturnPct.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground">
                        R$ {asset.avgFx.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-semibold text-xs",
                            asset.fxReturnPct >= 0 ? "text-accent-gold" : "text-accent-red",
                          )}
                        >
                          {asset.fxReturnPct > 0 ? "+" : ""}
                          {asset.fxReturnPct.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-bold text-xs",
                            asset.totalReturnBrlPct >= 0 ? "text-foreground dark:text-white" : "text-accent-red",
                          )}
                        >
                          {asset.totalReturnBrlPct > 0 ? "+" : ""}
                          {asset.totalReturnBrlPct.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-accent-emerald-light font-medium">
                          {diagnosisLabelMap[asset.diagnosisKey]}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Tactical FX Radar Callout */}
          <div className="mt-4 rounded-r-lg border-l-4 border-accent-gold bg-surface-2/80 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-accent-gold dark:bg-[rgba(18,33,28,0.7)]">
            <div>
              <strong>{t.portfolio.fx.radarTitle} </strong>
              {radarText}
            </div>
            <span className="text-accent-emerald-light font-bold bg-accent-emerald-subtle px-2.5 py-1 rounded border border-accent-emerald/40 whitespace-nowrap">
              {summary.isAboveMa ? t.portfolio.fx.radarIdealB3 : t.portfolio.fx.radarIdealUS}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
