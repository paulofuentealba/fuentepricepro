import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import type { RealizedIncomeEvent } from "@/lib/realizedIncome";
import type { Currency } from "@/lib/domain";
import { groupRealizedIncomeByMonth } from "@/lib/realizedIncome";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

const COLOR_REALIZED = "var(--realized)";
const COLOR_PROJECTED = "var(--projected)";

interface Props {
  events: RealizedIncomeEvent[];
  currency: Currency;
}

export function AssetMonthlyDividendChart({ events, currency }: Props) {
  const { t, locale } = useI18n();

  const chartData = useMemo(() => {
    return groupRealizedIncomeByMonth(events, undefined, locale);
  }, [events, locale]);

  if (chartData.length === 0) {
    return null;
  }

  const hasProjected = chartData.some((d) => d.isFuture || d.announcedAmount > 0);
  const hasRealized = chartData.some((d) => !d.isFuture && d.paidAmount > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const isFutureOrAnnounced = Boolean(data.isFuture) || (data.paidAmount === 0 && data.announcedAmount > 0);
    const isMixed = data.paidAmount > 0 && data.announcedAmount > 0;
    const receivableLabel = t.tabs.chart.receivableAnnounced || t.watchlist.receivableIncome;

    return (
      <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
        <p className="font-semibold text-foreground mb-0.5">{data.monthLabel}</p>
        {isMixed ? (
          <div className="space-y-1 my-1">
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-muted-foreground">{t.watchlist.receivedIncome}:</span>
              <span className="font-semibold" style={{ color: COLOR_REALIZED }}>
                {formatCurrency(data.paidAmount, currency, locale)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-muted-foreground">{receivableLabel}:</span>
              <span className="font-semibold" style={{ color: COLOR_PROJECTED }}>
                {formatCurrency(data.announcedAmount, currency, locale)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground mb-1">
            {isFutureOrAnnounced ? receivableLabel : t.watchlist.receivedIncome}
          </p>
        )}
        <p className="font-semibold" style={{ color: isFutureOrAnnounced ? COLOR_PROJECTED : COLOR_REALIZED }}>
          {formatCurrency(data.amountNet, currency, locale)}
        </p>
      </div>
    );
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/40">
      {/* Legend header with Horizonte FI / CashFlow standard tokens */}
      <div className="flex items-center justify-end gap-3 mb-2 flex-wrap text-[11px]">
        {hasRealized && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_REALIZED }} />
            <span>{t.watchlist.receivedIncome}</span>
          </div>
        )}
        {hasProjected && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: `repeating-linear-gradient(45deg, ${COLOR_PROJECTED}, ${COLOR_PROJECTED} 2px, transparent 2px, transparent 4px)`,
              }}
            />
            <span>{t.tabs.chart.receivableAnnounced || t.watchlist.receivableIncome}</span>
          </div>
        )}
      </div>

      <div className="h-[140px] w-full">
        <ChartContainer config={{}} className="h-full w-full">
          <BarChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <pattern
                id="asset-projected-hatch"
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke={COLOR_PROJECTED}
                  strokeWidth="2.5"
                  strokeOpacity="0.85"
                />
              </pattern>
            </defs>

            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={45}
              tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
              }
            />
            <ChartTooltip content={<CustomTooltip />} />
            <Bar dataKey="amountNet" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((entry, index) => {
                const isUnsettled = entry.isFuture || (entry.paidAmount === 0 && entry.announcedAmount > 0);
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isUnsettled ? "url(#asset-projected-hatch)" : COLOR_REALIZED}
                    stroke={isUnsettled ? COLOR_PROJECTED : undefined}
                    strokeWidth={isUnsettled ? 1 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
