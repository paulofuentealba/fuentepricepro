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
import { AlertTriangle, Award, TrendingUp, CheckCircle, ChevronLeft } from "lucide-react";
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

  // Fix #1 (auditoria 1.1): para um mês passado, `realizedAmount` (líquido, via
  // calculateRealizedIncome) e `paidAmount` (bruto, via amountPerShare × qty)
  // representam o MESMO dividendo. Empilhar os dois no mesmo stackId e somá-los
  // no tooltip superestimava o mês (~2×). Usamos uma base única por mês:
  // líquido realizado quando disponível, senão bruto pago (fallback para quem
  // não usa o ledger de transações).
  const chartData = data.map((bucket) => ({
    ...bucket,
    confirmedAmount: bucket.realizedAmount > 0 ? bucket.realizedAmount : bucket.paidAmount,
  }));

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
    const bucket = payload[0].payload;
    const { month, contributors, concentratedTicker, isBest, isWorst } = bucket;

    // Base única por mês: 2 estados estritos (Recebidos vs. A receber)
    const confirmedSum = bucket.realizedAmount > 0 ? bucket.realizedAmount : bucket.paidAmount || 0;
    const projectedSum = bucket.projectedAmount || 0;
    const effectiveTotal = confirmedSum + projectedSum > 0 ? confirmedSum + projectedSum : bucket.amount;

    if (effectiveTotal <= 0) return null;
    const topN = 4;
    const shown = contributors.slice(0, contributors.length > 5 ? topN : 5);
    const remaining = contributors.length - shown.length;
    return (
      <div className="min-w-[220px] rounded-lg border border-border/60 bg-background/95 p-3 shadow-xl backdrop-blur">
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
          {confirmedSum > 0 && (
            <div className="flex items-center justify-between font-medium text-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" style={{ color: "var(--realized)" }} />
                <span>{t.tabs.chart.receivedDividends}</span>
              </span>
              <span className="tabular-nums font-semibold" style={{ color: "var(--realized)" }}>
                {formatCurrency(confirmedSum, activeCurrency, locale)}
              </span>
            </div>
          )}

          {projectedSum > 0 && (
            <div className="flex items-center justify-between font-medium text-foreground">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t.tabs.chart.receivableDividends}</span>
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
            <span className="font-semibold tabular-nums text-success">
              {compactWithSymbol(item.invested, activeCurrency, locale)}
            </span>
          </span>
          <span className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t.tabs.chart.received}</span>
            <span className="font-semibold tabular-nums text-comparison">
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
          {/* Top Legend Bar — 2-State Visual Architecture */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Estado 1: Recebido / Confirmado */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm shadow-xs">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--realized)" }} />
                <span>{t.tabs.chart.receivedDividends}</span>
              </div>
              {/* Estado 2: A receber / Projetado */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm shadow-xs">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-primary/50" style={{ backgroundColor: "var(--projected)" }} />
                <span>{t.tabs.chart.receivableDividends}</span>
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
                    <line x1="0" y1="0" x2="0" y2="6" stroke="var(--projected)" strokeWidth="2.5" strokeOpacity={0.85} />
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
                  dataKey="confirmedAmount"
                  stackId="a"
                  fill="var(--realized)"
                  maxBarSize={36}
                  onClick={handleBarClick}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-confirmed-${index}`}
                      fillOpacity={
                        selectedMonthIndex === null || selectedMonthIndex === index ? 1 : 0.3
                      }
                    />
                  ))}
                </Bar>

                {/* 2. Proventos a Receber (Projetado / Hatch + Esmeralda) */}
                <Bar
                  dataKey="projectedAmount"
                  stackId="a"
                  fill="var(--projected)"
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
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tick={{ fill: COLOR_MUTED_FG, fontSize: 10 }}
                  tickFormatter={(v: number) => compactWithSymbol(v, activeCurrency, locale)}
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
