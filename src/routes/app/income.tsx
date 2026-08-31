import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, CartesianGrid, Cell, LabelList } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InsightBanner } from "@/components/shared/InsightBanner";
import { Lock } from "lucide-react";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { useI18n } from "@/lib/i18n-provider";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useTransactions } from "@/lib/transactions";
import { useUserSettings } from "@/lib/useUserSettings";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { buildMonthlyBuckets, computeInvestedVsReceived, MONTHS_EN_SHORT, MONTHS_PT_SHORT } from "@/lib/cashflow";
import { buildConfirmedUpcoming, buildWeakMonths, buildAnnualDividends, buildYearMonthlyDividends, buildMonthTickerBreakdown } from "@/lib/incomeGuaranteed";
import { resolveReasonText } from "@/lib/askEngine";
import { convertCurrency } from "@/lib/currency";
import { EXCHANGE_RATE_FALLBACK } from "@/lib/macroDefaults";
import { formatCurrency, displayTicker } from "@/lib/formatters";
import { compactWithSymbol } from "@/components/ceiling/cashflow/CashFlowSummary";

const COLOR_RECEIVED = "var(--success)";
const COLOR_GRID = "var(--chart-grid)";
const COLOR_INVESTED = "var(--chart-1)";
const UPCOMING_WINDOW_DAYS = 60;

export const Route = createFileRoute("/app/income")({
  head: () => ({
    meta: [
      { title: "Renda Garantida | Fuente Price Pro" },
      {
        name: "description",
        content: "Proventos já anunciados aguardando pagamento, sazonalidade de renda por mês e histórico de dividendos por ano.",
      },
    ],
  }),
  component: IncomePage,
});

