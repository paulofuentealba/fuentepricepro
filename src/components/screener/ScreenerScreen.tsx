import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  Calculator,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import {
  getAssetValuation,
  getCanonicalAnnualDividend,
  calculateBvps,
  GORDON_TERMINAL_GROWTH_RATE,
  resolveTargetYield,
} from "@/lib/calculations";
import { classifyBr } from "@/lib/classify";
import { useSelic } from "@/lib/useSelic";
import { SELIC_FALLBACK } from "@/lib/macroDefaults";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  displayTicker,
  getDisplayAssetType,
} from "@/lib/formatters";
import {
  dividendRadarQueryOptions,
  ipcaFiveYearAverageQueryOptions,
  assetQueryOptions,
} from "@/lib/queryOptions";
import { useValuedPortfolio, type ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { simulateScreenerImpact } from "@/lib/screenerSimulation";
import { buildScreenerCandidate } from "@/lib/screenerCandidate";
import { resolveReasonText } from "@/lib/askEngine";
import { resolveDisclaimerText } from "@/lib/disclaimer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STICKY_FIRST_COLUMN_CLASS } from "@/components/ui/responsive-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TickerSearchField } from "@/components/shared/TickerSearchField";
import type { SearchHit } from "@/lib/apiService.functions";
import type { AssetType, Currency } from "@/lib/domain";
import { cn } from "@/lib/utils";

const VERDICT_VARIANT = {
  above_ceiling: "danger",
  yield_trap: "danger",
  great_entry: "success",
  fair_entry: "gold",
  no_data: "default",
} as const;

export interface ScreenerItem {
  ticker: string;
  name: string;
  type: AssetType;
  currency: Currency;
  currentPrice: number;
  ceilingPrice: number | null;
  safetyMargin: number | null;
  dy: number | null;
  pvp: number | null;
  isHeld: boolean;
  rawAsset: any;
}

