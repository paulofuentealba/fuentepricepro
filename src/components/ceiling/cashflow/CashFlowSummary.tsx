import type { ReactNode } from "react";
import { CalendarClock, TrendingUp, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Currency } from "@/lib/domain";
import { displayTicker } from "@/lib/i18n";
import { formatCurrency, toIntlLocale, type Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { CashFlowSummary } from "@/lib/cashflow";

const COLOR_BAR = "var(--success)";
const COLOR_LINE = "var(--primary)";

interface RealizedSummaryData {
  currentMonth: number;
  currentYear: number;
  allTimeTotal: number;
  eventsCount: number;
  dividendTotal?: number;
  jcpTotal?: number;
}

interface Props {
  summary: CashFlowSummary;
  realizedSummary?: RealizedSummaryData;
  activeCurrency: Currency;
  sparklinePath: string;
  cumulativePath: string;
}

export function CashFlowSummaryCards({
  summary,
  realizedSummary,
  activeCurrency,
  sparklinePath,
  cumulativePath,
}: Props) {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-4 mb-6">
      {realizedSummary && realizedSummary.eventsCount > 0 && (
        <RealizedIncomeSummaryCards
          realizedSummary={realizedSummary}
          activeCurrency={activeCurrency}
        />
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryStatCard
          label={t.tabs.cashflow.annualTotal}
          value={formatCurrency(summary.total, activeCurrency, locale)}
          sparkline={sparklinePath}
          sparkColor={COLOR_BAR}
        />
        <SummaryStatCard
          label={t.tabs.cashflow.monthlyAverage}
          value={formatCurrency(summary.avg, activeCurrency, locale)}
          sparkline={cumulativePath}
          sparkColor={COLOR_LINE}
        />
        <SummaryStatCard
          label={t.tabs.cashflow.next30Days}
          value={formatCurrency(summary.next30, activeCurrency, locale)}
          icon={<CalendarClock className="h-3.5 w-3.5 text-success/70" />}
        />
        <SummaryStatCard
          label={t.tabs.cashflow.topPayer}
          value={
            summary.top
              ? `${displayTicker(summary.top.ticker)} · ${formatCurrency(summary.top.amount, activeCurrency, locale)}`
              : "—"
          }
          icon={<TrendingUp className="h-3.5 w-3.5 text-success/70" />}
        />
      </div>
    </div>
  );
}

export function RealizedIncomeSummaryCards({
  realizedSummary,
  activeCurrency,
}: {
  realizedSummary: RealizedSummaryData;
  activeCurrency: Currency;
}) {
  const { t, locale } = useI18n();

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.15)] space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Coins className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {t.tabs.chart.realizedVsProjected}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {t.tabs.chart.realizedVsProjectedNote}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-emerald-400/90 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
          {realizedSummary.eventsCount} {t.tabs.chart.confirmed}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="rounded-lg bg-background/60 border border-emerald-500/25 p-3">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
            <CalendarClock className="h-3.5 w-3.5 text-emerald-400" />
            {t.tabs.chart.currentMonthRealized}
          </span>
          <p className="text-base font-bold text-emerald-400 mt-1">
            {formatCurrency(realizedSummary.currentMonth, activeCurrency, locale)}
          </p>
        </div>

        <div className="rounded-lg bg-background/60 border border-emerald-500/25 p-3">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            {t.tabs.chart.currentYearRealized}
          </span>
          <p className="text-base font-bold text-emerald-400 mt-1">
            {formatCurrency(realizedSummary.currentYear, activeCurrency, locale)}
          </p>
        </div>

        <div className="rounded-lg bg-background/60 border border-emerald-500/25 p-3">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
            <Coins className="h-3.5 w-3.5 text-emerald-400" />
            {t.tabs.chart.allTimeRealized}
          </span>
          <p className="text-base font-bold text-emerald-400 mt-1">
            {formatCurrency(realizedSummary.allTimeTotal, activeCurrency, locale)}
          </p>
        </div>
      </div>

      {typeof realizedSummary.jcpTotal === "number" && realizedSummary.jcpTotal > 0 && (
        <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-3">
            <span>
              {t.watchlist.dividendsTotal}:{" "}
              <strong className="text-emerald-400 font-semibold">
                {formatCurrency(realizedSummary.dividendTotal || 0, activeCurrency, locale)}
              </strong>
            </span>
            <span>•</span>
            <span>
              {t.watchlist.jcpTotal}:{" "}
              <strong className="text-amber-400 font-semibold">
                {formatCurrency(realizedSummary.jcpTotal, activeCurrency, locale)}
              </strong>
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function SummaryStatCard({
  label,
  value,
  sparkline,
  sparkColor,
  icon,
}: {
  label: string;
  value: string;
  sparkline?: string;
  sparkColor?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="border border-border/50 bg-background/60 backdrop-blur-md">
      <CardContent className="p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          {label}
        </p>
        <p className="text-sm font-semibold text-success">{value}</p>
        {sparkline && sparkColor && (
          <svg viewBox="0 0 80 20" className="mt-2 h-5 w-full">
            <path
              d={sparkline}
              fill="none"
              stroke={sparkColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
          </svg>
        )}
      </CardContent>
    </Card>
  );
}

export function compactWithSymbol(v: number, currency: Currency, locale: Locale): string {
  const symbol = currency === "USD" ? "$" : "R$";
  const compact = new Intl.NumberFormat(toIntlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
  return `${symbol} ${compact}`;
}
