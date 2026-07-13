import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AssetType, Currency } from "@/lib/domain";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { netAfterTax } from "@/lib/calc";
import { AssetCard } from "./watchlist/AssetCard";
import { AssetDetailSheet } from "./watchlist/AssetDetailSheet";
import { EditItemDialog } from "./watchlist/EditItemDialog";
import { NextPaymentBanner } from "./watchlist/NextPaymentBanner";
import { useSettings } from "@/lib/settings";
import { AllocationChart } from "./watchlist/AllocationChart";
import { useLiveQuotesAndMeta } from "./watchlist/useLiveQuotesAndMeta";
import { PaywallDialog } from "../ui/PaywallDialog";
import { useSubscription } from "@/lib/subscription";
import { useAssetFilterSort } from "@/lib/useAssetFilterSort";
import { WatchlistFilterBar } from "./watchlist/WatchlistFilterBar";
import { WatchlistTable } from "./watchlist/WatchlistTable";
import { DataManagement } from "./watchlist/DataManagement";
import { MetricBox } from "./shared/MetricBox";

import { Button } from "@/components/ui/button";
import { PlusCircle, LayoutGrid, List, TrendingUp, TrendingDown } from "lucide-react";

interface WatchlistProps {
  onNavigateToCalculator?: () => void;
}

