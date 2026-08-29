import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n-provider";
import { useValuedPortfolio, type ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useSettings } from "@/lib/settings";
import { useSubscription } from "@/lib/subscription";
import { useAssetFilterSort } from "@/lib/useAssetFilterSort";
import { useUserSettings } from "@/lib/useUserSettings";
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { convertCurrency } from "@/lib/currency";

import { AddAssetDropdown } from "./watchlist/AddAssetDropdown";
import { WatchlistKpiSection } from "./watchlist/WatchlistKpiSection";
import { WatchlistToolbar } from "./watchlist/WatchlistToolbar";
import { WatchlistAssetGrid } from "./watchlist/WatchlistAssetGrid";
import { WatchlistDialogs } from "./watchlist/WatchlistDialogs";
import { DataManagement } from "./watchlist/DataManagement";
import { WatchlistActionsProvider } from "./watchlist/WatchlistActionsContext";
import { NewContributionDialog } from "../horizonte/NewContributionDialog";
import { persistTransactionsBatch } from "@/lib/transactionPersistence";
import { useTransactions } from "@/lib/transactions";
import { useWatchlist } from "@/lib/watchlist";
import { useQueryClient } from "@tanstack/react-query";
import { assetQueryOptions } from "@/lib/queryOptions";
import type { ParseResult } from "@/lib/dynamicCsvParser";

interface WatchlistProps {
  onNavigateToCalculator?: () => void;
}

