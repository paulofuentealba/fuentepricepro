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

  const hasProjected = chartData.some((d) => d.isFuture);
  const hasRealized = chartData.some((d) => !d.isFuture);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const isFuture = Boolean(data.isFuture);

    return (
      <div className="rounded-lg border border-border/60 bg-background/95 px-3 py-2 shadow-xl backdrop-blur text-xs">
        <p className="font-semibold text-foreground mb-0.5">{data.monthLabel}</p>
        <p className="text-[11px] text-muted-foreground mb-1">
          {isFuture ? t.watchlist.receivableIncome : t.watchlist.receivedIncome}
        </p>
        <p className="font-semibold" style={{ color: isFuture ? COLOR_PROJECTED : COLOR_REALIZED }}>
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
            <span>{t.watchlist.receivableIncome}</span>
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
                  y="0"
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
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isFuture ? "url(#asset-projected-hatch)" : COLOR_REALIZED}
                  stroke={entry.isFuture ? COLOR_PROJECTED : undefined}
                  strokeWidth={entry.isFuture ? 1 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
