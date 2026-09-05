import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { Currency } from "@/lib/domain";

interface DashboardKpiGridProps {
  netWorth: number;
  weightedYoc: number;
  monthlyIncome: number;
  availableContribution: number;
  currency: Currency;
  isLoading: boolean;
}

function KpiCard({ label, value, sub, isLoading }: { label: string; value: string; sub?: string; isLoading: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-card border border-border p-5">
      <span className="text-xs font-display font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {isLoading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <span className="text-2xl font-semibold font-serif text-foreground">{value}</span>
      )}
      {!isLoading && sub && <span className="text-xs font-mono text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function DashboardKpiGrid({
  netWorth,
  weightedYoc,
  monthlyIncome,
  availableContribution,
  currency,
  isLoading,
}: DashboardKpiGridProps) {
  const { locale, t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label={t.dashboard.kpi.netWorth}
        value={formatCurrency(netWorth, currency, locale)}
        isLoading={isLoading}
      />
      <KpiCard
        label={t.dashboard.kpi.weightedYoc}
        value={formatPercent(weightedYoc, locale, 2)}
        isLoading={isLoading}
      />
      <KpiCard
        label={t.dashboard.kpi.monthlyIncome}
        value={formatCurrency(monthlyIncome, currency, locale)}
        isLoading={isLoading}
      />
      <KpiCard
        label={t.dashboard.kpi.availableContribution}
        value={formatCurrency(availableContribution, currency, locale)}
        sub={t.dashboard.kpi.availableContributionSub}
        isLoading={isLoading}
      />
    </div>
  );
}