function IncomePage() {
  const isUnlocked = useFeatureGate("cashflowUnlocked");
  const { t, locale } = useI18n();
  const { items, isAppLoading, fx, dividendEventsMap = {} } = useValuedPortfolio();
  const { transactions = [] } = useTransactions();
  const { settings } = useUserSettings();
  const currency = settings?.displayCurrency || "BRL";
  const { events } = useRealizedIncomeSummary(currency);
  const fxRate = fx?.USDBRL ?? EXCHANGE_RATE_FALLBACK;
  const monthsLabels = locale === "en" ? MONTHS_EN_SHORT : MONTHS_PT_SHORT;

  const calendarBuckets = useMemo(
    () => buildMonthlyBuckets(items, currency, monthsLabels, dividendEventsMap, "calendar", transactions, fxRate),
    [items, currency, monthsLabels, dividendEventsMap, transactions, fxRate],
  );

  const upcoming = useMemo(() => buildConfirmedUpcoming(events, undefined, UPCOMING_WINDOW_DAYS), [events]);
  const upcomingTotal = useMemo(
    () => Math.round(upcoming.reduce((sum, r) => sum + convertCurrency(r.amountNet, r.currency, currency, fxRate), 0) * 100) / 100,
    [upcoming, currency, fxRate],
  );

  const weakMonths = useMemo(() => buildWeakMonths(calendarBuckets), [calendarBuckets]);
  const annual = useMemo(
    () => buildAnnualDividends(events, calendarBuckets, currency, fxRate, 5),
    [events, calendarBuckets, currency, fxRate],
  );

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [expandedMonthIndex, setExpandedMonthIndex] = useState<number | null>(null);
  const monthlyForYear = useMemo(
    () =>
      selectedYear == null
        ? null
        : buildYearMonthlyDividends(events, selectedYear, currency, fxRate, monthsLabels, calendarBuckets),
    [selectedYear, events, currency, fxRate, monthsLabels, calendarBuckets],
  );
  const monthTickerRows = useMemo(
    () =>
      selectedYear == null || expandedMonthIndex == null
        ? null
        : buildMonthTickerBreakdown(events, selectedYear, expandedMonthIndex),
    [selectedYear, expandedMonthIndex, events],
  );
  const investedVsReceived = useMemo(
    () => computeInvestedVsReceived(items, dividendEventsMap, transactions, fxRate),
    [items, dividendEventsMap, transactions, fxRate],
  );

  if (isAppLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        <Skeleton className="h-16 w-full rounded-2xl bg-muted/30" />
        <Skeleton className="h-32 w-full rounded-2xl bg-muted/30" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-2xl bg-muted/30" />
          <Skeleton className="h-64 w-full rounded-2xl bg-muted/30" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl bg-muted/30" />
      </div>
    );
  }

  if (isUnlocked === false) {
    return (
      <div className="mx-auto max-w-xl p-6 mt-12">
        <Card className="border-border/60 text-center p-6">
          <CardHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle>{t.incomeScreen?.featureGateBlockedTitle || "Income Screen Locked"}</CardTitle>
            <CardDescription>
              {t.incomeScreen?.featureGateBlockedDesc || "The guaranteed income screen is currently undergoing maintenance."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const weakMonthLabels = weakMonths.weakMonthIndexes.map((i) => calendarBuckets[i]?.month).filter(Boolean).join(", ");

  const currentYearLabel = annual.years[annual.years.length - 1]?.year ?? new Date().getFullYear();

  const InvestedVsReceivedTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload as { ticker: string; invested: number; received: number; currency: typeof currency };
    return (
      <div className="min-w-[150px] rounded-md border border-border bg-popover px-3 py-2 shadow-md">
        <p className="mb-1 whitespace-nowrap text-xs font-semibold text-foreground">{displayTicker(item.ticker)}</p>
        <div className="flex flex-col gap-0.5 text-[11px]">
          <span className="flex items-center justify-between gap-4">
            <span className="whitespace-nowrap text-muted-foreground">{t.tabs.chart.invested}</span>
            <span className="whitespace-nowrap font-semibold tabular-nums" style={{ color: COLOR_INVESTED }}>
              {compactWithSymbol(item.invested, item.currency, locale)}
            </span>
          </span>
          <span className="flex items-center justify-between gap-4">
            <span className="whitespace-nowrap text-muted-foreground">{t.tabs.chart.received}</span>
            <span className="whitespace-nowrap font-semibold tabular-nums text-success">
              {compactWithSymbol(item.received, item.currency, locale)}
            </span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      {/* Page header */}
      <div>
        <div className="text-xs font-display font-semibold uppercase tracking-wider text-success">
          {t.incomeScreen?.eyebrow}
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.incomeScreen?.title}
        </h1>
      </div>

      {/* Insight banner */}
      <InsightBanner
        title={t.incomeScreen?.insightTitle}
        description={t.incomeScreen?.insightDesc}
        value={formatCurrency(upcomingTotal, currency, locale)}
      />

      {/* Two-column: Já garantido / Seus meses secos */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Já garantido */}
        <div className="overflow-hidden rounded-[22px] border border-border/60 bg-card">
          <div className="flex items-center justify-between gap-3 p-5 pb-3 sm:p-6 sm:pb-3">
            <h3 className="font-serif text-base font-medium text-foreground">
              {resolveReasonText(t, "incomeScreen.upcomingCardTitle", { days: UPCOMING_WINDOW_DAYS })}
            </h3>
            <StatusBadge variant="success">{t.incomeScreen?.confirmedBadge}</StatusBadge>
          </div>

          {upcoming.length === 0 ? (
            <div className="px-5 pb-6 sm:px-6">
              <p className="text-sm font-medium text-foreground">
                {resolveReasonText(t, "incomeScreen.upcomingEmptyTitle", { days: UPCOMING_WINDOW_DAYS })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.incomeScreen?.upcomingEmptyDesc}</p>
            </div>
          ) : (
            <div className="overflow-x-auto px-5 sm:px-6">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 text-left font-display font-semibold">{t.incomeScreen?.assetHeader}</th>
                    <th className="pb-2 text-left font-display font-semibold">{t.incomeScreen?.grossHeader}</th>
                    <th className="pb-2 text-left font-display font-semibold">{t.incomeScreen?.paymentHeader}</th>
                    <th className="pb-2 text-left font-display font-semibold">{t.incomeScreen?.netHeader}</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((row) => (
                    <tr key={`${row.ticker}-${row.paymentDate}`} className="border-t border-dashed border-border/40">
                      <td className="py-2.5 font-mono text-[13px] font-semibold text-foreground">{row.ticker}</td>
                      <td className="py-2.5 font-mono text-[13px] text-foreground">
                        {formatCurrency(row.amountGross, row.currency, locale)}
                      </td>
                      <td className="py-2.5 text-[12px] text-muted-foreground">
                        {row.daysUntilPayment === 0
                          ? t.incomeScreen?.todayLabel
                          : resolveReasonText(t, "incomeScreen.daysUnit", { days: row.daysUntilPayment })}
                      </td>
                      <td className="py-2.5 font-mono text-[13px] font-semibold text-success">
                        {formatCurrency(row.amountNet, row.currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="px-5 pb-5 pt-3 text-[11px] leading-relaxed text-muted-foreground sm:px-6">
            {t.incomeScreen?.netFootnote}
          </p>
        </div>

        {/* Seus meses secos */}
        <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-base font-medium text-foreground">{t.incomeScreen?.weakMonthsCardTitle}</h3>
            {weakMonths.weakMonthIndexes.length > 0 && (
              <StatusBadge variant="danger">
                {weakMonths.weakMonthIndexes.length === 1
                  ? t.incomeScreen?.weakMonthsBadgeSingle
                  : resolveReasonText(t, "incomeScreen.weakMonthsBadge", { count: weakMonths.weakMonthIndexes.length })}
              </StatusBadge>
            )}
          </div>

          <div className="mt-4 h-[110px]">
            <ChartContainer config={{}} className="h-full w-full">
              <BarChart data={calendarBuckets} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="weakMonthsBarFill" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="var(--accent-text)" />
                  </linearGradient>
                  <linearGradient id="weakMonthsBarFillDry" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--destructive)" />
                  </linearGradient>
                </defs>
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={22}>
                  {calendarBuckets.map((_, i) => (
                    <Cell
                      key={i}
                      fill={weakMonths.weakMonthIndexes.includes(i) ? "url(#weakMonthsBarFillDry)" : "url(#weakMonthsBarFill)"}
                    />
                  ))}
                </Bar>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={(props) => {
                    const { x, y, payload, index } = props;
                    const isWeak = weakMonths.weakMonthIndexes.includes(index);
                    return (
                      <text
                        x={x}
                        y={y + 10}
                        textAnchor="middle"
                        className="text-[9px]"
                        fill={isWeak ? "var(--destructive)" : "var(--muted-foreground)"}
                        fontWeight={isWeak ? 700 : 400}
                      >
                        {String(payload.value).charAt(0)}
                      </text>
                    );
                  }}
                />
              </BarChart>
            </ChartContainer>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {weakMonths.topTickers.length === 0
              ? t.incomeScreen?.weakMonthsEmpty
              : weakMonths.weakMonthIndexes.length === 0
                ? t.incomeScreen?.weakMonthsNone
                : resolveReasonText(t, "incomeScreen.weakMonthsDesc", {
                    count: weakMonths.topTickers.length,
                    tickers: weakMonths.topTickers.join(", "),
                    months: weakMonthLabels,
                    amount: formatCurrency(weakMonths.weakMonthThreshold, currency, locale),
                  })}
          </p>

          {weakMonths.weakMonthIndexes.length > 0 && (
            <Link
              to="/app/myportfolio"
              className="mt-3 inline-block text-xs font-display font-semibold text-accent-text hover:underline"
            >
              {t.incomeScreen?.weakMonthsLink}
            </Link>
          )}
        </div>
      </div>

      {/* Dividendos por ano / por mês */}
      <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
        {selectedYear != null && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setSelectedYear(null);
                setExpandedMonthIndex(null);
              }}
              className="-mx-1 rounded px-1 font-medium underline decoration-transparent transition-colors hover:text-accent-text hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t.incomeScreen?.annualBackLabel}
            </button>
            <span aria-hidden="true" className="opacity-50">›</span>
            <span className="font-semibold text-foreground">{selectedYear}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-base font-medium text-foreground">
            {selectedYear == null
              ? t.incomeScreen?.annualCardTitle
              : resolveReasonText(t, "incomeScreen.annualCardTitleMonthly", { year: selectedYear })}
          </h3>
          {selectedYear == null && annual.years.some((y) => y.receivedAmount + y.projectedAmount > 0) && (
            <StatusBadge variant="success">
              {resolveReasonText(t, "incomeScreen.annualGrowthBadge", {
                rate: annual.cagrPct,
                years: annual.spanYears,
              })}
            </StatusBadge>
          )}
        </div>

        {selectedYear == null ? (
          annual.years.every((y) => y.receivedAmount + y.projectedAmount === 0) ? (
            <div className="mt-6 text-center">
              <p className="text-sm font-medium text-foreground">{t.incomeScreen?.annualEmptyTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.incomeScreen?.annualEmptyDesc}</p>
            </div>
          ) : (
            <>
              <div className="mt-5 h-[260px]">
                <ChartContainer config={{}} className="h-full w-full">
                  <BarChart data={annual.years} margin={{ top: 30, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <pattern id="incomeProjectedHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="6" height="6" fill="var(--card)" fillOpacity={0.4} />
                        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--accent)" strokeWidth="2.5" strokeOpacity={0.85} />
                      </pattern>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={COLOR_GRID} />
                    <XAxis
                      dataKey="year"
                      tickLine={false}
                      axisLine={false}
                      tick={({ x, y, payload }) => (
                        <text
                          x={x}
                          y={y + 14}
                          textAnchor="middle"
                          className="text-[10px] sm:text-[11px]"
                          fill={payload.value === currentYearLabel ? "var(--foreground)" : "var(--muted-foreground)"}
                          fontWeight={payload.value === currentYearLabel ? 700 : 500}
                        >
                          {payload.value}
                        </text>
                      )}
                    />
                    <Bar
                      dataKey="receivedAmount"
                      stackId="a"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={64}
                      cursor="pointer"
                      onClick={(_: any, index: number) => {
                        const y = annual.years[index];
                        if (y && y.receivedAmount + y.projectedAmount > 0) {
                          setSelectedYear(y.year);
                          setExpandedMonthIndex(null);
                        }
                      }}
                    >
                      {annual.years.map((_, i) => (
                        <Cell key={i} fill={COLOR_RECEIVED} />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="projectedAmount"
                      stackId="a"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={64}
                      cursor="pointer"
                      onClick={(_: any, index: number) => {
                        const y = annual.years[index];
                        if (y && y.receivedAmount + y.projectedAmount > 0) {
                          setSelectedYear(y.year);
                          setExpandedMonthIndex(null);
                        }
                      }}
                    >
                      {annual.years.map((y, i) => (
                        <Cell key={i} fill={y.projectedAmount > 0 ? "url(#incomeProjectedHatch)" : "transparent"} />
                      ))}
                      <LabelList
                        dataKey="year"
                        position="top"
                        content={({ x, y, width, index }: any) => {
                          const entry = annual.years[index as number];
                          const total = entry.receivedAmount + entry.projectedAmount;
                          const isCurrent = entry.year === currentYearLabel;
                          return (
                            <text
                              x={(x as number) + (width as number) / 2}
                              y={(y as number) - 8}
                              textAnchor="middle"
                              className={isCurrent ? "font-serif text-[15px] font-semibold" : "font-serif text-[12px] font-medium"}
                              fill={isCurrent ? "var(--accent-text)" : "var(--muted-foreground)"}
                            >
                              {formatCurrency(total, currency, locale)}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_RECEIVED }} />
                    {t.incomeScreen?.annualLegendReceived}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-accent"
                      style={{ background: "repeating-linear-gradient(45deg, var(--accent), var(--accent) 1px, transparent 1px, transparent 2px)" }}
                    />
                    {resolveReasonText(t, "incomeScreen.annualLegendProjected", { year: currentYearLabel })}
                  </span>
                </div>
                <div className="font-display font-semibold text-foreground">
                  {resolveReasonText(t, "incomeScreen.annualGrowthStat", {
                    pct: annual.totalGrowthPct,
                    year: annual.baseYear,
                  })}
                </div>
              </div>

              <p className="mt-4 text-center text-[11px] text-muted-foreground">{t.incomeScreen?.annualTapHint}</p>
            </>
          )
        ) : monthlyForYear && monthlyForYear.every((m) => m.receivedAmount + m.projectedAmount === 0) ? (
          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-foreground">
              {resolveReasonText(t, "incomeScreen.annualMonthlyEmptyTitle", { year: selectedYear })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t.incomeScreen?.annualMonthlyEmptyDesc}</p>
          </div>
        ) : (
          monthlyForYear && (
            <>
              <div className="mt-5 h-[260px]">
                <ChartContainer config={{}} className="h-full w-full">
                  <BarChart data={monthlyForYear} margin={{ top: 30, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <pattern id="incomeProjectedHatchMonth" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="6" height="6" fill="var(--card)" fillOpacity={0.4} />
                        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--accent)" strokeWidth="2.5" strokeOpacity={0.85} />
                      </pattern>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={COLOR_GRID} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={({ x, y, payload, index }: any) => {
                        const isCurrentMonth = selectedYear === currentYearLabel && index === new Date().getMonth();
                        return (
                          <text
                            x={x}
                            y={y + 14}
                            textAnchor="middle"
                            className="text-[10px] sm:text-[11px]"
                            fill={isCurrentMonth ? "var(--foreground)" : "var(--muted-foreground)"}
                            fontWeight={isCurrentMonth ? 700 : 500}
                          >
                            {payload.value}
                          </text>
                        );
                      }}
                    />
                    <Bar
                      dataKey="receivedAmount"
                      stackId="a"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                      cursor="pointer"
                      onClick={(_: any, index: number) => {
                        const m = monthlyForYear[index];
                        if (m && m.receivedAmount + m.projectedAmount > 0) {
                          setExpandedMonthIndex((prev) => (prev === m.monthIndex ? null : m.monthIndex));
                        }
                      }}
                    >
                      {monthlyForYear.map((m, i) => (
                        <Cell key={i} fill={COLOR_RECEIVED} stroke={expandedMonthIndex === m.monthIndex ? "var(--accent-text)" : undefined} strokeWidth={expandedMonthIndex === m.monthIndex ? 2 : 0} />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="projectedAmount"
                      stackId="a"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                      cursor="pointer"
                      onClick={(_: any, index: number) => {
                        const m = monthlyForYear[index];
                        if (m && m.receivedAmount + m.projectedAmount > 0) {
                          setExpandedMonthIndex((prev) => (prev === m.monthIndex ? null : m.monthIndex));
                        }
                      }}
                    >
                      {monthlyForYear.map((m, i) => (
                        <Cell key={i} fill={m.projectedAmount > 0 ? "url(#incomeProjectedHatchMonth)" : "transparent"} stroke={expandedMonthIndex === m.monthIndex && m.projectedAmount > 0 ? "var(--accent-text)" : undefined} strokeWidth={expandedMonthIndex === m.monthIndex && m.projectedAmount > 0 ? 2 : 0} />
                      ))}
                      <LabelList
                        dataKey="month"
                        position="top"
                        content={({ x, y, width, index }: any) => {
                          const entry = monthlyForYear[index as number];
                          const total = entry.receivedAmount + entry.projectedAmount;
                          if (total <= 0) return null;
                          const isCurrentMonth = selectedYear === currentYearLabel && (index as number) === new Date().getMonth();
                          return (
                            <text
                              x={(x as number) + (width as number) / 2}
                              y={(y as number) - 8}
                              textAnchor="middle"
                              className={isCurrentMonth ? "font-serif text-[13px] font-semibold" : "font-serif text-[11px] font-medium"}
                              fill={isCurrentMonth ? "var(--accent-text)" : "var(--muted-foreground)"}
                            >
                              {formatCurrency(total, currency, locale)}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_RECEIVED }} />
                    {t.incomeScreen?.annualLegendReceived}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-accent"
                      style={{ background: "repeating-linear-gradient(45deg, var(--accent), var(--accent) 1px, transparent 1px, transparent 2px)" }}
                    />
                    {t.incomeScreen?.annualLegendProjectedMonth}
                  </span>
                </div>
                <div className="font-display font-semibold text-foreground">
                  {resolveReasonText(t, "incomeScreen.annualMonthlyTotalStat", {
                    total: formatCurrency(
                      monthlyForYear.reduce((sum, m) => sum + m.receivedAmount + m.projectedAmount, 0),
                      currency,
                      locale,
                    ),
                  })}
                </div>
              </div>

              {expandedMonthIndex == null ? (
                <p className="mt-4 text-center text-[11px] text-muted-foreground">{t.incomeScreen?.monthTickerTapHint}</p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-border/50 bg-muted/20">
                  <p className="px-4 pt-3 text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
                    {monthsLabels[expandedMonthIndex]} {selectedYear}
                  </p>
                  {monthTickerRows && monthTickerRows.length > 0 ? (
                    <div className="overflow-x-auto px-4 pb-3">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="pb-2 pt-2 text-left font-display font-semibold">{t.incomeScreen?.assetHeader}</th>
                            <th className="pb-2 pt-2 text-left font-display font-semibold">{t.incomeScreen?.typeHeader}</th>
                            <th className="pb-2 pt-2 text-left font-display font-semibold">{t.incomeScreen?.statusHeader}</th>
                            <th className="pb-2 pt-2 text-right font-display font-semibold">{t.incomeScreen?.grossHeader}</th>
                            <th className="pb-2 pt-2 text-right font-display font-semibold">{t.incomeScreen?.taxHeader}</th>
                            <th className="pb-2 pt-2 text-right font-display font-semibold">{t.incomeScreen?.netHeader}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthTickerRows.map((row) => {
                            const taxTypeLabel =
                              row.taxType === "jcp"
                                ? t.incomeScreen?.taxTypeJcp
                                : row.taxType === "rendimento_fii"
                                  ? t.incomeScreen?.taxTypeRendimentoFii
                                  : row.taxType === "us_dividend"
                                    ? t.incomeScreen?.taxTypeUsDividend
                                    : t.incomeScreen?.taxTypeDividend;
                            const netAmount = row.receivedAmount + row.announcedAmount;
                            return (
                              <tr key={row.ticker} className="border-t border-dashed border-border/40">
                                <td className="py-2.5 font-mono text-[13px] font-semibold text-foreground">
                                  {displayTicker(row.ticker)}
                                </td>
                                <td className="py-2.5 text-[12px] text-muted-foreground">{taxTypeLabel}</td>
                                <td className="py-2.5">
                                  <StatusBadge variant={row.receivedAmount > 0 ? "success" : "warning"}>
                                    {row.receivedAmount > 0 ? t.incomeScreen?.monthTickerReceived : t.incomeScreen?.monthTickerAnnounced}
                                  </StatusBadge>
                                </td>
                                <td className="py-2.5 text-right font-mono text-[13px] text-foreground">
                                  {formatCurrency(row.grossAmount, row.currency, locale)}
                                </td>
                                <td className="py-2.5 text-right font-mono text-[13px] text-muted-foreground">
                                  {row.taxAmount > 0 ? formatCurrency(row.taxAmount, row.currency, locale) : "—"}
                                </td>
                                <td className="py-2.5 text-right font-mono text-[13px] font-semibold text-success">
                                  {formatCurrency(netAmount, row.currency, locale)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="px-4 pb-4 pt-1 text-xs text-muted-foreground">{t.incomeScreen?.monthTickerEmpty}</p>
                  )}
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* Investido vs. Recebido, por ativo */}
      {investedVsReceived.length > 0 && (
        <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-base font-medium text-foreground">{t.tabs.chart.investedVsReceived}</h3>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_INVESTED }} />
                {t.tabs.chart.invested}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_RECEIVED }} />
                {t.tabs.chart.received}
              </span>
            </div>
          </div>

          <div className="mt-5 h-[220px]">
            <ChartContainer config={{}} className="h-full w-full">
              <BarChart
                data={investedVsReceived}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="20%"
                barGap={2}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={COLOR_GRID} />
                <XAxis
                  dataKey="ticker"
                  tickLine={false}
                  axisLine={false}
                  tick={({ x, y, payload }) => (
                    <text x={x} y={y + 12} textAnchor="middle" className="text-[10px]" fill="var(--muted-foreground)">
                      {displayTicker(payload.value)}
                    </text>
                  )}
                />
                <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<InvestedVsReceivedTooltip />} />
                <Bar dataKey="invested" fill={COLOR_INVESTED} radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.85} />
                <Bar dataKey="received" fill={COLOR_RECEIVED} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ChartContainer>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t.tabs.chart.quantityNote}</p>
        </div>
      )}
    </div>
  );
}
