import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Globe, PlusCircle, FileText, FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AllocationChart } from "@/components/ceiling/watchlist/AllocationChart";
import { CsvImportUploader } from "@/components/ceiling/watchlist/CsvImportUploader";
import { convertCurrency } from "@/lib/currency";
import { formatCurrency } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Currency } from "@/lib/domain";

interface PortfolioSummaryHeaderProps {
  valuedItems: ValuedWatchlistItem[];
  totals: { consolidatedNetWorth: number; consolidatedIncome?: number };
  currency: Currency;
  usdBrlRate: number;
  isLoading: boolean;
}

export function PortfolioSummaryHeader({
  valuedItems,
  totals,
  currency,
  usdBrlRate,
  isLoading,
}: PortfolioSummaryHeaderProps) {
  const { locale, t } = useI18n();
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // `totals` from useValuedPortfolio is ALWAYS in BRL (computeTotals consolidates
  // brlWorth + usdWorth * rate), so it must be converted to the display currency
  // before formatting — otherwise a USD-display user sees a BRL figure with a $ sign.
  const displayNetWorth = convertCurrency(totals.consolidatedNetWorth, "BRL", currency, usdBrlRate);

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
                {formatCurrency(displayNetWorth, currency, locale)}
              </span>
            </div>
          )}
          <div className="mt-1 text-xs text-muted-foreground/80">
            {t.watchlist.consolidatedNetWorthSub}
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-border/70 bg-card p-4 lg:p-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            {t.portfolio.quickActions}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Button
              asChild
              className="w-full min-h-[44px] sm:min-h-0 sm:h-9 gap-1.5 font-medium text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border-0 transition-all"
            >
              <Link to="/app/add-asset">
                <PlusCircle className="h-4 w-4" />
                <span className="truncate">{t.portfolio.emptyStateAddAsset}</span>
              </Link>
            </Button>

            <Button
              asChild
              className="w-full min-h-[44px] sm:min-h-0 sm:h-9 gap-1.5 font-medium text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border-0 transition-all"
            >
              <Link to="/app/import-broker-note">
                <FileText className="h-4 w-4" />
                <span className="truncate">{t.portfolio.emptyStateImportNote}</span>
              </Link>
            </Button>

            <Button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="w-full min-h-[44px] sm:min-h-0 sm:h-9 gap-1.5 font-medium text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border-0 transition-all"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="truncate">{t.watchlist.addAssetDropdownImportFile}</span>
            </Button>
          </div>
        </div>
      </div>

      <CsvImportUploader open={isCsvModalOpen} onOpenChange={setIsCsvModalOpen} />
    </div>
  );
}
