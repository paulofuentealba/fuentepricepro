import { Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AllocationChart } from "@/components/ceiling/watchlist/AllocationChart";
import { formatCurrency } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Currency } from "@/lib/domain";

interface PortfolioSummaryHeaderProps {
  valuedItems: ValuedWatchlistItem[];
  totals: { consolidatedNetWorth: number; consolidatedIncome: number };
  currency: Currency;
  isLoading: boolean;
}

export function PortfolioSummaryHeader({
  valuedItems,
  totals,
  currency,
  isLoading,
}: PortfolioSummaryHeaderProps) {
  const { locale, t } = useI18n();

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <AllocationChart items={valuedItems} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col rounded-xl border border-primary/30 bg-background p-4 lg:p-6">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {t.watchlist.consolidatedNetWorth}
          </span>
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <div className="flex items-center gap-2 text-4xl lg:text-5xl font-bold tabular-nums">
              <Globe className="h-8 w-8 text-primary" />
              <span className="bg-gradient-to-r from-white via-primary to-cyan-500 bg-clip-text text-transparent">
                {formatCurrency(totals.consolidatedNetWorth, currency, locale)}
              </span>
            </div>
          )}
          <div className="mt-1 text-xs text-muted-foreground/80">
            {t.watchlist.consolidatedNetWorthSub}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-primary/20 bg-background py-4 px-4 lg:px-6">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {t.watchlist.consolidatedIncome}
          </span>
          {isLoading ? (
            <Skeleton className="h-7 w-36" />
          ) : (
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Globe className="h-5 w-5 text-primary" />
              {formatCurrency(totals.consolidatedIncome, currency, locale)}
            </div>
          )}
          <div className="mt-1 text-xs text-muted-foreground/80">
            {t.watchlist.consolidatedIncomeSub}
          </div>
        </div>
      </div>
    </div>
  );
}