export function ScreenerScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { t, locale } = useI18n();
  const { valuedItems, isAppLoading, fx } = useValuedPortfolio();
  const { settings } = useUserSettings();
  const queryClient = useQueryClient();

  const [marketFilter, setMarketFilter] = useState<"ALL" | "BR" | "US">("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [marginFilter, setMarginFilter] = useState<string>("ALL");
  const [dyFilter, setDyFilter] = useState<string>("ALL");
  const [pvpFilter, setPvpFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<string>("MARGIN_DESC");

  const [customAssets, setCustomAssets] = useState<any[]>([]);
  const [isFetchingCustom, setIsFetchingCustom] = useState(false);

  // Simulation modal state
  const [simulatingItem, setSimulatingItem] = useState<ScreenerItem | null>(null);
  const [rawAmount, setRawAmount] = useState("1.000");
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const fxRate = fx?.USDBRL ?? 5;

  const {
    data: radarData,
    isLoading: isRadarLoading,
  } = useQuery(dividendRadarQueryOptions());
  const { data: selic } = useSelic();
  const { data: ipcaAvg } = useQuery(ipcaFiveYearAverageQueryOptions());

  const heldTickers = useMemo(
    () => new Set(valuedItems.map((i) => i.ticker.toUpperCase())),
    [valuedItems],
  );

  const rawUniverse = useMemo(() => {
    const brList = radarData?.br || [];
    const usList = radarData?.us || [];
    const combined = [...brList, ...usList];
    for (const custom of customAssets) {
      if (!combined.some((a: any) => a.ticker === custom.ticker)) {
        combined.unshift(custom);
      }
    }
    return combined;
  }, [radarData, customAssets]);

  const items = useMemo<ScreenerItem[]>(() => {
    return rawUniverse.map((asset: any) => {
      const canonicalDiv = getCanonicalAnnualDividend(asset, 3);
      const isBr =
        asset.currency === "BRL" ||
        (asset.currency !== "USD" &&
          (asset.ticker.endsWith(".SA") ||
            /^[A-Z]{4}(3|4|11)$/.test(asset.ticker) ||
            classifyBr(asset.ticker) !== "STOCK_US"));
      const currency: Currency = isBr ? "BRL" : "USD";
      const assetType: AssetType =
        asset.type || (currency === "BRL" ? classifyBr(asset.ticker) : "STOCK_US");
      const effectiveYield = resolveTargetYield(
        { type: assetType, targetYield: asset.targetYield },
        settings,
      ).effectiveYield;

      const bvps = calculateBvps(asset.metrics?.bvps, asset.metrics?.pbRatio, asset.currentPrice);
      const valuation = getAssetValuation({
        targetYield: effectiveYield,
        currentPrice: asset.currentPrice,
        avgDividend: canonicalDiv,
        eps: asset.metrics?.eps ?? null,
        bvps,
        dividendCagr: asset.metrics?.dividendCagr5y ?? null,
        selicPct: selic ?? SELIC_FALLBACK,
        terminalGrowthRate: ipcaAvg ?? GORDON_TERMINAL_GROWTH_RATE,
        currency,
        type: assetType,
      });

      let pvp: number | null = null;
      if (asset.metrics?.pbRatio != null && Number.isFinite(asset.metrics.pbRatio)) {
        pvp = asset.metrics.pbRatio;
      } else if (bvps != null && bvps > 0 && asset.currentPrice > 0) {
        pvp = asset.currentPrice / bvps;
      }

      return {
        ticker: asset.ticker,
        name: asset.name || asset.ticker,
        type: assetType,
        currency,
        currentPrice: asset.currentPrice,
        ceilingPrice: valuation.activeCeiling,
        safetyMargin: valuation.isUnavailable ? null : valuation.margin,
        dy: valuation.isUnavailable ? null : valuation.dividendYield,
        pvp,
        isHeld: heldTickers.has(asset.ticker.toUpperCase()),
        rawAsset: asset,
      };
    });
  }, [rawUniverse, settings, selic, ipcaAvg, heldTickers]);

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        if (marketFilter === "BR" && item.currency !== "BRL") return false;
        if (marketFilter === "US" && item.currency !== "USD") return false;

        if (classFilter !== "ALL" && item.type !== classFilter) return false;

        if (marginFilter === "POSITIVE" && (item.safetyMargin == null || item.safetyMargin <= 0)) {
          return false;
        }
        if (marginFilter === "SAFE" && (item.safetyMargin == null || item.safetyMargin < 10)) {
          return false;
        }
        if (marginFilter === "DEEP" && (item.safetyMargin == null || item.safetyMargin < 20)) {
          return false;
        }

        if (dyFilter !== "ALL") {
          const minDy = Number(dyFilter);
          if (item.dy == null || item.dy < minDy) return false;
        }

        if (pvpFilter === "DISCOUNT" && (item.pvp == null || item.pvp >= 1.0)) {
          return false;
        }
        if (pvpFilter === "FAIR" && (item.pvp == null || item.pvp >= 1.2)) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTicker = item.ticker.toLowerCase().includes(q);
          const matchName = item.name.toLowerCase().includes(q);
          if (!matchTicker && !matchName) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "MARGIN_DESC") {
          const mA = a.safetyMargin ?? -Infinity;
          const mB = b.safetyMargin ?? -Infinity;
          return mB - mA;
        }
        if (sortOption === "DY_DESC") {
          const dyA = a.dy ?? -Infinity;
          const dyB = b.dy ?? -Infinity;
          return dyB - dyA;
        }
        if (sortOption === "PVP_ASC") {
          const pA = a.pvp ?? Infinity;
          const pB = b.pvp ?? Infinity;
          return pA - pB;
        }
        if (sortOption === "TICKER_ASC") {
          return a.ticker.localeCompare(b.ticker);
        }
        return 0;
      });
  }, [items, marketFilter, classFilter, marginFilter, dyFilter, pvpFilter, searchQuery, sortOption]);

  // KPIs
  const totalAnalyzed = filteredAndSortedItems.length;
  const undervaluedCount = useMemo(
    () => filteredAndSortedItems.filter((i) => i.safetyMargin != null && i.safetyMargin > 0).length,
    [filteredAndSortedItems],
  );
  const avgMargin = useMemo(() => {
    const valid = filteredAndSortedItems
      .map((i) => i.safetyMargin)
      .filter((m): m is number => m != null && !isNaN(m));
    if (valid.length === 0) return null;
    return valid.reduce((sum, m) => sum + m, 0) / valid.length;
  }, [filteredAndSortedItems]);
  const avgDy = useMemo(() => {
    const valid = filteredAndSortedItems
      .map((i) => i.dy)
      .filter((d): d is number => d != null && !isNaN(d));
    if (valid.length === 0) return null;
    return valid.reduce((sum, d) => sum + d, 0) / valid.length;
  }, [filteredAndSortedItems]);

  // Handle ad-hoc search selection
  async function handlePickNewTicker(hit: SearchHit) {
    setIsFetchingCustom(true);
    try {
      const asset = await queryClient.ensureQueryData(assetQueryOptions(hit.ticker));
      setCustomAssets((prev) => [asset, ...prev.filter((p) => p.ticker !== asset.ticker)]);
      setSearchQuery(hit.ticker);
    } catch {
      toast.error(t.errors.notFound);
    } finally {
      setIsFetchingCustom(false);
    }
  }

  // Simulation setup
  const parsedAmount = useMemo(() => {
    const num = parseFloat(rawAmount.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [rawAmount]);

  const displayAmount = isAmountFocused ? rawAmount : formatNumber(parsedAmount, locale, 0);

  const simulationCandidate = useMemo<ValuedWatchlistItem | null>(() => {
    if (!simulatingItem) return null;
    const existing = valuedItems.find(
      (v) => v.ticker.toUpperCase() === simulatingItem.ticker.toUpperCase(),
    );
    if (existing) return existing;

    const targetYield =
      settings?.classTargetYields?.[simulatingItem.type] ?? settings?.targetYield ?? 6;
    return buildScreenerCandidate(simulatingItem.rawAsset, targetYield);
  }, [simulatingItem, valuedItems, settings]);

  const simulationResult = useMemo(() => {
    if (!simulationCandidate) return null;
    return simulateScreenerImpact(
      simulationCandidate,
      parsedAmount,
      valuedItems,
      settings || {},
      fxRate,
    );
  }, [simulationCandidate, parsedAmount, valuedItems, settings, fxRate]);

  const reasonParams = useMemo(() => {
    if (!simulationResult) return undefined;
    const params: Record<string, string | number> = { ...(simulationResult.reasonParams || {}) };
    if (simulationResult.classType) params.className = t.types[simulationResult.classType];
    return params;
  }, [simulationResult, t]);

  const disclaimerText = resolveDisclaimerText(t, "calculation");

  const clearFilters = () => {
    setMarketFilter("ALL");
    setClassFilter("ALL");
    setMarginFilter("ALL");
    setDyFilter("ALL");
    setPvpFilter("ALL");
    setSearchQuery("");
    setSortOption("MARGIN_DESC");
  };

  if (isAppLoading || isRadarLoading) {
    return (
      <div className={cn("space-y-6", !embedded && "w-full")}>
        <Skeleton className="h-16 w-full rounded-2xl bg-muted/30" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Skeleton className="h-24 rounded-2xl bg-muted/30" />
          <Skeleton className="h-24 rounded-2xl bg-muted/30" />
          <Skeleton className="h-24 rounded-2xl bg-muted/30" />
          <Skeleton className="h-24 rounded-2xl bg-muted/30" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl bg-muted/30" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", !embedded && "w-full")}>
      {!embedded && (
        <div>
          <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t.screenerScreen?.eyebrow}
          </div>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t.screenerScreen?.title}
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            {t.screenerScreen?.subtitle}
          </p>
        </div>
      )}

      {/* Primary Discovery Bar: Global Ticker Search (B3 + US) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[11px] font-mono font-bold text-foreground border-border/80 px-2.5 py-1 uppercase"
          >
            B3 + GLOBAL
          </Badge>
          <span className="text-xs text-muted-foreground">
            {totalAnalyzed} ativos em monitoramento
          </span>
        </div>
        <div className="flex-1 max-w-md">
          <TickerSearchField
            onPick={handlePickNewTicker}
            placeholder={t.screenerScreen?.searchPlaceholder}
            hideSelectError
          />
          {isFetchingCustom && (
            <p className="mt-1 text-[11px] text-muted-foreground">{t.common.loading}</p>
          )}
        </div>
      </div>

      {/* Multi-Criteria Filters & Sorting Bar */}
      <Card className="border-border/60 bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{t.screenerScreen?.filtersTitle}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Market Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {t.screenerScreen?.marketLabel}
              </label>
              <Select
                value={marketFilter}
                onValueChange={(val: "ALL" | "BR" | "US") => {
                  setMarketFilter(val);
                  if (val === "BR" && ["STOCK_US", "REIT", "ETF"].includes(classFilter)) {
                    setClassFilter("ALL");
                  } else if (
                    val === "US" &&
                    ["STOCK_BR", "FII", "FIAGRO", "FII_INFRA"].includes(classFilter)
                  ) {
                    setClassFilter("ALL");
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder={t.screenerScreen?.marketAll} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.screenerScreen?.marketAll}</SelectItem>
                  <SelectItem value="BR">{t.screenerScreen?.marketBr}</SelectItem>
                  <SelectItem value="US">{t.screenerScreen?.marketUs}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Asset Class Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {t.screenerScreen?.classLabel}
              </label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder={t.screenerScreen?.allClasses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.screenerScreen?.allClasses}</SelectItem>
                  {marketFilter !== "US" && (
                    <>
                      <SelectItem value="STOCK_BR">{t.types?.STOCK_BR || "Ações BR"}</SelectItem>
                      <SelectItem value="FII">{t.types?.FII || "FIIs"}</SelectItem>
                      <SelectItem value="FIAGRO">{t.types?.FIAGRO || "FIAGRO"}</SelectItem>
                      <SelectItem value="FII_INFRA">{t.types?.FII_INFRA || "FII-Infra"}</SelectItem>
                    </>
                  )}
                  {marketFilter !== "BR" && (
                    <>
                      <SelectItem value="STOCK_US">{t.types?.STOCK_US || "Stocks EUA"}</SelectItem>
                      <SelectItem value="REIT">{t.types?.REIT || "REITs"}</SelectItem>
                      <SelectItem value="ETF">{t.types?.ETF || "ETFs"}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Safety Margin Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {t.screenerScreen?.marginLabel}
              </label>
              <Select value={marginFilter} onValueChange={setMarginFilter}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder={t.screenerScreen?.allMargins} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.screenerScreen?.allMargins}</SelectItem>
                  <SelectItem value="POSITIVE">{t.screenerScreen?.marginPositive}</SelectItem>
                  <SelectItem value="SAFE">{t.screenerScreen?.marginSafe}</SelectItem>
                  <SelectItem value="DEEP">{t.screenerScreen?.marginDeep}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dividend Yield Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {t.screenerScreen?.dyLabel}
              </label>
              <Select value={dyFilter} onValueChange={setDyFilter}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder={t.screenerScreen?.allDy} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.screenerScreen?.allDy}</SelectItem>
                  <SelectItem value="4">{t.screenerScreen?.dy4}</SelectItem>
                  <SelectItem value="6">{t.screenerScreen?.dy6}</SelectItem>
                  <SelectItem value="8">{t.screenerScreen?.dy8}</SelectItem>
                  <SelectItem value="10">{t.screenerScreen?.dy10}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* P/VP Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {t.screenerScreen?.pvpLabel}
              </label>
              <Select value={pvpFilter} onValueChange={setPvpFilter}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder={t.screenerScreen?.allPvp} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.screenerScreen?.allPvp}</SelectItem>
                  <SelectItem value="DISCOUNT">{t.screenerScreen?.pvpDiscount}</SelectItem>
                  <SelectItem value="FAIR">{t.screenerScreen?.pvpFair}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {t.screenerScreen?.sortLabel}
              </label>
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder={t.screenerScreen?.sortMarginDesc} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARGIN_DESC">{t.screenerScreen?.sortMarginDesc}</SelectItem>
                  <SelectItem value="DY_DESC">{t.screenerScreen?.sortDyDesc}</SelectItem>
                  <SelectItem value="PVP_ASC">{t.screenerScreen?.sortPvpAsc}</SelectItem>
                  <SelectItem value="TICKER_ASC">{t.screenerScreen?.sortTickerAsc}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.screenerScreen?.filterSearchPlaceholder}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
            {(classFilter !== "ALL" ||
              marginFilter !== "ALL" ||
              dyFilter !== "ALL" ||
              pvpFilter !== "ALL" ||
              searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {t.screenerScreen?.table?.clearFilters}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quantitative Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border/60 bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t.screenerScreen?.kpis?.totalAnalyzed}
            </span>
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-foreground">
            {totalAnalyzed}
          </div>
        </Card>

        <Card className="border-border/60 bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t.screenerScreen?.kpis?.undervaluedCount}
            </span>
            <Sparkles className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-success">
            {undervaluedCount}
          </div>
        </Card>

        <Card className="border-border/60 bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t.screenerScreen?.kpis?.avgMargin}
            </span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div
            className={cn(
              "mt-2 font-mono text-2xl font-bold tracking-tight",
              avgMargin != null && avgMargin > 0 ? "text-success" : "text-foreground",
            )}
          >
            {avgMargin != null
              ? `${avgMargin > 0 ? "+" : ""}${formatNumber(avgMargin, locale, 1)}%`
              : "—"}
          </div>
        </Card>

        <Card className="border-border/60 bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t.screenerScreen?.kpis?.avgDy}
            </span>
            <Calculator className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-primary">
            {avgDy != null ? formatPercent(avgDy, locale, 1) : "—"}
          </div>
        </Card>
      </div>

      {/* Responsive Screener Table */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className={cn(STICKY_FIRST_COLUMN_CLASS, "min-w-[180px]")}>
                  {t.screenerScreen?.table?.asset}
                </TableHead>
                <TableHead className="min-w-[100px]">{t.screenerScreen?.table?.class}</TableHead>
                <TableHead className="text-right min-w-[100px]">
                  {t.screenerScreen?.table?.currentPrice}
                </TableHead>
                <TableHead className="text-right min-w-[110px]">
                  {t.screenerScreen?.table?.ceilingPrice}
                </TableHead>
                <TableHead className="text-right min-w-[120px]">
                  {t.screenerScreen?.table?.safetyMargin}
                </TableHead>
                <TableHead className="text-right min-w-[100px]">
                  {t.screenerScreen?.table?.dy}
                </TableHead>
                <TableHead className="text-right min-w-[80px]">
                  {t.screenerScreen?.table?.pvp}
                </TableHead>
                <TableHead className="text-right min-w-[180px]">
                  {t.screenerScreen?.table?.actions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {t.screenerScreen?.table?.noResults}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {t.screenerScreen?.table?.addCustomTicker}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="mt-2 text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {t.screenerScreen?.table?.clearFilters}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedItems.map((item) => {
                  const isPositive = item.safetyMargin != null && item.safetyMargin >= 0;
                  return (
                    <TableRow
                      key={item.ticker}
                      className="border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      {/* Sticky First Column: Ticker + Market Badge + Name + Portfolio Badge */}
                      <TableCell className={STICKY_FIRST_COLUMN_CLASS}>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-foreground text-sm">
                              {displayTicker(item.ticker)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-mono font-bold text-muted-foreground border-border/80 px-1 py-0 uppercase"
                            >
                              {item.currency === "BRL" ? "B3" : "US"}
                            </Badge>
                            {item.isHeld && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold border-success/40 bg-success/10 text-success gap-1 px-1.5 py-0"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                {t.screenerScreen?.table?.inPortfolio}
                              </Badge>
                            )}
                          </div>
                          <span
                            className="text-xs text-muted-foreground truncate max-w-[180px]"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Class */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold bg-muted text-muted-foreground border-transparent uppercase tracking-wider"
                        >
                          {t.types[getDisplayAssetType(item.type) as keyof typeof t.types] ||
                            item.type}
                        </Badge>
                      </TableCell>

                      {/* Current Price */}
                      <TableCell className="text-right font-mono text-xs font-medium text-foreground">
                        {formatCurrency(item.currentPrice, item.currency, locale)}
                      </TableCell>

                      {/* Ceiling Price */}
                      <TableCell className="text-right font-mono text-xs font-medium text-success">
                        {item.ceilingPrice != null
                          ? formatCurrency(item.ceilingPrice, item.currency, locale)
                          : "—"}
                      </TableCell>

                      {/* Safety Margin */}
                      <TableCell className="text-right">
                        {item.safetyMargin != null ? (
                          <span
                            className={cn(
                              "font-mono text-xs font-bold",
                              isPositive ? "text-success" : "text-destructive",
                            )}
                          >
                            {isPositive ? "+" : ""}
                            {formatNumber(item.safetyMargin, locale, 1)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Projected DY */}
                      <TableCell className="text-right font-mono text-xs font-bold text-primary">
                        {item.dy != null ? formatPercent(item.dy, locale, 1) : "—"}
                      </TableCell>

                      {/* P/VP */}
                      <TableCell className="text-right font-mono text-xs font-medium">
                        {item.pvp != null ? (
                          <span
                            className={cn(
                              item.pvp < 1.0 ? "text-success font-semibold" : "text-foreground",
                            )}
                          >
                            {formatNumber(item.pvp, locale, 2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Actions: Raio-X & Simular */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to="/app/explore"
                            search={{ tab: "deepdive", ticker: item.ticker }}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                          >
                            {t.screenerScreen?.table?.viewDeepDive || "Raio-X ↗"}
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSimulatingItem(item)}
                            className="h-7 text-xs px-2.5"
                          >
                            <Calculator className="h-3 w-3 mr-1" />
                            {t.screenerScreen?.table?.simulateContribution || "Simular"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Regulatory calculation footnote */}
        <div className="flex items-start gap-2.5 border-t border-border/50 bg-accent/10 px-4 py-3 sm:px-5">
          <span aria-hidden="true" className="shrink-0 font-bold text-accent-text">
            ◆
          </span>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{disclaimerText}</p>
        </div>
      </div>

      {/* Contribution Simulation Dialog */}
      <Dialog
        open={!!simulatingItem}
        onOpenChange={(open) => {
          if (!open) setSimulatingItem(null);
        }}
      >
        <DialogContent className="max-w-2xl bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-semibold">
              {t.screenerScreen?.simulatorModal?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t.screenerScreen?.simulatorModal?.subtitle}
            </DialogDescription>
          </DialogHeader>

          {simulatingItem && simulationCandidate && simulationResult && (
            <div className="space-y-4 pt-2">
              {/* Asset Snapshot Card */}
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div>
                  <div className="font-mono text-xl font-bold tracking-tight text-foreground">
                    {displayTicker(simulatingItem.ticker)}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {simulatingItem.name} ·{" "}
                    {formatCurrency(simulatingItem.currentPrice, simulatingItem.currency, locale)}
                    {simulatingItem.ceilingPrice != null && (
                      <>
                        {" "}
                        · {t.screenerScreen?.table?.ceilingPrice}{" "}
                        {formatCurrency(simulatingItem.ceilingPrice, simulatingItem.currency, locale)}
                      </>
                    )}
                  </div>
                  <div className="mt-2">
                    <StatusBadge
                      variant={
                        VERDICT_VARIANT[simulationResult.verdict as keyof typeof VERDICT_VARIANT] ??
                        "default"
                      }
                    >
                      {t.auditScreen?.verdicts?.[simulationResult.verdict]}
                      {simulatingItem.safetyMargin != null && (
                        <>
                          {" "}
                          · {simulatingItem.safetyMargin > 0 ? "+" : ""}
                          {formatNumber(simulatingItem.safetyMargin, locale, 1)}%{" "}
                          {t.screenerScreen?.vsConsensus}
                        </>
                      )}
                    </StatusBadge>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 px-3.5 py-2 text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.screenerScreen?.simulatorModal?.amountLabel}
                  </div>
                  <div className="flex items-baseline justify-end gap-1 mt-0.5">
                    <span className="font-serif text-base text-muted-foreground">R$</span>
                    <input
                      value={displayAmount}
                      onFocus={() => setIsAmountFocused(true)}
                      onBlur={() => setIsAmountFocused(false)}
                      onChange={(e) => {
                        const digitsAndComma = e.target.value.replace(/[^0-9,]/g, "");
                        setRawAmount(digitsAndComma);
                      }}
                      inputMode="decimal"
                      className="w-32 border-0 bg-transparent text-right font-serif text-xl font-medium text-foreground outline-none"
                      aria-label={t.screenerScreen?.simulatorModal?.amountLabel}
                    />
                  </div>
                </div>
              </div>

              {/* Rationale Banner */}
              <div className="rounded-xl bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
                {resolveReasonText(t, simulationResult.reasonKey, reasonParams)}
              </div>

              {/* Impact Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-text">
                  {resolveReasonText(t, "screenerScreen.impactLabel", {
                    amount: formatCurrency(parsedAmount, "BRL", locale),
                  })}
                  <span className="h-px flex-1 bg-border/60" />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/40 p-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.screenerScreen?.allocLabel}
                    </div>
                    {simulationResult.hasTargets &&
                    simulationResult.allocBeforePct != null &&
                    simulationResult.allocAfterPct != null ? (
                      <>
                        <div className="flex flex-wrap items-baseline gap-1.5 font-mono text-xs">
                          <span className="text-muted-foreground">
                            {formatNumber(simulationResult.allocBeforePct, locale, 1)}%
                          </span>
                          <span className="text-accent-text">→</span>
                          <span className="text-sm font-bold text-success">
                            {formatNumber(simulationResult.allocAfterPct, locale, 1)}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 motion-reduce:transition-none"
                            style={{
                              width: `${Math.min(100, simulationResult.allocAfterPct)}%`,
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <Link
                        to="/app/goals"
                        className="text-xs font-semibold text-accent-text hover:underline"
                      >
                        {t.screenerScreen?.configureGoalsLink}
                      </Link>
                    )}
                  </div>

                  <div className="rounded-lg border border-border/40 p-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.screenerScreen?.incomeLabel}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-1.5 font-mono text-xs">
                      <span className="text-muted-foreground">
                        {formatCurrency(simulationResult.incomeBeforeMonthlyBRL, "BRL", locale)}
                      </span>
                      <span className="text-accent-text">→</span>
                      <span className="text-sm font-bold text-success">
                        {formatCurrency(simulationResult.incomeAfterMonthlyBRL, "BRL", locale)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/40 p-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.screenerScreen?.deviationLabel}
                    </div>
                    {simulationResult.hasTargets &&
                    simulationResult.deviationBeforePp != null &&
                    simulationResult.deviationAfterPp != null ? (
                      <div className="flex flex-wrap items-baseline gap-1.5 font-mono text-xs">
                        <span className="text-muted-foreground">
                          {formatNumber(simulationResult.deviationBeforePp, locale, 1)} p.p.
                        </span>
                        <span className="text-accent-text">→</span>
                        <span className="text-sm font-bold text-success">
                          {formatNumber(simulationResult.deviationAfterPp, locale, 1)} p.p.
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t.screenerScreen?.noTargetsPrompt}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dialog Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSimulatingItem(null)}
                  className="text-xs"
                >
                  {t.screenerScreen?.simulatorModal?.closeBtn}
                </Button>
                <Link
                  to="/app/explore"
                  search={{ tab: "deepdive", ticker: simulatingItem.ticker }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  onClick={() => setSimulatingItem(null)}
                >
                  {t.screenerScreen?.simulatorModal?.viewFullDeepDive} <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

