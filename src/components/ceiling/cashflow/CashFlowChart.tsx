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
const COLOR_REALIZED = "var(--realized)";
const COLOR_ANNOUNCED = "hsl(38 92% 50%)"; // Amber/gold tone for declared receivable dividends
const COLOR_PROJECTED = "var(--projected)";
const COLOR_GRID = "var(--chart-grid)";

const CASHFLOW_EMPTY_CHART_CONFIG = {};
const CASHFLOW_MAIN_BAR_MARGIN = { top: 24, right: 0, left: 0, bottom: 0 };
const CASHFLOW_BREAKDOWN_BAR_MARGIN = { top: 24, right: 80, left: 0, bottom: 0 };

const COLOR_LINE = "var(--primary)";
const COLOR_INVESTED = "var(--comparison)";
const COLOR_MUTED_FG = "var(--muted-foreground)";
const COLOR_FOREGROUND = "var(--foreground)";
const COLOR_CURSOR = "color-mix(in oklab, var(--primary) 8%, transparent)";
const COLOR_CURSOR_STRONG = "color-mix(in oklab, var(--primary) 20%, transparent)";

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

  // Granular 3-state chart data
  const chartData = data.map((bucket) => ({
    ...bucket,
    realizedAmount: bucket.realizedAmount,
    announcedAmount: bucket.announcedAmount,
    projectedAmount: bucket.projectedAmount,
  }));

  // Take top 8 contributors to fit in a small horizontal bar chart without scrolling
  const breakdownData =
    selectedMonthData?.contributors.slice(0, 8).map((c) => ({
      ticker: c.ticker,
      amount: (c.paidAmount ?? 0) + (c.announcedAmount ?? 0) > 0
        ? (c.paidAmount ?? 0) + (c.announcedAmount ?? 0)
        : c.amount,
      paidAmount: c.paidAmount ?? 0,
      announcedAmount: c.announcedAmount ?? 0,
      paymentDate: c.paymentDate,
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
    const bucket = payload[0].payload;
    const { month, contributors, concentratedTicker, isBest, isWorst } = bucket;

    // Granular 3 states: Recebidos, A Receber (Declarados), Estimados
    const realizedSum = bucket.realizedAmount || 0;
    const announcedSum = bucket.announcedAmount || 0;
    const projectedSum = bucket.projectedAmount || 0;
    const effectiveTotal = realizedSum + announcedSum + projectedSum > 0
      ? realizedSum + announcedSum + projectedSum
      : bucket.amount;

    if (effectiveTotal <= 0) return null;
    const topN = 4;
    const shown = contributors.slice(0, contributors.length > 5 ? topN : 5);
    const remaining = contributors.length - shown.length;

    // Find announced payment dates for context badge
    const announcedDates = contributors
      .filter((c) => (c.announcedAmount ?? 0) > 0 && c.paymentDate)
      .map((c) => {
        const parts = c.paymentDate!.split("-");
        return `${parts[2]}/${parts[1]}`;
      });
    const dateSuffix = announcedDates.length > 0 ? ` · ${announcedDates[0]}` : "";

    return (
      <div className="min-w-[230px] rounded-lg border border-border bg-popover p-3 shadow-md">
        <div className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 mb-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            {isBest && <Award className="h-3.5 w-3.5 text-warning" />}
            {month}
          </span>
          <span
            className="text-xs font-bold tabular-nums"
            style={{
              color: isBest
                ? "var(--warning)"
                : isWorst
                  ? "var(--muted-foreground)"
                  : "var(--foreground)",
            }}
          >
            {formatCurrency(effectiveTotal, activeCurrency, locale)}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 text-[11px]">
          {realizedSum > 0 && (
            <div className="flex items-center justify-between font-medium text-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" style={{ color: COLOR_REALIZED }} />
                <span>{t.tabs.chart.receivedDividends}</span>
              </span>
              <span className="tabular-nums font-semibold" style={{ color: COLOR_REALIZED }}>
                {formatCurrency(realizedSum, activeCurrency, locale)}
              </span>
            </div>
          )}

          {announcedSum > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between font-medium text-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-warning" />
                  <span>{t.tabs.chart.receivableAnnounced}{dateSuffix}</span>
                </span>
                <span className="tabular-nums font-semibold text-warning">
                  {formatCurrency(announcedSum, activeCurrency, locale)}
                </span>
              </div>
              <span className="text-[9px] text-muted-foreground/80 italic pl-5">
                {t.tabs.chart.receivableAnnouncedTooltip}
              </span>
            </div>
          )}

          {projectedSum > 0 && (
            <div className="flex items-center justify-between font-medium text-foreground">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t.tabs.chart.estimatedProjection}</span>
              </span>
              <span className="tabular-nums font-semibold text-muted-foreground">
                {formatCurrency(projectedSum, activeCurrency, locale)}
              </span>
            </div>
          )}

          <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-1.5 text-xs font-bold text-foreground">
            <span>{t.tabs.chart.totalMonth}</span>
            <span className="tabular-nums">
              {formatCurrency(effectiveTotal, activeCurrency, locale)}
            </span>
          </div>
        </div>
        {concentratedTicker && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[10px] text-warning">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>
              {t.tabs.chart.concentratedIn}{" "}
              <span className="font-bold">{concentratedTicker}</span>
            </span>
          </div>
        )}
        {shown.length > 0 && (
          <>
            <div className="my-2 h-px bg-border/40" />
            <ul className="space-y-1">
              {shown.map((c) => {
                const itemAmount = (c.paidAmount ?? 0) + (c.announcedAmount ?? 0) > 0
                  ? (c.paidAmount ?? 0) + (c.announcedAmount ?? 0)
                  : c.amount;
                return (
                  <li
                    key={c.ticker}
                    className="flex items-baseline justify-between gap-3 text-[11px]"
                  >
                    <span className="font-medium text-muted-foreground">
                      {displayTicker(c.ticker)}
                    </span>
                    <span className="tabular-nums text-foreground">
                      {formatCurrency(itemAmount, activeCurrency, locale)}
                    </span>
                  </li>
                );
              })}
              {remaining > 0 && (
                <li className="pt-0.5 text-[10px] italic text-muted-foreground">
                  + {remaining} {t.tabs.chart.more}
                </li>
              )}
            </ul>
          </>
        )}
        <div className="mt-2 text-[9px] text-center text-muted-foreground/60 uppercase tracking-wider">
          {t.tabs.chart.clickToDrillDown}
        </div>
      </div>
    );
  };

  const BreakdownTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload;
    const { ticker, amount, paidAmount, announcedAmount, paymentDate } = entry;
    const isPaid = paidAmount > 0 && announcedAmount === 0;
    const isAnnounced = announcedAmount > 0;

    return (
      <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-md text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-foreground">{displayTicker(ticker)}</span>
          <span
            className="font-bold"
            style={{
              color: isPaid ? COLOR_REALIZED : isAnnounced ? COLOR_ANNOUNCED : COLOR_LINE,
            }}
          >
            {formatCurrency(amount, activeCurrency, locale)}
          </span>
        </div>
        {isAnnounced && paymentDate && (
          <p className="text-[10px] text-warning font-medium mt-0.5">
            {t.tabs.chart.receivableAnnounced} · {paymentDate.split("-").reverse().slice(0, 2).join("/")}
          </p>
        )}
      </div>
    );
  };

  const CumulativeTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const { month, cumulativeTotal } = payload[0].payload;
    return (
      <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md">
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
      <div className="min-w-[150px] rounded-md border border-border bg-popover px-3 py-2 shadow-md">
        <p className="mb-1 whitespace-nowrap text-xs font-semibold text-foreground">{displayTicker(item.ticker)}</p>
        <div className="flex flex-col gap-0.5 text-[11px]">
          <span className="flex items-center justify-between gap-4">
            <span className="whitespace-nowrap text-muted-foreground">{t.tabs.chart.invested}</span>
            <span className="whitespace-nowrap font-semibold tabular-nums text-success">
              {compactWithSymbol(item.invested, item.currency, locale)}
            </span>
          </span>
          <span className="flex items-center justify-between gap-4">
            <span className="whitespace-nowrap text-muted-foreground">{t.tabs.chart.received}</span>
            <span className="whitespace-nowrap font-semibold tabular-nums text-comparison">
              {compactWithSymbol(item.received, item.currency, locale)}
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
          {/* Top Legend Bar — 3-State Visual Architecture */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Estado 1: Recebido */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_REALIZED }} />
                <span>{t.tabs.chart.receivedDividends}</span>
              </div>
              {/* Estado 2: A Receber (Declarado) */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_ANNOUNCED }} />
                <span>{t.tabs.chart.receivableAnnounced}</span>
              </div>
              {/* Estado 3: Estimado (Projetado) */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    background: `repeating-linear-gradient(45deg, ${COLOR_PROJECTED}, ${COLOR_PROJECTED} 2px, transparent 2px, transparent 4px)`,
                  }}
                />
                <span>{t.tabs.chart.estimatedProjection}</span>
              </div>
            </div>
            {bestMonth && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">
                <Award className="h-3.5 w-3.5 shrink-0" />
                <span>{t.tabs.chart.bestMonth}: <span className="underline decoration-warning/40">{bestMonth.month}</span></span>
              </div>
            )}
          </div>

          <div className="h-[280px] w-full">
            <ChartContainer config={CASHFLOW_EMPTY_CHART_CONFIG} className="h-full w-full">
              <BarChart data={chartData} margin={CASHFLOW_MAIN_BAR_MARGIN}>
                <defs>
                  <pattern
                    id="projectedHatch"
                    width="6"
                    height="6"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="6" height="6" fill="var(--card)" fillOpacity={0.4} />
                    <line x1="0" y1="0" x2="0" y2="6" stroke={COLOR_PROJECTED} strokeWidth="2.5" strokeOpacity={0.7} />
                  </pattern>
                  <ChartGlowDef />
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke={COLOR_GRID}
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
                        fill={isSelected ? COLOR_FOREGROUND : COLOR_MUTED_FG}
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
                  tick={{ fill: COLOR_MUTED_FG, fontSize: 10 }}
                  tickFormatter={(v: number) => compactWithSymbol(v, activeCurrency, locale)}
                />
                <ChartTooltip
                  cursor={{ fill: COLOR_CURSOR }}
                  content={<CustomTooltip />}
                />

                {/* 1. Proventos Recebidos (Sólido / Petroleum) */}
                <Bar
                  dataKey="realizedAmount"
                  stackId="a"
                  fill={COLOR_REALIZED}
                  maxBarSize={36}
                  onClick={handleBarClick}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-realized-${index}`}
                      fillOpacity={
                        selectedMonthIndex === null || selectedMonthIndex === index ? 1 : 0.3
                      }
                    />
                  ))}
                </Bar>

                {/* 2. Proventos Declarados / A Receber (Âmbar Suave) */}
                <Bar
                  dataKey="announcedAmount"
                  stackId="a"
                  fill={COLOR_ANNOUNCED}
                  maxBarSize={36}
                  onClick={handleBarClick}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-announced-${index}`}
                      fillOpacity={
                        selectedMonthIndex === null || selectedMonthIndex === index ? 0.95 : 0.3
                      }
                    />
                  ))}
                </Bar>

                {/* 3. Proventos Estimados (Projetado Residual / Hatch + Esmeralda) */}
                <Bar
                  dataKey="projectedAmount"
                  stackId="a"
                  fill="url(#projectedHatch)"
                  stroke={COLOR_PROJECTED}
                  strokeWidth={1}
                  maxBarSize={36}
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-proj-${index}`}
                      fillOpacity={
                        selectedMonthIndex === null || selectedMonthIndex === index ? 0.9 : 0.3
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
                config={CASHFLOW_EMPTY_CHART_CONFIG}
                className="h-full w-full animate-in fade-in zoom-in-95 duration-300"
              >
                <BarChart
                  data={breakdownData}
                  layout="vertical"
                  margin={CASHFLOW_BREAKDOWN_BAR_MARGIN}
                >
                  <CartesianGrid
                    horizontal={true}
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke={COLOR_GRID}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="ticker"
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tick={{ fill: COLOR_MUTED_FG, fontSize: 11, fontWeight: 500 }}
                  />
                  <ChartTooltip
                    cursor={{ fill: COLOR_CURSOR }}
                    content={<BreakdownTooltip />}
                  />
                  <Bar dataKey="amount" fill={COLOR_LINE} radius={[0, 4, 4, 0]} barSize={20}>
                    <LabelList
                      dataKey="amount"
                      position="right"
                      formatter={(v: number) => compactWithSymbol(v, activeCurrency, locale)}
                      style={{ fill: COLOR_MUTED_FG, fontSize: 10 }}
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
                <AreaChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
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
                    stroke={COLOR_GRID}
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
                        fill={COLOR_MUTED_FG}
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
                    tick={{ fill: COLOR_MUTED_FG, fontSize: 10 }}
                    tickFormatter={(v: number) => compactWithSymbol(v, activeCurrency, locale)}
                  />
                  <ChartTooltip
                    cursor={{
                      stroke: COLOR_CURSOR_STRONG,
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
              <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR_BAR }} />
              {t.tabs.chart.invested}
              <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR_INVESTED }} />
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
                  stroke={COLOR_GRID}
                />
                <XAxis
                  dataKey="ticker"
                  tickLine={false}
                  axisLine={false}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y + 12}
                      fill={COLOR_MUTED_FG}
                      fontSize={10}
                      textAnchor="middle"
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <ChartTooltip
                  cursor={{ fill: COLOR_CURSOR }}
                  content={<InvestedVsReceivedTooltip />}
                />
                <Bar dataKey="invested" fill={COLOR_BAR} radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.75} />
                <Bar dataKey="received" fill={COLOR_INVESTED} radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.9} />
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
