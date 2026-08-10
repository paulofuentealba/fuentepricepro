import { useMemo } from "react";
import { Bar, ComposedChart, Cell, Line, XAxis, YAxis } from "recharts";
import type { Asset } from "@/lib/domain";

const DIVIDEND_HISTORY_CHART_CONFIG = { amount: { color: "var(--success)" }, yoy: { color: "var(--warning)" } };
const DIVIDEND_HISTORY_CHART_MARGIN = { top: 12, right: 4, left: 4, bottom: 0 };
const DIVIDEND_HISTORY_TOOLTIP_CURSOR = { fill: "color-mix(in oklab, var(--muted-foreground) 12%, transparent)" };

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency, type Locale } from "@/lib/i18n";
import { ChartGlowDef } from "@/components/ui/ChartGlowDef";
import { useI18n } from "@/lib/i18n-provider";

interface Props {
  data: Asset["dividendHistory"];
  currency: Asset["currency"];
  locale: Locale;
  title: string;
}

export function DividendHistoryChart({ data, currency, locale, title }: Props) {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    return data.map((d, i) => {
      let yoy = 0;
      if (i > 0 && data[i - 1].amount > 0) {
        yoy = (d.amount - data[i - 1].amount) / data[i - 1].amount;
      }
      return { ...d, yoy: yoy * 100 };
    });
  }, [data]);

  const max = Math.max(...data.map((d) => d.amount), 0);
  return (
    <div className="rounded-xl border border-border/50 bg-background/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="h-36 w-full">
        <ChartContainer
          config={DIVIDEND_HISTORY_CHART_CONFIG}
          className="h-full w-full"
        >
          <ComposedChart data={chartData} margin={DIVIDEND_HISTORY_CHART_MARGIN}>
            <defs>
              <ChartGlowDef />
            </defs>
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis yAxisId="left" hide domain={[0, "dataMax"]} />
            <YAxis
              yAxisId="right"
              hide
              orientation="right"
              domain={["dataMin - 10", "dataMax + 10"]}
            />
            <ChartTooltip
              cursor={DIVIDEND_HISTORY_TOOLTIP_CURSOR}
              content={
                <ChartTooltipContent
                  formatter={(v: any, name: any) => {
                    if (name === "yoy") return [`${v.toFixed(1)}%`, t.result.yoyGrowth];
                    return [formatCurrency(v, currency, locale), t.result.dividends];
                  }}
                />
              }
            />
            <Bar yAxisId="left" dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={44}>
              {chartData.map((d) => (
                <Cell
                  key={d.year}
                  fill="var(--color-amount)"
                  fillOpacity={max > 0 ? 0.45 + 0.55 * (d.amount / max) : 0.6}
                />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="yoy"
              stroke="var(--color-yoy)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-yoy)" }}
              activeDot={{ r: 5, fill: "var(--color-yoy)", stroke: "none" }}
              filter="url(#glowLine)"
            />
          </ComposedChart>
        </ChartContainer>
      </div>
      <div className="mt-3 flex items-center justify-center gap-6 text-[10px] uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm bg-success" />
          <span>{t.result.dividends}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-4 rounded-full bg-warning" />
          <span>{t.result.yoyGrowth}</span>
        </div>
      </div>
    </div>
  );
}
