import type { Asset } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { formatCompactCurrency, formatNumber, formatPercent, toIntlLocale } from "@/lib/i18n";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useQuery } from "@tanstack/react-query";
import { assetQueryOptions } from "@/lib/queryOptions";
import { cn } from "@/lib/utils";

interface Tile {
  label: string;
  value: string | null;
  tooltip?: string;
  isWarning?: boolean;
}

const n = (v: number | null, fmt: (x: number) => string): string | null =>
  v == null ? null : fmt(v);

function isFund(type: Asset["type"]) {
  return type === "REIT" || type === "FII" || type === "FII_INFRA" || type === "FIAGRO";
}

export function IndicatorGrid({ asset }: { asset: Asset }) {
  const { t, locale } = useI18n();
  const m = asset.metrics;

  const { dataUpdatedAt } = useQuery(assetQueryOptions(asset.ticker));

  const updatedTime = dataUpdatedAt
    ? new Intl.DateTimeFormat(toIntlLocale(locale), {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dataUpdatedAt)
    : null;

  let tiles: Tile[] = [];
  if (asset.type === "ETF") {
    tiles = [
      {
        label: t.metrics.expenseRatio,
        value: n(m.expenseRatio, (x) => formatPercent(x, locale, 2)),
        tooltip: t.tooltips?.expenseRatio,
      },
      {
        label: t.metrics.currentDy,
        value: n(m.currentDy, (x) => formatPercent(x, locale, 2)),
        tooltip: t.tooltips?.currentDy,
      },
      {
        label: t.metrics.aum,
        value: n(m.aum, (x) => formatCompactCurrency(x, asset.currency, locale)),
        tooltip: t.tooltips?.aum,
      },
      {
        label: t.metrics.dividendCagr5y,
        value: n(m.dividendCagr5y, (x) => formatPercent(x, locale, 2)),
        tooltip: t.tooltips?.cagr,
        isWarning: m.dividendCagr5y != null && m.dividendCagr5y < 0,
      },
    ];
  } else if (isFund(asset.type)) {
    tiles = [
      {
        label: t.metrics.pbRatio,
        value: n(m.pbRatio, (x) => formatNumber(x, locale, 2)),
        tooltip: t.tooltips?.pbRatio,
      },
      {
        label: t.metrics.currentDy,
        value: n(m.currentDy, (x) => formatPercent(x, locale, 2)),
        tooltip: t.tooltips?.currentDy,
      },
      {
        label: t.metrics.capRate,
        value: n(m.capRate, (x) => formatPercent(x, locale, 2)),
        tooltip: t.tooltips?.capRate,
      },
      {
        label: t.metrics.dividendCagr5y,
        value: n(m.dividendCagr5y, (x) => formatPercent(x, locale, 2)),
        tooltip: t.tooltips?.cagr,
        isWarning: m.dividendCagr5y != null && m.dividendCagr5y < 0,
      },
    ];
  } else {
    tiles = [
      {
        label: t.metrics.peRatio,
        value: n(m.peRatio, (x) => formatNumber(x, locale, 2)),
        tooltip: t.tooltips?.peRatio,
      },
      {
        label: t.metrics.roe,
        value: n(m.roe, (x) => formatPercent(x, locale, 1)),
        tooltip: t.tooltips?.roe,
      },
      {
        label: t.metrics.payoutRatio,
        value: n(m.payoutRatio, (x) => formatPercent(x, locale, 1)),
        tooltip: t.tooltips?.payout,
      },
      {
        label: t.metrics.dividendCagr5y,
        value: n(m.dividendCagr5y, (x) => formatPercent(x, locale, 2)),
        tooltip: t.tooltips?.cagr,
        isWarning: m.dividendCagr5y != null && m.dividendCagr5y < 0,
      },
    ];
  }

  const visible = tiles.filter((tile) => tile.value != null);
  if (visible.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t.result.marketIndicators}
        </h3>
        {updatedTime && (
          <span className="text-[10px] text-muted-foreground/70 font-mono">
            {t.result.updatedAt}: {updatedTime}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visible.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="flex items-center justify-between gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>{tile.label}</span>
              {tile.tooltip && <InfoTooltip content={tile.tooltip} />}
            </div>
            <div
              className={cn(
                "mt-1 text-sm font-semibold",
                tile.isWarning ? "text-warning" : "text-foreground",
              )}
            >
              {tile.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
