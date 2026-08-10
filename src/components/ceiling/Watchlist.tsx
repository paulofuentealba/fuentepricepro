import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n-provider";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { useValuedPortfolio, type ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useSettings } from "@/lib/settings";
import { useSubscription } from "@/lib/subscription";
import { useAssetFilterSort } from "@/lib/useAssetFilterSort";
import { useUserSettings } from "@/lib/useUserSettings";
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";

import { AddAssetDropdown } from "./watchlist/AddAssetDropdown";
import { WatchlistKpiSection } from "./watchlist/WatchlistKpiSection";
import { WatchlistToolbar } from "./watchlist/WatchlistToolbar";
import { WatchlistAssetGrid } from "./watchlist/WatchlistAssetGrid";
import { WatchlistDialogs } from "./watchlist/WatchlistDialogs";
import { DataManagement } from "./watchlist/DataManagement";

interface WatchlistProps {
  onNavigateToCalculator?: () => void;
}

export function Watchlist({ onNavigateToCalculator }: WatchlistProps) {
  const navigate = useNavigate();
  const [showFIWizard, setShowFIWizard] = useState(false);
  const [showBrokerNoteUploader, setShowBrokerNoteUploader] = useState(false);
  const [showCsvImporter, setShowCsvImporter] = useState(false);
  const { t, locale } = useI18n();
  const {
    items,
    valuedItems,
    totals,
    quotes,
    meta,
    remove,
    update,
    upsert,
    isAppLoading: isPending,
  } = useValuedPortfolio();

  const [editing, setEditing] = useState<ValuedWatchlistItem | null>(null);
  const [detail, setDetail] = useState<ValuedWatchlistItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const { isPro } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const { targetYield: globalYield } = useSettings();
  const { settings } = useUserSettings();
  const maxConcentration = settings.maxConcentrationPerAsset ?? null;
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const exchangeRate = fx?.USDBRL ?? 5.5;

  // Tickers currently violating the user-defined Max Concentration cap.
  // A ticker is flagged when its share of the total consolidated portfolio
  // (converted to BRL) exceeds the configured percentage. There is no
  // "under the cap" state to flag — this only ever produces violations.
  const concentrationViolators = useMemo(() => {
    const violators = new Set<string>();
    if (!maxConcentration || maxConcentration >= 100) return violators;

    let totalBRL = 0;
    const valueByTicker: Record<string, number> = {};
    for (const it of valuedItems) {
      const val = it.currentPrice * it.quantity;
      if (val <= 0) continue;
      const inBrl = it.currency === "USD" ? val * exchangeRate : val;
      valueByTicker[it.ticker] = (valueByTicker[it.ticker] || 0) + inBrl;
      totalBRL += inBrl;
    }
    if (totalBRL <= 0) return violators;

    for (const [ticker, val] of Object.entries(valueByTicker)) {
      const pct = (val / totalBRL) * 100;
      if (pct > maxConcentration) violators.add(ticker);
    }
    return violators;
  }, [valuedItems, maxConcentration, exchangeRate]);

  const topAndWorst = useMemo(() => {
    const valid = valuedItems.filter((i) => i.averagePrice && i.averagePrice > 0 && i.quantity > 0);
    let best = null;
    let worst = null;
    let bestReturn = -Infinity;
    let worstReturn = Infinity;
    for (const it of valid) {
      const avgPrice = it.averagePrice!;
      const returnPct = ((it.currentPrice - avgPrice) / avgPrice) * 100;
      if (returnPct > bestReturn) {
        bestReturn = returnPct;
        best = { item: it, returnPct, price: it.currentPrice };
      }
      if (returnPct < worstReturn) {
        worstReturn = returnPct;
        worst = { item: it, returnPct, price: it.currentPrice };
      }
    }
    // Only return if they are distinctly different or valid
    return {
      best: bestReturn > 0 ? best : null,
      worst: worstReturn < 0 ? worst : null,
    };
  }, [valuedItems, quotes]);

  const {
    typeFilter,
    setTypeFilter,
    oppFilter,
    setOppFilter,
    sortOption,
    setSortOption,
    typeFilters,
    counts,
    filteredAndSorted,
  } = useAssetFilterSort(valuedItems, "ticker_asc");

  const contextStats = useMemo(() => {
    let over = 0;
    let under = 0;
    const total = valuedItems.length;
    for (const it of valuedItems) {
      if (it.currentPrice > (it.ceilingPrice ?? 0)) over++;
      else under++;
    }
    return { over, under, total };
  }, [valuedItems]);

  const handleEdit = useCallback((it: ValuedWatchlistItem) => setEditing(it), []);
  const handleOpenDetail = useCallback((it: ValuedWatchlistItem) => setDetail(it), []);
  const handleCloseDetail = useCallback(() => setDetail(null), []);
  const handleRemove = useCallback(
    (id: string) => {
      remove(id);
      toast.success(t.toasts.assetRemoved);
    },
    [remove, t.toasts.assetRemoved],
  );
  const handleDialogClose = useCallback(() => setEditing(null), []);
  const handleDialogSave = useCallback(
    (patch: Partial<WatchlistItem>) => {
      if (!editing) return;
      update(editing.id, patch);
      toast.success(t.toasts.assetUpdated);
      setEditing(null);
    },
    [editing, update, t.toasts.assetUpdated],
  );

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground gap-4 w-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p>{t.watchlist.loading}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <section>
        {!(items && items.length > 0) ? (
          <Card className="border-dashed border-border/50 bg-background/40 backdrop-blur-md">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t.watchlist.empty}</p>
              <AddAssetDropdown
                onNavigateToScreener={() => navigate({ to: "/app/screener" })}
                onOpenFIWizard={() => setShowFIWizard(true)}
                onOpenBrokerUploader={() => setShowBrokerNoteUploader(true)}
                onOpenCsvImporter={() => setShowCsvImporter(true)}
              />
              <div className="mt-4 flex justify-center w-full">
                <DataManagement />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <WatchlistKpiSection
              valuedItems={valuedItems}
              meta={meta}
              totals={totals}
              locale={locale}
              typeFilter={typeFilter}
              onSelectType={setTypeFilter}
              topAndWorst={topAndWorst}
              contextStats={contextStats}
            />

            <WatchlistToolbar
              typeFilters={typeFilters}
              counts={counts}
              typeFilter={typeFilter}
              oppFilter={oppFilter}
              sortOption={sortOption}
              onSetTypeFilter={setTypeFilter}
              onSetOppFilter={setOppFilter}
              onSetSortOption={setSortOption}
              viewMode={viewMode}
              setViewMode={setViewMode}
              onNavigateToScreener={() => navigate({ to: "/app/screener" })}
              onOpenFIWizard={() => setShowFIWizard(true)}
              onOpenBrokerUploader={() => setShowBrokerNoteUploader(true)}
              onOpenCsvImporter={() => setShowCsvImporter(true)}
            />

            <WatchlistAssetGrid
              filteredAndSorted={filteredAndSorted}
              valuedItemsLength={valuedItems.length}
              quotes={quotes}
              meta={meta}
              viewMode={viewMode}
              onEdit={handleEdit}
              onRemove={handleRemove}
              onOpenDetail={handleOpenDetail}
              onClearFilters={() => {
                setTypeFilter(null);
                setOppFilter(null);
              }}
              concentrationViolators={concentrationViolators}
            />
          </>
        )}

        <WatchlistDialogs
          editing={editing}
          detail={detail}
          showPaywall={showPaywall}
          showFIWizard={showFIWizard}
          showBrokerNoteUploader={showBrokerNoteUploader}
          showCsvImporter={showCsvImporter}
          onCloseDialog={handleDialogClose}
          onSave={handleDialogSave}
          onCloseDetail={handleCloseDetail}
          onPaywallOpenChange={setShowPaywall}
          onFIWizardOpenChange={setShowFIWizard}
          onBrokerUploaderOpenChange={setShowBrokerNoteUploader}
          onCsvImporterOpenChange={setShowCsvImporter}
        />
      </section>
    </TooltipProvider>
  );
}