export function Watchlist({ onNavigateToCalculator }: WatchlistProps) {
  const [showNewContribution, setShowNewContribution] = useState(false);
  const [showFIWizard, setShowFIWizard] = useState(false);
  const [showBrokerNoteUploader, setShowBrokerNoteUploader] = useState(false);
  const [showCsvImporter, setShowCsvImporter] = useState(false);
  const [showDynamicImporter, setShowDynamicImporter] = useState(false);
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const { upsert: upsertWatchlistItem, updateAsync: updateWatchlistItemAsync } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const {
    items,
    valuedItems,
    totals,
    quotes,
    meta,
    dividendEventsMap,
    remove,
    isAppLoading: isPending,
  } = useValuedPortfolio();

  const [detail, setDetail] = useState<ValuedWatchlistItem | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<"myPosition" | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const { isPro } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const { targetYield: globalYield } = useSettings();
  const { settings } = useUserSettings();
  const maxConcentration = settings.maxConcentrationPerAsset ?? null;
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const exchangeRate = fx?.USDBRL ?? 5.5;

  // Active valued items excluding closed positions (assets with transactions whose net quantity is 0)
  const activeValuedItems = useMemo(() => {
    return (valuedItems || []).filter((it) => !it.isClosedPosition);
  }, [valuedItems]);

  // Tickers currently violating the user-defined Max Concentration cap.
  // A ticker is flagged when its share of the total consolidated portfolio
  // (converted to BRL) exceeds the configured percentage. There is no
  // "under the cap" state to flag — this only ever produces violations.
  const concentrationViolators = useMemo(() => {
    const violators = new Set<string>();
    if (!maxConcentration || maxConcentration >= 100) return violators;

    let totalBRL = 0;
    const valueByTicker: Record<string, number> = {};
    for (const it of activeValuedItems) {
      const val = it.currentPrice * it.quantity;
      if (val <= 0) continue;
      const inBrl = convertCurrency(val, it.currency, "BRL", exchangeRate);
      valueByTicker[it.ticker] = (valueByTicker[it.ticker] || 0) + inBrl;
      totalBRL += inBrl;
    }
    if (totalBRL <= 0) return violators;

    for (const [ticker, val] of Object.entries(valueByTicker)) {
      const pct = (val / totalBRL) * 100;
      if (pct > maxConcentration) violators.add(ticker);
    }
    return violators;
  }, [activeValuedItems, maxConcentration, exchangeRate]);

  const topAndWorst = useMemo(() => {
    const valid = activeValuedItems.filter((i) => i.averagePrice && i.averagePrice > 0 && i.quantity > 0);
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
  }, [activeValuedItems, quotes]);

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
  } = useAssetFilterSort(activeValuedItems, "ticker_asc");

  const contextStats = useMemo(() => {
    let over = 0;
    let under = 0;
    const total = activeValuedItems.length;
    for (const it of activeValuedItems) {
      if (it.currentPrice > (it.ceilingPrice ?? 0)) over++;
      else under++;
    }
    return { over, under, total };
  }, [activeValuedItems]);

  const handleOpenDetail = useCallback((it: ValuedWatchlistItem, initialTab?: "myPosition") => {
    setDetail(it);
    setDetailInitialTab(initialTab);
  }, []);
  const handleCloseDetail = useCallback(() => setDetail(null), []);
  const handleRemove = useCallback(
    (id: string) => {
      remove(id);
      toast.success(t.toasts.assetRemoved);
    },
    [remove, t.toasts.assetRemoved],
  );
  const handleUpdateInvestingSince = useCallback(
    async (id: string, timestamp: number) => {
      await updateWatchlistItemAsync(id, { investingSince: timestamp });
    },
    [updateWatchlistItemAsync],
  );

  const handleClearFilters = useCallback(() => {
    setTypeFilter(null);
    setOppFilter(null);
  }, [setTypeFilter, setOppFilter]);

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground gap-4 w-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p>{t.watchlist.loading}</p>
      </div>
    );
  }

  const handleConfirmDynamicImport = async (parseResult: ParseResult) => {
    const res = await persistTransactionsBatch(
      parseResult.transactions,
      items,
      transactions,
      upsertTransaction,
      upsertWatchlistItem,
      async (ticker) => {
        return queryClient.fetchQuery(assetQueryOptions(ticker));
      },
    );

    if (res.failedTransactions.length === 0) {
      toast.success(
        t.dynamicImport.importSuccessToast.replace(
          "{{count}}",
          String(res.persistedCount),
        ),
      );
    } else {
      toast.warning(
        t.dynamicImport.partialFailureWarning
          .replace("{{succeeded}}", String(res.persistedCount))
          .replace("{{failed}}", String(res.failedTransactions.length)),
      );
    }
  };

  return (
    <TooltipProvider>
      <section>
        {!(items && items.length > 0) ? (
          <Card className="border-dashed border-border/50 bg-background/40 backdrop-blur-md">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t.watchlist.empty}</p>
              <AddAssetDropdown
                onOpenNewContribution={() => setShowNewContribution(true)}
                onOpenFIWizard={() => setShowFIWizard(true)}
                onOpenBrokerUploader={() => setShowBrokerNoteUploader(true)}
                onOpenCsvImporter={() => setShowDynamicImporter(true)}
              />
              <div className="mt-4 flex justify-center w-full">
                <DataManagement />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <WatchlistKpiSection
              valuedItems={activeValuedItems}
              meta={meta}
              dividendEventsMap={dividendEventsMap}
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
              onOpenNewContribution={() => setShowNewContribution(true)}
              onOpenFIWizard={() => setShowFIWizard(true)}
              onOpenBrokerUploader={() => setShowBrokerNoteUploader(true)}
              onOpenCsvImporter={() => setShowDynamicImporter(true)}
            />

            <WatchlistActionsProvider
              value={{
                quotes,
                meta,
                onRemove: handleRemove,
                onOpenDetail: handleOpenDetail,
                concentrationViolators,
              }}
            >
              <WatchlistAssetGrid
                filteredAndSorted={filteredAndSorted}
                valuedItemsLength={activeValuedItems.length}
                quotes={quotes}
                meta={meta}
                viewMode={viewMode}
                onRemove={handleRemove}
                onOpenDetail={handleOpenDetail}
                onClearFilters={handleClearFilters}
                concentrationViolators={concentrationViolators}
              />
            </WatchlistActionsProvider>
          </>
        )}

        <WatchlistDialogs
          detail={detail}
          detailInitialTab={detailInitialTab}
          showPaywall={showPaywall}
          showFIWizard={showFIWizard}
          showBrokerNoteUploader={showBrokerNoteUploader}
          showCsvImporter={showCsvImporter}
          showDynamicImporter={showDynamicImporter}
          onCloseDetail={handleCloseDetail}
          onPaywallOpenChange={setShowPaywall}
          onFIWizardOpenChange={setShowFIWizard}
          onBrokerUploaderOpenChange={setShowBrokerNoteUploader}
          onCsvImporterOpenChange={setShowCsvImporter}
          onDynamicImporterOpenChange={setShowDynamicImporter}
          onConfirmDynamicImport={handleConfirmDynamicImport}
          onUpdateInvestingSince={handleUpdateInvestingSince}
        />

        <NewContributionDialog open={showNewContribution} onOpenChange={setShowNewContribution} />
      </section>
    </TooltipProvider>
  );
}
