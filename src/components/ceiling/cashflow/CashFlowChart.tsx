import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Award, TrendingUp, CheckCircle, Clock } from "lucide-react";
import type { Currency } from "@/lib/domain";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { MonthBucket } from "@/lib/cashflow";
import { cn } from "@/lib/utils";
import { compactWithSymbol } from "./CashFlowSummary";
import type { ViewMode } from "./CashFlowHeader";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ChartGlowDef } from "@/components/ui/ChartGlowDef";
const COLOR_BAR = "var(--success)";
const COLOR_LINE = "var(--primary)";

interface Props {
  data: MonthBucket[];
  view: ViewMode;
  activeCurrency: Currency;
  bestMonth: MonthBucket | undefined;
  finalCumulative: number;
}

export function CashFlowChart({
  data,
  view,
  activeCurrency,
  bestMonth,
  finalCumulative,
}: Props) {
  const { locale, t } = useI18n();
  const currentMonthIndex = new Date().getMonth();

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: MonthBucket }>;
  }) => {
    if (!active || !payload || !payload.length) return null;
    const { month, amount, contributors, concentratedTicker, isBest, isWorst } =
      payload[0].payload;
    if (amount <= 0) return null;
    const topN = 4;
    const shown = contributors.slice(0, contributors.length > 5 ? topN : 5);
    const remaining = contributors.length - shown.length;
    return (
      <div className="min-w-[200px] rounded-lg border border-border/60 bg-background/95 px-3 py-2 shadow-xl backdrop-blur">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
            {isBest && <Award className="h-3 w-3 text-warning" />}
            {month}
          </span>
          <span
            className={cn(
              "text-xs font-semibold",
              isBest ? "text-warning" : isWorst ? "text-muted-foreground" : "text-success",
            )}
          >
            {formatCurrency(amount, activeCurrency, locale)}
          </span>
        </div>
        <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-muted-foreground">
          {payload[0].payload.paidAmount > 0 && (
            <span className="flex items-center gap-1 text-success">
              <CheckCircle className="h-3 w-3" />
              {t.tabs.chart.confirmed}: {formatCurrency(payload[0].payload.paidAmount, activeCurrency, locale)}
            </span>
          )}
          {payload[0].payload.announcedAmount > 0 && (
            <span className="flex items-center gap-1 text-foreground">
              <Clock className="h-3 w-3" />
              Provisioned: {formatCurrency(payload[0].payload.announcedAmount, activeCurrency, locale)}
            </span>
          )}
          {payload[0].payload.projectedAmount > 0 && (
            <span className="flex items-center gap-1 opacity-70">
              <TrendingUp className="h-3 w-3" />
              {t.tabs.chart.projected}: {formatCurrency(payload[0].payload.projectedAmount, activeCurrency, locale)}
            </span>
          )}
        </div>
        {concentratedTicker && (
          <div className="mt-1.5 flex items-center gap-1 rounded-md border border-warning/40 bg-warning/10 px-1.5 py-1 text-[10px] text-warning">
            <AlertTriangle className="h-3 w-3" />
            <span>
              {t.tabs.chart.concentratedIn}{" "}
              <span className="font-semibold">
                {concentratedTicker.replace(/\.SA$/i, "")}
              </span>
            </span>
          </div>
        )}
        {shown.length > 0 && (
          <>
            <div className="my-1.5 h-px bg-border/60" />
            <ul className="space-y-1">
              {shown.map((c) => (
                <li
                  key={c.ticker}
                  className="flex items-baseline justify-between gap-3 text-[11px]"
                >
                  <span className="font-medium text-muted-foreground">
                    {c.ticker.replace(/\.SA$/i, "")}
                  </span>
                  <span className="tabular-nums text-foreground">
                    {formatCurrency(c.amount, activeCurrency, locale)}
                  </span>
                </li>
              ))}
              {remaining > 0 && (
                <li className="pt-0.5 text-[11px] italic text-muted-foreground">
                  + {remaining} {t.tabs.chart.more}
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          {view !== "line" && (
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-3 rounded-sm"
                style={{ backgroundColor: COLOR_BAR }}
              />
              {t.tabs.chart.monthly}
            </span>
          )}
          {view !== "bars" && (
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-0.5 w-4"
                style={{ backgroundColor: COLOR_LINE }}
              />
              {t.tabs.chart.cumulative}
            </span>
          )}
          {view !== "line" && bestMonth && (
            <span className="inline-flex items-center gap-1 text-warning">
              <Award className="h-3 w-3" />
              {t.tabs.chart.bestMonth}
            </span>
          )}
        </div>
        {view !== "bars" && finalCumulative > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-warning">
            <TrendingUp className="h-3 w-3" />
            {t.tabs.chart.yearEnd}:{" "}
            <span className="font-semibold tabular-nums">
              {compactWithSymbol(finalCumulative, activeCurrency, locale)}
            </span>
          </span>
        )}
      </div>

      <div className="h-64 w-full">
        <ChartContainer config={{}} className="h-full w-full">
          <ComposedChart data={data} margin={{ top: 24, right: 48, left: 0, bottom: 0 }}>
            <defs>
              <pattern id="striped" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="2" height="4" fill={COLOR_BAR} />
                <rect x="2" width="2" height="4" fill="transparent" />
              </pattern>
              <ChartGlowDef />
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="oklch(0.4 0.02 250 / 0.25)"
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 11 }}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 10 }}
              tickFormatter={(v: number) => compactWithSymbol(v, activeCurrency, locale)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 10 }}
              tickFormatter={(v: number) => compactWithSymbol(v, activeCurrency, locale)}
            />
            <ChartTooltip
              cursor={{ fill: "oklch(0.7 0.15 160 / 0.08)" }}
              content={<CustomTooltip />}
            />

            {view !== "line" && <Bar yAxisId="left" dataKey="paidAmount" stackId="a" fill={COLOR_BAR} maxBarSize={40} />}
            {view !== "line" && <Bar yAxisId="left" dataKey="announcedAmount" stackId="a" fill="url(#striped)" maxBarSize={40} />}
            {view !== "line" && <Bar yAxisId="left" dataKey="projectedAmount" stackId="a" fill={COLOR_BAR} fillOpacity={0.4} maxBarSize={40} radius={[4, 4, 0, 0]} />}
            {view !== "bars" && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeTotal"
                stroke={COLOR_LINE}
                strokeWidth={2}
                dot={{ r: 3, fill: COLOR_LINE }}
                activeDot={{ r: 5, fill: COLOR_LINE, stroke: "none" }}
                filter="url(#glowLine)"
              />
            )}
            {view !== "line" && bestMonth && (
              <ReferenceLine 
                x={bestMonth.month} 
                yAxisId="left"
                stroke="var(--warning)" 
                strokeDasharray="3 3"
                label={{ position: 'top', value: '🏆', fill: 'var(--warning)', fontSize: 14 }}
              />
            )}
          </ComposedChart>
        </ChartContainer>
      </div>
    </>
  );
}
