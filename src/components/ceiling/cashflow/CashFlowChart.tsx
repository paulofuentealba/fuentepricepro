import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Award, TrendingUp, CheckCircle, Clock, ChevronLeft } from "lucide-react";
import type { Currency } from "@/lib/domain";
import { formatCurrency } from "@/lib/i18n";
import { useUserSettings } from "@/lib/useUserSettings";
import { displayTicker } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { MonthBucket, InvestedVsReceivedItem } from "@/lib/cashflow";
import { cn } from "@/lib/utils";
import { compactWithSymbol } from "./CashFlowSummary";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ChartGlowDef } from "@/components/ui/ChartGlowDef";

const COLOR_BAR = "var(--success)";
const COLOR_LINE = "var(--primary)";
const COLOR_INVESTED = "oklch(0.55 0.02 250)";

interface Props {
  data: MonthBucket[];
  activeCurrency: Currency;
  bestMonth: MonthBucket | undefined;
  finalCumulative: number;
  investedVsReceived: InvestedVsReceivedItem[];
}

export function CashFlowChart({ data, activeCurrency, bestMonth, finalCumulative, investedVsReceived }: Props) {
  const { locale, t } = useI18n();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  const selectedMonthData = selectedMonthIndex !== null ? data[selectedMonthIndex] : null;

  // Take top 8 contributors to fit in a small horizontal bar chart without scrolling
  const breakdownData =
    selectedMonthData?.contributors.slice(0, 8).map((c) => ({
      ticker: c.ticker,
      amount: c.paidAmount !== undefined ? c.paidAmount : c.amount,
    })) || [];

  const handleBarClick = (entry: any, index: number) => {
    if (selectedMonthIndex === index) {
      setSelectedMonthIndex(null); // toggle off
    } else {
      setSelectedMonthIndex(index);
    }
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: MonthBucket }>;
  }) => {
    if (!active || !payload || !payload.length) return null;
    const { month, amount, contributors, concentratedTicker, isBest, isWorst } = payload[0].payload;
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
              {t.tabs.chart.confirmed}:{" "}
              {formatCurrency(payload[0].payload.paidAmount, activeCurrency, locale)}
            </span>
          )}
          {payload[0].payload.announcedAmount > 0 && (
            <span className="flex items-center gap-1 text-foreground">
              <Clock className="h-3 w-3" />
              {t.tabs.chart.provisioned}:{" "}
              {formatCurrency(payload[0].payload.announcedAmount, activeCurrency, locale)}
            </span>
          )}
          {payload[0].payload.projectedAmount > 0 && (
            <span className="flex items-center gap-1 opacity-70">
              <TrendingUp className="h-3 w-3" />
              {t.tabs.chart.projected}:{" "}
              {formatCurrency(payload[0].payload.projectedAmount, activeCurrency, locale)}
            </span>
          )}
        </div>
        {concentratedTicker && (
          <div className="mt-1.5 flex items-center gap-1 rounded-md border border-warning/40 bg-warning/10 px-1.5 py-1 text-[10px] text-warning">
            <AlertTriangle className="h-3 w-3" />
            <span>
              {t.tabs.chart.concentratedIn}{" "}
              <span className="font-semibold">{concentratedTicker}</span>
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
                    {displayTicker(c.ticker)}
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
        <div className="mt-2 text-[9px] text-center text-muted-foreground/50 uppercase tracking-widest">
          {t.tabs.chart.clickToDrillDown}
        </div>
      </div>
    );
  };

  const BreakdownTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const { ticker, amount } = payload[0].payload;
    return (
      <div className="rounded-md border border-border/60 bg-background/95 px-2 py-1 shadow-md backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{displayTicker(ticker)}</span>
          <span className="text-xs text-success">
            {formatCurrency(amount, activeCurrency, locale)}
          </span>
        </div>
      </div>
    );
  };

  const CumulativeTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const { month, cumulativeTotal } = payload[0].payload;
    return (
      <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 shadow-md backdrop-blur">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
            {t.tabs.chart.cumulative} • {month}
          </span>
          <span className="text-sm font-bold text-primary">
            {formatCurrency(cumulativeTotal, activeCurrency, locale)}
          </span>
        </div>
      </div>
    );
  };

  const InvestedVsReceivedTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload as InvestedVsReceivedItem;
    return (
      <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 shadow-md backdrop-blur">
        <p className="mb-1 text-xs font-semibold text-foreground">{displayTicker(item.ticker)}</p>
        <div className="flex flex-col gap-0.5 text-[11px]">
          <span className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t.tabs.chart.invested}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {compactWithSymbol(item.invested, activeCurrency, locale)}
            </span>
          </span>
          <span className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t.tabs.chart.received}</span>
            <span className="font-semibold tabular-nums text-success">
              {compactWithSymbol(item.received, activeCurrency, locale)}
            </span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Monthly Bar Chart */}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <span
                className="inline-block h-2 w-3 rounded-sm"
                style={{ backgroundColor: COLOR_BAR }}
              />
              {t.tabs.chart.monthly}
            </span>
            {bestMonth && (
              <span className="inline-flex items-center gap-1 text-warning">
                <Award className="h-3 w-3" />
                {t.tabs.chart.bestMonth}
              </span>
            )}
          </div>

          <div className="h-[280px] w-full">
            <ChartContainer config={{}} className="h-full w-full">
              <BarChart data={data} margin={{ top: 24, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <pattern
                    id="striped"
                    width="4"
                    height="4"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
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
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={({ x, y, payload }) => {
                    const isSelected =
                      selectedMonthIndex !== null && data[selectedMonthIndex].month === payload.value;
                    return (
                      <text
                        x={x}
                        y={y + 12}
                        fill={isSelected ? "var(--foreground)" : "oklch(0.6 0.02 250)"}
                        className="text-[9px] sm:text-[11px]"
                        fontWeight={isSelected ? 600 : 400}
                        textAnchor="middle"
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 10 }}
                  tickFormatter={(v: number) => compactWithSymbol(v, activeCurrency, locale)}
                />
                <ChartTooltip
                  cursor={{ fill: "oklch(0.7 0.15 160 / 0.08)" }}
                  content={<CustomTooltip />}
                />

                <Bar
                  dataKey="paidAmount"
                  stackId="a"
                  fill={COLOR_BAR}
                  maxBarSize={40}
                  onClick={handleBarClick}
                  cursor="pointer"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-paid-${index}`}
                      fillOpacity={
                        selectedMonthIndex === null || selectedMonthIndex === index ? 1 : 0.3
                      }
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="announcedAmount"
                  stackId="a"
                  fill="url(#striped)"
                  maxBarSize={40}
                  onClick={handleBarClick}
                  cursor="pointer"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-ann-${index}`}
                      fillOpacity={
                        selectedMonthIndex === null || selectedMonthIndex === index ? 1 : 0.3
                      }
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="projectedAmount"
                  stackId="a"
                  fill={COLOR_BAR}
                  maxBarSize={40}
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                  cursor="pointer"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-proj-${index}`}
                      fillOpacity={
                        selectedMonthIndex === null || selectedMonthIndex === index ? 0.4 : 0.15
                      }
                    />
                  ))}
                </Bar>

                {bestMonth && (
                  <ReferenceLine
                    x={bestMonth.month}
                    stroke="var(--warning)"
                    strokeDasharray="3 3"
                    label={{ position: "top", value: "🏆", fill: "var(--warning)", fontSize: 14 }}
                  />
                )}
                {data.find((d) => d.isStartMonth) && (
                  <ReferenceLine
                    x={data.find((d) => d.isStartMonth)?.month}
                    stroke="var(--foreground)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{
                      position: "insideBottomLeft",
                      value: t.tabs.chart.journeyStart,
                      fill: "var(--foreground)",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* RIGHT: Cumulative Area OR Drill-down Bar */}
        <div className="flex flex-col relative">
          <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground h-[20px]">
            {selectedMonthData ? (
              <button
                onClick={() => setSelectedMonthIndex(null)}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                {t.tabs.chart.backToCumulative.replace("{month}", selectedMonthData.month)}
              </button>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <span
                    className="inline-block h-2 w-3 rounded-sm"
                    style={{ backgroundColor: COLOR_LINE }}
                  />
                  {t.tabs.chart.cumulative}
                </span>
                {finalCumulative > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-warning">
                    <TrendingUp className="h-3 w-3" />
                    {t.tabs.chart.yearEnd}:{" "}
                    <span className="font-semibold tabular-nums">
                      {compactWithSymbol(finalCumulative, activeCurrency, locale)}
                    </span>
                  </span>
                )}
              </>
            )}
          </div>

          <div className="h-[280px] w-full">
            {selectedMonthData ? (
              <ChartContainer
                config={{}}
                className="h-full w-full animate-in fade-in zoom-in-95 duration-300"
              >
                <BarChart
                  data={breakdownData}
                  layout="vertical"
                  margin={{ top: 24, right: 80, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    horizontal={true}
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="oklch(0.4 0.02 250 / 0.25)"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="ticker"
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tick={{ fill: "oklch(0.8 0.02 250)", fontSize: 11, fontWeight: 500 }}
                  />
                  <ChartTooltip
                    cursor={{ fill: "oklch(0.7 0.15 160 / 0.08)" }}
                    content={<BreakdownTooltip />}
                  />
                  <Bar dataKey="amount" fill={COLOR_LINE} radius={[0, 4, 4, 0]} barSize={20}>
                    <LabelList
                      dataKey="amount"
                      position="right"
                      formatter={(v: number) => compactWithSymbol(v, activeCurrency, locale)}
                      style={{ fill: "oklch(0.75 0.02 250)", fontSize: 10 }}
                    />
                    {breakdownData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fillOpacity={0.8 + 0.2 * (1 - index / breakdownData.length)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <ChartContainer
                config={{}}
                className="h-full w-full animate-in fade-in zoom-in-95 duration-300"
              >
                <AreaChart data={data} margin={{ top: 24, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLOR_LINE} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLOR_LINE} stopOpacity={0.0} />
                    </linearGradient>
                    <ChartGlowDef />
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="oklch(0.4 0.02 250 / 0.25)"
                  />
                  <XAxis
                    dataKey="month"
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={y + 12}
                        fill="oklch(0.6 0.02 250)"
                        className="text-[9px] sm:text-[11px]"
                        textAnchor="middle"
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 10 }}
                    tickFormatter={(v: number) => compactWithSymbol(v, activeCurrency, locale)}
                  />
                  <ChartTooltip
                    cursor={{
                      stroke: "oklch(0.7 0.15 160 / 0.2)",
                      strokeWidth: 2,
                      fill: "transparent",
                    }}
                    content={<CumulativeTooltip />}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeTotal"
                    stroke={COLOR_LINE}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCumulative)"
                    activeDot={{ r: 6, fill: COLOR_LINE, stroke: "none" }}
                    filter="url(#glowLine)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        </div>
      </div>

      {/* THIRD CHART: Invested vs. Received per asset */}
      {investedVsReceived.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 flex items-center gap-3 px-1 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{t.tabs.chart.investedVsReceived}</span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR_INVESTED }} />
              {t.tabs.chart.invested}
              <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR_BAR }} />
              {t.tabs.chart.received}
            </span>
          </div>
          <div className="h-[220px] w-full">
            <ChartContainer config={{}} className="h-full w-full">
              <BarChart
                data={investedVsReceived}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="20%"
                barGap={2}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="oklch(0.4 0.02 250 / 0.25)"
                />
                <XAxis
                  dataKey="ticker"
                  tickLine={false}
                  axisLine={false}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y + 12}
                      fill="oklch(0.6 0.02 250)"
                      fontSize={10}
                      textAnchor="middle"
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 10 }}
                  tickFormatter={(v: number) => compactWithSymbol(v, activeCurrency, locale)}
                />
                <ChartTooltip
                  cursor={{ fill: "oklch(0.7 0.15 160 / 0.08)" }}
                  content={<InvestedVsReceivedTooltip />}
                />
                <Bar dataKey="invested" fill={COLOR_INVESTED} radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.75} />
                <Bar dataKey="received" fill={COLOR_BAR} radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.9} />
              </BarChart>
            </ChartContainer>
          </div>
          <p className="mt-1 px-1 text-[9px] text-muted-foreground/60 italic">
            {t.tabs.chart.quantityNote}
          </p>
        </div>
      )}
    </div>
  );
}
