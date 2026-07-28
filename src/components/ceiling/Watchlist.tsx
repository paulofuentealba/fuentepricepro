import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exchangeRateQueryOptions, macroRatesQueryOptions } from "@/lib/queryOptions";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AssetType, Currency } from "@/lib/domain";
import { formatCurrency, displayTicker } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { netAfterTax, calculateFixedIncomeBalance } from "@/lib/calculations";
import { AssetCard } from "@/components/shared/AssetCard";
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
import { getAssetValuation } from "@/lib/calculations";
import { useValuedPortfolio, type ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useSelic } from "@/lib/useSelic";
import { MetricBox } from "@/components/shared/MetricBox";

import { Button } from "@/components/ui/button";
import { PlusCircle, LayoutGrid, List, TrendingUp, TrendingDown, ChevronDown, Shield, Globe } from "lucide-react";
import { FixedIncomeWizardSheet } from "./watchlist/FixedIncomeWizardSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WatchlistProps {
  onNavigateToCalculator?: () => void;
}

export function Watchlist({ onNavigateToCalculator }: WatchlistProps) {
  const navigate = useNavigate();
  const [showFIWizard, setShowFIWizard] = useState(false);
  const { t, locale } = useI18n();
  const { items, remove, update, upsert, isPending } = useWatchlist();
  const [editing, setEditing] = useState<ValuedWatchlistItem | null>(null);
  const [detail, setDetail] = useState<ValuedWatchlistItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const { isPro } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const { targetYield: globalYield } = useSettings();

  // Treat "6" (the old hardcoded default) as "tracking the global yield".
  const baseItems = useMemo(() => {
    return (items || []).map((it) => ({
      ...it,
      targetYield: it.targetYield === 6 ? globalYield : it.targetYield,
    }));
  }, [items, globalYield]);

  const { quotes, meta } = useLiveQuotesAndMeta(baseItems);
  const { data: selic } = useSelic();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const { data: macroRates } = useQuery(macroRatesQueryOptions());

  const valuedItems = useMemo(() => {
    return baseItems.map((it) => {
      const q = quotes[it.ticker];
      const m = meta[it.ticker];
      const currentPrice = q?.price ?? it.currentPrice;
      const valuation = getAssetValuation({
        targetYield: it.targetYield,
        currentPrice,
        avgDividend: it.annualDividend,
        eps: m?.eps,
        bvps: m?.pbRatio && currentPrice > 0 ? currentPrice / m.pbRatio : null,
        dividendCagr: m?.dividendCagr5y,
        selicPct: selic ?? 10.5,
        currency: it.currency,
        type: it.type,
      });

      return {
        ...it,
        currentPrice,
        ceilingPrice: valuation.activeCeiling,
        safetyMargin: valuation.margin,
      };
    });
  }, [baseItems, quotes, meta, selic]);

  const totals = useMemo(() => {
    let usd = 0;
    let brl = 0;
    let usdWorth = 0;
    let brlWorth = 0;
    let countUsd = 0;
    let countBrl = 0;
    for (const it of valuedItems) {
      const income = netAfterTax(
        it.annualDividend * it.quantity,
        it.type,
        it.currency,
        it.customTaxRate,
      );
      
      let worth = it.currentPrice * it.quantity;
      if (it.type === "FIXED_INCOME") {
        const accrual = calculateFixedIncomeBalance(it, macroRates);
        if (accrual) {
          worth = accrual.accruedBalance;
        }
      }

      if (it.currency === "USD") {
        usd += income;
        usdWorth += worth;
        countUsd++;
      } else if (it.currency === "BRL") {
        brl += income;
        brlWorth += worth;
        countBrl++;
      }
    }
    
    const rate = fx?.USDBRL ?? 1; // Default to 1 if missing so it doesn't break
    const consolidatedNetWorth = brlWorth + (usdWorth * rate);
    const consolidatedIncome = brl + (usd * rate);

    return { usd, brl, usdWorth, brlWorth, countUsd, countBrl, consolidatedNetWorth, consolidatedIncome };
  }, [valuedItems, fx, macroRates]);

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

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground gap-4 w-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="mt-2 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  >
                    <PlusCircle className="h-4 w-4" />
                    {t.watchlist.addFirstAsset}
                    <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 bg-slate-900 border-slate-700">
                  <DropdownMenuItem className="cursor-pointer gap-2 py-3 focus:bg-slate-800 focus:text-emerald-400" onClick={() => navigate({ to: "/app/screener" })}>
                    <TrendingUp className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{t.watchlist.addEquity}</span>
                      <span className="text-xs text-slate-500">{t.watchlist.addEquityDesc}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2 py-3 focus:bg-slate-800 focus:text-emerald-400" onClick={() => setShowFIWizard(true)}>
                    <Shield className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{t.watchlist.addFixedIncome}</span>
                      <span className="text-xs text-slate-500">{t.watchlist.addFixedIncomeDesc}</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="mt-4 flex justify-center w-full">
                <DataManagement />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 grid gap-3 lg:grid-cols-2">
              <div className="flex flex-col gap-3">
                <AllocationChart 
                  items={valuedItems} 
                  selectedType={typeFilter} 
                  onSelectType={setTypeFilter} 
                />
                <NextPaymentBanner items={valuedItems} meta={meta} />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col rounded-xl border border-emerald-500/30 bg-background/60 backdrop-blur-md p-4 lg:p-6 transition-colors hover:bg-background/80">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {t.watchlist.consolidatedNetWorth}
                  </span>
                  <div className="flex items-center gap-2 text-4xl lg:text-5xl font-bold tabular-nums">
                    <Globe className="h-8 w-8 text-emerald-400" />
                    <span className="bg-gradient-to-r from-white via-emerald-400 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm">
                      {formatCurrency(totals.consolidatedNetWorth, "BRL", locale)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground/80">
                    {t.watchlist.consolidatedNetWorthSub}
                  </div>
                </div>

                <MetricBox
                  label={t.watchlist.consolidatedIncome}
                  value={
                    <div className="flex items-center gap-2 text-2xl font-bold">
                      <Globe className="h-5 w-5 text-emerald-400" />
                      {formatCurrency(totals.consolidatedIncome, "BRL", locale)}
                    </div>
                  }
                  subValue={t.watchlist.consolidatedIncomeSub}
                  className="bg-background/60 backdrop-blur-md border border-emerald-500/20 py-4"
                />

                <div className="grid grid-cols-2 gap-3">
                  <MetricBox
                    label={t.watchlist.totalUsdIncome}
                    value={
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇺🇸</span>
                        {formatCurrency(totals.usd, "USD", locale)}
                      </div>
                    }
                    subValue={`${totals.countUsd} ${t.watchlist.assets}`}
                    className="bg-card/40 backdrop-blur-md"
                  />
                  <MetricBox
                    label={t.watchlist.totalBrlIncome}
                    value={
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇧🇷</span>
                        {formatCurrency(totals.brl, "BRL", locale)}
                      </div>
                    }
                    subValue={`${totals.countBrl} ${t.watchlist.assets}`}
                    className="bg-card/40 backdrop-blur-md"
                  />

                  {topAndWorst.best ? (
                    <MetricBox
                      label={t.watchlist.topPerformer}
                      value={
                        <span className="text-success truncate">
                          {displayTicker(topAndWorst.best.item.ticker)} (+
                          {topAndWorst.best.returnPct.toFixed(2)}%)
                        </span>
                      }
                      subValue={formatCurrency(
                        topAndWorst.best.price,
                        topAndWorst.best.item.currency,
                        locale,
                      )}
                      variant="default"
                      className="bg-card/40 backdrop-blur-md hover:border-success/30 overflow-hidden"
                      tooltip={<TrendingUp className="h-3 w-3 text-success/80" />}
                    />
                  ) : (
                    <div />
                  )}

                  {topAndWorst.worst ? (
                    <MetricBox
                      label={t.watchlist.worstPerformer}
                      value={
                        <span className="text-danger truncate">
                          {displayTicker(topAndWorst.worst.item.ticker)} (
                          {topAndWorst.worst.returnPct.toFixed(2)}%)
                        </span>
                      }
                      subValue={formatCurrency(
                        topAndWorst.worst.price,
                        topAndWorst.worst.item.currency,
                        locale,
                      )}
                      variant="default"
                      className="bg-card/40 backdrop-blur-md hover:border-danger/30 overflow-hidden"
                      tooltip={<TrendingDown className="h-3 w-3 text-danger/80" />}
                    />
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            </div>



            {contextStats.total > 0 && (
              <div className="mb-4 w-full py-2 px-3 rounded-md bg-muted/20 border border-muted/30">
                <span className="text-sm text-muted-foreground italic">
                  {contextStats.over > contextStats.under
                    ? t.watchlist.contextOvervalued.replace("{{over}}", contextStats.over.toString()).replace("{{total}}", contextStats.total.toString())
                    : contextStats.under > contextStats.over
                      ? t.watchlist.contextUndervalued.replace("{{under}}", contextStats.under.toString()).replace("{{total}}", contextStats.total.toString())
                      : t.watchlist.contextBalanced.replace("{{under}}", contextStats.under.toString()).replace("{{total}}", contextStats.total.toString())}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      <PlusCircle className="h-4 w-4" />
                      {t.watchlist.addAssetDropdown}
                      <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700">
                    <DropdownMenuItem className="cursor-pointer gap-2 py-3 focus:bg-slate-800 focus:text-emerald-400" onClick={() => navigate({ to: "/app/screener" })}>
                      <TrendingUp className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">{t.watchlist.addEquity}</span>
                        <span className="text-xs text-slate-500">{t.watchlist.addEquityDesc}</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-2 py-3 focus:bg-slate-800 focus:text-emerald-400" onClick={() => setShowFIWizard(true)}>
                      <Shield className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">{t.watchlist.addFixedIncome}</span>
                        <span className="text-xs text-slate-500">{t.watchlist.addFixedIncomeDesc}</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

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

            {(filteredAndSorted && filteredAndSorted.length === 0 && valuedItems.length > 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/50 bg-background/40 backdrop-blur-md">
                <p className="text-sm text-muted-foreground mb-4">{t.emptyStates?.noMatch || "Nenhum ativo encontrado."}</p>
                <Button variant="outline" size="sm" onClick={() => { setTypeFilter(null); setOppFilter(null); }}>
                  {t.emptyStates?.clearFilters || "Limpar Filtros"}
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(filteredAndSorted || []).map((it) => (
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
        <FixedIncomeWizardSheet open={showFIWizard} onOpenChange={setShowFIWizard} />
      </section>
    </TooltipProvider>
  );
}
