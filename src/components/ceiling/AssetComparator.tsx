import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Scale, Info, Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { searchQueryOptions, assetQueryOptions } from "@/lib/queryOptions";
import { useQueries } from "@tanstack/react-query";
import { getAssetValuation, avgDividend } from "@/lib/calculations";
import { useSelic } from "@/lib/useSelic";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { displayTicker } from "@/lib/i18n";
import { getShareClassBadge } from "@/lib/classify";
import { useI18n } from "@/lib/i18n-provider";
import type { SearchHit } from "@/lib/apiService.functions";
import type { AssetType, Asset } from "@/lib/domain";
import { AssetCard } from "@/components/shared/AssetCard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AssetDetailSheet } from "./watchlist/AssetDetailSheet";
import { useSettings } from "@/lib/settings";
import { useWatchlist } from "@/lib/watchlist";
import { getCanonicalAnnualDividend } from "@/lib/calculations";
import { buildComparatorCsv, downloadCsv, type ComparatorExportRow } from "@/lib/csv";

const ALL_TYPES: AssetType[] = [
  "STOCK_US",
  "STOCK_BR",
  "REIT",
  "FII",
  "FII_INFRA",
  "FIAGRO",
  "ETF",
];

export function AssetComparator() {
  const { t } = useI18n();
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: selic } = useSelic();

  const shouldSearch = query.trim().length > 0;

  useEffect(() => {
    if (!shouldSearch) {
      setDebouncedQuery("");
      return;
    }
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query, shouldSearch]);

  const searchResult = useQuery(searchQueryOptions(debouncedQuery));

  const suggestions = useMemo(() => {
    const raw = searchResult.data ?? [];
    const validRaw = raw.filter(
      (item) => ALL_TYPES.includes(item.type) && !selectedTickers.includes(item.ticker),
    );
    return Array.from(new Map(validRaw.map((item) => [item.ticker, item])).values());
  }, [searchResult.data, selectedTickers]);

  const searching = shouldSearch && (searchResult.isFetching || debouncedQuery === "");

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function handleSelect(hit: SearchHit) {
    if (selectedTickers.length >= 3) return;
    setSelectedTickers((prev) => [...prev, hit.ticker]);
    setQuery("");
    setOpen(false);
  }

  function handleRemove(ticker: string) {
    setSelectedTickers((prev) => prev.filter((t) => t !== ticker));
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" />
          {t.comparator.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.comparator.subtitle}</p>
      </div>

      <div ref={containerRef} className="relative z-30 w-full max-w-xl mx-auto">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoComplete="off"
            value={query}
            placeholder={
              selectedTickers.length >= 3
                ? t.comparator.limitReached
                : t.comparator.searchPlaceholder
            }
            onChange={(e) => {
              setQuery(e.target.value.toUpperCase());
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={selectedTickers.length >= 3}
            className="h-12 pl-9 rounded-xl border-border/50 bg-background/50 backdrop-blur"
          />
        </div>

        {open && selectedTickers.length < 3 && query.length >= 2 && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border/50 bg-popover/90 backdrop-blur-xl shadow-2xl">
            {suggestions.length > 0 ? (
              <ul className="max-h-64 overflow-auto py-1">
                {suggestions.map((a) => {
                  const sc = getShareClassBadge(a.ticker, a.type);
                  return (
                    <li key={a.ticker}>
                      <button
                        type="button"
                        onClick={() => handleSelect(a)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <span className="flex flex-col">
                          <span className="flex items-center gap-1.5 font-bold text-foreground">
                            {displayTicker(a.ticker)}
                            {sc && (
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                                  sc.className,
                                )}
                              >
                                {sc.label}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">{a.name}</span>
                        </span>
                        <Badge variant="secondary" className="shrink-0">
                          {t.types[a.type]}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t.comparator.noAssetsFound}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedTickers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-2xl bg-background/20 backdrop-blur mt-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Scale className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">{t.comparator.emptyTitle}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{t.comparator.emptySubtitle}</p>
        </div>
      ) : (
        <div className="mt-8">
          <ComparatorCards tickers={selectedTickers} onRemove={handleRemove} />
        </div>
      )}
    </div>
  );
}

// Separate component to handle the fetching and comparison logic
function ComparatorCards({
  tickers,
  onRemove,
}: {
  tickers: string[];
  onRemove: (ticker: string) => void;
}) {
  const { t } = useI18n();
  const { items: portfolioItems } = useWatchlist();
  const { targetYield: globalYield } = useSettings();
  const { data: selic } = useSelic();
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);

  const queries = useQueries({
    queries: tickers.map((ticker) => assetQueryOptions(ticker)),
  });

  const isLoading = queries.some((q: any) => q.isFetching);

  // Extract data
  const dataMap = queries.map((q: any) => q.data).filter(Boolean) as Asset[];

  const handleExportCsv = useCallback(() => {
    if (dataMap.length === 0) return;
    try {
      const rows: ComparatorExportRow[] = dataMap.map((data) => {
        const savedItem = portfolioItems?.find((it) => it.ticker === data.ticker);
        const activeYield = savedItem?.targetYield ?? globalYield;
        const avgDiv = getCanonicalAnnualDividend(data, 3);
        const val = getAssetValuation({
          targetYield: activeYield,
          currentPrice: data.currentPrice,
          avgDividend: avgDiv,
          eps: data.metrics?.eps || null,
          bvps:
            data.metrics?.bvps != null
              ? data.metrics.bvps
              : data.metrics?.pbRatio && data.currentPrice > 0
                ? data.currentPrice / data.metrics.pbRatio
                : null,
          dividendCagr: data.metrics?.dividendCagr5y || null,
          selicPct: selic ?? 10.5,
          currency: data.currency,
          type: data.type,
        });

        const dy = data.currentPrice > 0 && avgDiv > 0 ? (avgDiv / data.currentPrice) * 100 : null;

        return {
          ticker: data.ticker,
          name: data.name,
          type: data.type,
          currentPrice: data.currentPrice,
          ceilingPrice: val.isUnavailable ? null : val.activeCeiling,
          safetyMargin: val.isUnavailable ? null : val.margin,
          dividendYield: dy,
          cagr5y: data.metrics?.dividendCagr5y ?? null,
          peRatio:
            data.metrics?.peRatio ??
            (data.metrics?.eps && data.metrics.eps > 0 && data.currentPrice > 0
              ? data.currentPrice / data.metrics.eps
              : null),
          pbRatio: data.metrics?.pbRatio ?? null,
          bazin: val.bazin,
          graham: val.graham,
          gordon: val.gordon,
          consensus: val.consensus,
        };
      });

      const csv = buildComparatorCsv(rows);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`comparador-${date}.csv`, csv);
      toast.success(t.toasts.exportSuccess.replace("{{count}}", String(rows.length)));
    } catch (err) {
      console.error("[comparator-export] failed", err);
      toast.error(t.toasts.exportFailed);
    }
  }, [dataMap, portfolioItems, globalYield, selic, t]);

  if (isLoading) {
    return (
      <div className="col-span-full py-12 text-center text-muted-foreground">
        {t.comparator.loading}
      </div>
    );
  }

  const types = new Set(dataMap.map((d) => d.type));
  const hasMixedClasses = types.size > 1;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs text-muted-foreground">
          {dataMap.length} {dataMap.length === 1 ? "ativo comparado" : "ativos comparados"}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs border-border/60 hover:bg-muted"
          onClick={handleExportCsv}
        >
          <Download className="h-3.5 w-3.5" />
          {t.comparator.exportCsv}
        </Button>
      </div>
      {hasMixedClasses && (
        <div className="col-span-full text-xs text-muted-foreground opacity-60 text-center pb-4">
          {t.comparator.mixedClassesWarning}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dataMap.map((data) => {
          const savedItem = portfolioItems?.find((it) => it.ticker === data.ticker);
          const activeYield = savedItem?.targetYield ?? globalYield;
          const avgDiv = getCanonicalAnnualDividend(data, 3);
          const val = getAssetValuation({
            targetYield: activeYield,
            currentPrice: data.currentPrice,
            avgDividend: avgDiv,
            eps: data.metrics?.eps || null,
            bvps:
              data.metrics?.bvps != null
                ? data.metrics.bvps
                : data.metrics?.pbRatio && data.currentPrice > 0
                  ? data.currentPrice / data.metrics.pbRatio
                  : null,
            dividendCagr: data.metrics?.dividendCagr5y || null,
            selicPct: selic ?? 10.5,
            currency: data.currency,
            type: data.type,
          });

          return (
            <div key={data.ticker} className="relative group animate-in fade-in zoom-in-95">
              <AssetCard
                item={
                  {
                    id: data.ticker,
                    ticker: data.ticker,
                    name: data.name,
                    currency: data.currency,
                    type: data.type,
                    currentPrice: data.currentPrice,
                    targetYield: activeYield,
                    annualDividend: avgDiv,
                    quantity: 1,
                    averagePrice: data.currentPrice,
                    sector: data.sector || t.common.other,
                    createdAt: Date.now(),
                    valuation: val,
                  } as any
                }
                isSimulation={activeYield !== savedItem?.targetYield}
                meta={
                  {
                    eps: data.metrics?.eps || null,
                    pbRatio: data.metrics?.pbRatio || null,
                    dividendCagr5y: data.metrics?.dividendCagr5y || null,
                    sector: data.sector || t.common.other,
                  } as any
                }
                variant="watchlist"
                hideAddToWatchlist
                onClose={(ticker) => onRemove(ticker)}
                onOpenDetail={(item) => setSelectedDetailItem(item)}
              />
            </div>
          );
        })}
      </div>
      <AssetDetailSheet
        item={selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
        hidePlayground
        hideGoalPlanner
        hidePositionTabs
      />
    </TooltipProvider>
  );
}