export function Watchlist({ onNavigateToCalculator }: WatchlistProps) {
  const { t, locale } = useI18n();
  const { items, remove, update, upsert } = useWatchlist();
  const [editing, setEditing] = useState<WatchlistItem | null>(null);
  const [detail, setDetail] = useState<WatchlistItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const { isPro } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const { targetYield: globalYield } = useSettings();

  // Recalculate ceiling and margin on the fly. 
  // Treat "6" (the old hardcoded default) as "tracking the global yield".
  const dynamicItems = useMemo(() => {
    return items.map(it => {
      // If the asset has exactly 6% (old default) OR if it was saved as the current global yield, 
      // we let it track the global yield. If the user edits it to something else (e.g. 10%), it keeps 10%.
      const effectiveYield = (it.targetYield === 6) ? globalYield : it.targetYield;
      const ceiling = effectiveYield > 0 ? it.annualDividend / (effectiveYield / 100) : 0;
      const margin = ceiling > 0 && it.currentPrice > 0 ? ((ceiling - it.currentPrice) / it.currentPrice) * 100 : 0;
      
      return {
        ...it,
        targetYield: effectiveYield,
        ceilingPrice: ceiling,
        safetyMargin: margin
      };
    });
  }, [items, globalYield]);

  const { quotes, meta } = useLiveQuotesAndMeta(dynamicItems);

  const totals = useMemo(() => {
    let usd = 0;
    let brl = 0;
    let countUsd = 0;
    let countBrl = 0;
    for (const it of dynamicItems) {
      const income = netAfterTax(it.annualDividend * it.quantity, it.type, it.currency, it.customTaxRate);
      if (it.currency === "USD") {
        usd += income;
        countUsd++;
      } else if (it.currency === "BRL") {
        brl += income;
        countBrl++;
      }
    }
    return { usd, brl, countUsd, countBrl };
  }, [dynamicItems]);

  const topAndWorst = useMemo(() => {
    let best = null;
    let worst = null;
    let bestReturn = -Infinity;
    let worstReturn = Infinity;
    for (const it of dynamicItems) {
      if (!it.averagePrice || it.averagePrice <= 0) continue;
      const price = quotes[it.ticker]?.price ?? it.currentPrice;
      if (price <= 0) continue;
      const returnPct = ((price - it.averagePrice) / it.averagePrice) * 100;
      if (returnPct > bestReturn) {
        bestReturn = returnPct;
        best = { item: it, returnPct, price };
      }
      if (returnPct < worstReturn) {
        worstReturn = returnPct;
        worst = { item: it, returnPct, price };
      }
    }
    // Only return if they are distinctly different or valid
    return { 
      best: bestReturn > 0 ? best : null, 
      worst: worstReturn < 0 ? worst : null 
    };
  }, [dynamicItems, quotes]);

  const {
    typeFilter, setTypeFilter,
    oppFilter, setOppFilter,
    sortOption, setSortOption,
    typeFilters,
    counts,
    filteredAndSorted
  } = useAssetFilterSort(dynamicItems, "ticker_asc");

  const handleEdit = useCallback((it: WatchlistItem) => setEditing(it), []);
  const handleOpenDetail = useCallback((it: WatchlistItem) => setDetail(it), []);
  const handleCloseDetail = useCallback(() => setDetail(null), []);
  const handleRemove = useCallback((id: string) => remove(id), [remove]);
  const handleDialogClose = useCallback(() => setEditing(null), []);
  const handleDialogSave = useCallback(
    (patch: Partial<WatchlistItem>) => {
      if (!editing) return;
      update(editing.id, patch);
      toast.success(t.watchlist.updated);
      setEditing(null);
    },
    [editing, update, t.watchlist.updated],
  );

  return (
    <TooltipProvider>
      <section>
        {items.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-card/30">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t.watchlist.empty}</p>
              {onNavigateToCalculator && (
                <Button
                  onClick={() => {
                    onNavigateToCalculator();
                  }}
                  variant="outline"
                  className="mt-2 gap-2 bg-background/50 hover:bg-success/15 hover:text-success hover:border-success/30"
                >
                  <PlusCircle className="h-4 w-4" />
                  {t.watchlist.addFirstAsset}
                </Button>
              )}
              {/* DataManagement in Empty State */}
              <div className="mt-4 flex justify-center w-full">
                 <DataManagement />
              </div>
              {/* Empty state bottom spacing */}
            </CardContent>
          </Card>
        ) : (
          <>

            <div className="mb-4 grid gap-3 lg:grid-cols-2">
              <AllocationChart items={dynamicItems} />
              
              <div className="grid gap-3 grid-cols-2">
                <MetricBox
                  label={t.watchlist.totalUsdIncome}
                  value={<div className="flex items-center gap-2"><span className="text-xl">🇺🇸</span>{formatCurrency(totals.usd, "USD", locale)}</div>}
                  subValue={`${totals.countUsd} ${t.watchlist.assets}`}
                  className="bg-card/40 backdrop-blur-md"
                />
                <MetricBox
                  label={t.watchlist.totalBrlIncome}
                  value={<div className="flex items-center gap-2"><span className="text-xl">🇧🇷</span>{formatCurrency(totals.brl, "BRL", locale)}</div>}
                  subValue={`${totals.countBrl} ${t.watchlist.assets}`}
                  className="bg-card/40 backdrop-blur-md"
                />

                {topAndWorst.best ? (
                  <MetricBox
                    label={t.watchlist.topPerformer}
                    value={
                      <span className="text-success">
                        {topAndWorst.best.item.ticker.replace(/\.SA$/i, "")} (+{topAndWorst.best.returnPct.toFixed(2)}%)
                      </span>
                    }
                    subValue={formatCurrency(topAndWorst.best.price, topAndWorst.best.item.currency, locale)}
                    variant="default"
                    className="bg-card/40 backdrop-blur-md hover:border-success/30"
                    tooltip={<TrendingUp className="h-3 w-3 text-success/80" />}
                  />
                ) : <div />}

                {topAndWorst.worst ? (
                  <MetricBox
                    label={t.watchlist.worstPerformer}
                    value={
                      <span className="text-danger">
                        {topAndWorst.worst.item.ticker.replace(/\.SA$/i, "")} ({topAndWorst.worst.returnPct.toFixed(2)}%)
                      </span>
                    }
                    subValue={formatCurrency(topAndWorst.worst.price, topAndWorst.worst.item.currency, locale)}
                    variant="default"
                    className="bg-card/40 backdrop-blur-md hover:border-danger/30"
                    tooltip={<TrendingDown className="h-3 w-3 text-danger/80" />}
                  />
                ) : <div />}
              </div>
            </div>

            <NextPaymentBanner items={dynamicItems} meta={meta} />

            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <WatchlistFilterBar
                  typeFilters={typeFilters}
                  counts={counts}
                  typeFilter={typeFilter}
                  oppFilter={oppFilter}
                  sortOption={sortOption}
                  onSetTypeFilter={setTypeFilter}
                  onSetOppFilter={setOppFilter}
                  onSetSortOption={setSortOption}
                />
              </div>
              <div className="flex items-center gap-4 shrink-0 flex-wrap">
                <DataManagement />
                <div className="flex items-center gap-1 rounded-md border border-border/60 bg-background/50 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded p-1.5 transition-colors ${viewMode === "grid" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"}`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded p-1.5 transition-colors ${viewMode === "table" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"}`}
                  title="Table View (Bulk Edit)"
                >
                  <List className="h-4 w-4" />
                </button>
                </div>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAndSorted.map((it) => (
                  <AssetCard
                    key={it.id}
                    item={it}
                    quote={quotes[it.ticker]}
                    meta={meta[it.ticker]}
                    onEdit={handleEdit}
                    onRemove={handleRemove}
                    onOpenDetail={handleOpenDetail}
                  />
                ))}
              </div>
            ) : (
              <WatchlistTable items={filteredAndSorted} quotes={quotes} />
            )}
          </>
        )}

        <EditItemDialog item={editing} onClose={handleDialogClose} onSave={handleDialogSave} />
        <AssetDetailSheet item={detail} onClose={handleCloseDetail} />
        <PaywallDialog 
          open={showPaywall} 
          onOpenChange={setShowPaywall} 
          title={t.watchlist.limitReached}
          description={t.watchlist.limitReachedDesc}
        />
      </section>
    </TooltipProvider>
  );
}
