import type { Asset } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { formatCompactCurrency, formatNumber, formatPercent } from "@/lib/i18n";

interface Tile {
  label: string;
  value: string | null;
}

const n = (v: number | null, fmt: (x: number) => string): string | null =>
  v == null ? null : fmt(v);

function isFund(type: Asset["type"]) {
  return type === "REIT" || type === "FII" || type === "FII_INFRA" || type === "FIAGRO";
}

export function IndicatorGrid({ asset }: { asset: Asset }) {
  const { t, locale } = useI18n();
  const m = asset.metrics;

  let tiles: Tile[] = [];
  if (asset.type === "ETF") {
    tiles = [
      {
        label: t.metrics.expenseRatio,
        value: n(m.expenseRatio, (x) => formatPercent(x, locale, 2)),
      },
      { label: t.metrics.currentDy, value: n(m.currentDy, (x) => formatPercent(x, locale, 2)) },
      {
        label: t.metrics.aum,
        value: n(m.aum, (x) => formatCompactCurrency(x, asset.currency, locale)),
      },
      {
        label: t.metrics.dividendCagr5y,
        value: n(m.dividendCagr5y, (x) => formatPercent(x, locale, 2)),
      },
    ];
  } else if (isFund(asset.type)) {
    tiles = [
      { label: t.metrics.pbRatio, value: n(m.pbRatio, (x) => formatNumber(x, locale, 2)) },
      { label: t.metrics.currentDy, value: n(m.currentDy, (x) => formatPercent(x, locale, 2)) },
      { label: t.metrics.capRate, value: n(m.capRate, (x) => formatPercent(x, locale, 2)) },
      {
        label: t.metrics.dividendCagr5y,
        value: n(m.dividendCagr5y, (x) => formatPercent(x, locale, 2)),
      },
    ];
  } else {
    tiles = [
      { label: t.metrics.peRatio, value: n(m.peRatio, (x) => formatNumber(x, locale, 2)) },
      { label: t.metrics.roe, value: n(m.roe, (x) => formatPercent(x, locale, 1)) },
      { label: t.metrics.payoutRatio, value: n(m.payoutRatio, (x) => formatPercent(x, locale, 1)) },
      {
        label: t.metrics.dividendCagr5y,
        value: n(m.dividendCagr5y, (x) => formatPercent(x, locale, 2)),
      },
    ];
  }

  const visible = tiles.filter((tile) => tile.value != null);
  if (visible.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t.result.marketIndicators}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visible.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">{tile.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
