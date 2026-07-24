import type { ReactNode } from "react";
import { CalendarClock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Currency } from "@/lib/domain";
import { displayTicker } from "@/lib/i18n";
import { formatCurrency, type Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { CashFlowSummary } from "@/lib/cashflow";

const COLOR_BAR = "oklch(0.75 0.17 160)";
const COLOR_LINE = "oklch(0.78 0.16 85)";

interface Props {
  summary: CashFlowSummary;
  activeCurrency: Currency;
  sparklinePath: string;
  cumulativePath: string;
}

export function CashFlowSummaryCards({
  summary,
  activeCurrency,
  sparklinePath,
  cumulativePath,
}: Props) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      <SummaryStatCard
        label={isEn ? "Annual Projected" : "Projeção Anual"}
        value={formatCurrency(summary.total, activeCurrency, locale)}
        sparkline={sparklinePath}
        sparkColor={COLOR_BAR}
      />
      <SummaryStatCard
        label={isEn ? "Monthly Average" : "Média Mensal"}
        value={formatCurrency(summary.avg, activeCurrency, locale)}
        sparkline={cumulativePath}
        sparkColor={COLOR_LINE}
      />
      <SummaryStatCard
        label={isEn ? "Next 30 days" : "Próximos 30 dias"}
        value={formatCurrency(summary.next30, activeCurrency, locale)}
        icon={<CalendarClock className="h-3.5 w-3.5 text-success/70" />}
      />
      <SummaryStatCard
        label={isEn ? "Top Payer" : "Maior Pagador"}
        value={
          summary.top
            ? `${displayTicker(summary.top.ticker)} · ${formatCurrency(summary.top.amount, activeCurrency, locale)}`
            : "—"
        }
        icon={<TrendingUp className="h-3.5 w-3.5 text-success/70" />}
      />
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
  const compact = new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
  return `${symbol} ${compact}`;
}
