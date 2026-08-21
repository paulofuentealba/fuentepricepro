import { Bell, Share2 } from "lucide-react";
import type { Asset } from "@/lib/domain";
import { ceilingPrice, isUsAsset, netAfterTax, safetyMargin, yieldOnCost } from "@/lib/calculations";
import {
  buildResultShareText,
  computeAvgDividend,
  formatResultDate,
  type Timeframe,
} from "@/lib/resultCard";
import { AddToWatchlistDialog } from "../ceiling/AddToWatchlistDialog";
import { IndicatorGrid } from "../ceiling/IndicatorGrid";
import { GoalPlanner } from "../ceiling/GoalPlanner";
import { DividendHistoryChart } from "../ceiling/result/DividendHistoryChart";
import { ResultStats } from "../ceiling/result/ResultStats";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { PaywallDialog } from "../ui/PaywallDialog";
import { useState, useMemo } from "react";

import { memo, useCallback, type KeyboardEvent, useRef } from "react";
import { ValuationRadar } from "@/components/ui/ValuationRadar";
import { useSelic } from "@/lib/useSelic";
import { SELIC_FALLBACK } from "@/lib/macroDefaults";
import {
  getAssetValuation,
  calculateBvps,
  calculateHistoricalYieldAverage,
  GORDON_TERMINAL_GROWTH_RATE,
} from "@/lib/calculations";
import { useQuery } from "@tanstack/react-query";
import { ipcaFiveYearAverageQueryOptions, assetPriceHistoryQueryOptions } from "@/lib/queryOptions";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-provider";
import type { LiveQuote } from "@/lib/apiService.functions";
import type { WatchlistItem } from "@/lib/watchlist";
import { AssetCardHeader } from "../ceiling/watchlist/assetCard/AssetCardHeader";
import { AssetCardTags } from "../ceiling/watchlist/assetCard/AssetCardTags";
import {
  buildAssetShareText,
  useAssetCardDerived,
} from "../ceiling/watchlist/assetCard/useAssetCardDerived";
import { usePendingEvents } from "@/lib/corporateEvents";
import { cn } from "@/lib/utils";
import { X, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";

import { type AssetMeta } from "../ceiling/watchlist/utils";

export interface AssetCardProps {
  asset?: Asset;
  targetYield?: number;
  averagePrice?: number | null;
  hideAddToWatchlist?: boolean;
  variant?: "watchlist" | "search" | "allocation";
  item?: WatchlistItem | import("@/lib/useValuedPortfolio").ValuedWatchlistItem;
  quote?: LiveQuote;
  meta?: AssetMeta;
  onRemove?: (id: string) => void;
  onOpenDetail?: (item: any, initialTab?: "myPosition") => void;
  onClose?: (ticker: string) => void;
  hidePlayground?: boolean;
  hideGoalPlanner?: boolean;
  isSimulation?: boolean;
  isConcentrationViolated?: boolean;

  // Specific to Allocation variant
  shares?: number;
  cost?: number;
  addedIncome?: number;
  currentIncome?: number;
  onExclude?: (ticker: string) => void;
}

function flagFor(currency: string): string {
  return currency === "USD" ? "🇺🇸" : "🇧🇷";
}

/** Discreet badge shown next to the yield when `getAssetValuation` flags
 * `yieldTrapWarning === true` (current yield > 2x the asset's own 5y
 * historical average). Never rendered for `false`/`null` (indeterminate). */
function YieldTrapBadge() {
  const { t } = useI18n();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 p-1 text-warning">
            <AlertTriangle className="h-3 w-3" aria-label={t.result.yieldTrapWarning} />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-xs">
          {t.result.yieldTrapWarningTip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function AllocationVariant({
  item,
  shares = 0,
  cost = 0,
  addedIncome = 0,
  currentIncome = 0,
  onExclude,
}: AssetCardProps) {
  const { t, locale } = useI18n();

  if (!item) return null;

  return (
    <div className="relative rounded-md border border-border/60 bg-background/40 p-3 flex flex-col h-full">
      {onExclude && (
        <button
          type="button"
          onClick={() => onExclude(item.ticker)}
          aria-label={t.smartAllocation.exclude}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground z-10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="flex items-center gap-2 pr-6">
        <span className="text-sm font-semibold text-foreground">{item.ticker}</span>
        <Badge variant="secondary" className="text-[10px]">
          <span className="mr-1">{flagFor(item.currency)}</span>
          {t.types[item.type]}
        </Badge>
      </div>

      <div className="mt-2 text-sm font-semibold text-foreground">
        {t.smartAllocation.buyShares
          .replace("{{qty}}", String(shares))
          .replace("{{price}}", formatCurrency(item.currentPrice, item.currency, locale as import("@/lib/i18n").Locale))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="uppercase tracking-wide text-muted-foreground">
            {t.smartAllocation.totalCost}
          </div>
          <div className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
            {formatCurrency(cost, item.currency, locale as import("@/lib/i18n").Locale)}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-wide text-muted-foreground">
            {t.smartAllocation.addedIncome}
          </div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-success">
            +{formatCurrency(addedIncome, item.currency, locale as import("@/lib/i18n").Locale)}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3">
        <div className="rounded border border-border/40 bg-background/30 p-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-success" />
            {t.smartAllocation.incomeImpact}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs tabular-nums">
            <div>
              <div className="text-[10px] text-muted-foreground">
                {t.smartAllocation.currentAssetIncome}
              </div>
              <div className="text-foreground">
                {formatCurrency(currentIncome, item.currency, locale)}
              </div>
            </div>
            <span aria-hidden className="text-success">
              ➔
            </span>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">
                {t.smartAllocation.newAssetIncome}
              </div>
              <div className="font-semibold text-success">
                {formatCurrency(currentIncome + addedIncome, item.currency, locale)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchlistVariant(props: AssetCardProps) {
  const { item, quote, meta, onRemove, onOpenDetail, onClose, isConcentrationViolated } = props;
  const { t, locale } = useI18n();
  const derived = useAssetCardDerived(item as WatchlistItem);
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: selic } = useSelic();
  const { pendingEvent } = usePendingEvents(item as WatchlistItem);

  const handleCorpEvent = useCallback(
    () => item && onOpenDetail?.(item, "myPosition"),
    [item, onOpenDetail],
  );
  const handleRemove = useCallback(() => {
    if (item) {
      onRemove?.(item.id);
      toast.success(t.watchlist.removed);
    }
  }, [item, onRemove, t.watchlist.removed]);
  const handleOpenDetail = useCallback(() => item && onOpenDetail?.(item), [item, onOpenDetail]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && item) {
        e.preventDefault();
        onOpenDetail?.(item);
      }
    },
    [item, onOpenDetail],
  );

  const handleShare = useCallback(async () => {
    if (!item) return;
    const text = buildAssetShareText(item, derived.yoc, locale);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t.watchlist.shareCopied);
    } catch {
      toast.error(t.errors.copyFailed);
    }
  }, [item, locale, t.watchlist.shareCopied, t.errors.copyFailed, derived.yoc]);

  const handleShareInsta = useCallback(async () => {
    if (!cardRef.current || !item) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        filter: (node) => {
          if (node.hasAttribute && node.hasAttribute("data-html2canvas-ignore")) return false;
          return true;
        },
        backgroundColor: "#09090b",
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${item.ticker}.png`, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: item.ticker,
        });
      } else {
        const link = document.createElement("a");
        link.download = `${item.ticker}-share.png`;
        link.href = dataUrl;
        link.click();
      }
      toast.success(t.toasts.imageGenerated);
    } catch (err) {
      console.error(err);
      toast.error(t.errors.imageGenerationFailed);
    }
  }, [item, t]);

  if (!item) return null;

  const valuation = (item as import("@/lib/useValuedPortfolio").ValuedWatchlistItem).valuation;
  if (!valuation) return null;

  const hasConsensus = valuation.consensus && valuation.consensus > 0;

  return (
    <Card
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={handleOpenDetail}
      onKeyDown={handleKey}
      aria-label={`Open details for ${item.ticker}`}
      className={cn(
        "cursor-pointer overflow-hidden border border-border/50 transition-all focus-visible:outline-none focus-visible:ring-1",
        "bg-background/60 backdrop-blur-md hover:bg-background/80 hover:shadow-2xl hover:border-white/10 group flex flex-col h-full relative",
        !hasConsensus
          ? "focus-visible:border-border/60 focus-visible:ring-border/40"
          : derived.positive
            ? "focus-visible:border-success/60 focus-visible:ring-success/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            : "focus-visible:border-danger/60 focus-visible:ring-danger/40 shadow-[0_0_15px_rgba(244,63,94,0.1)]",
        isConcentrationViolated && "border-warning/60 ring-1 ring-warning/30",
      )}
    >
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose(item!.ticker);
          }}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="p-4 flex-1 space-y-3">
        <AssetCardHeader
          item={item}
          quote={quote}
          pendingEvent={pendingEvent}
          onShare={handleShare}
          onShareInsta={handleShareInsta}
          onCorporateEvent={handleCorpEvent}
          onRemove={handleRemove}
          isSimulation={props.isSimulation}
        />
        <AssetCardTags meta={meta} isConcentrationViolated={isConcentrationViolated} />
        {valuation.yieldTrapWarning === true && (
          <div onClick={(e) => e.stopPropagation()} className="flex">
            <YieldTrapBadge />
          </div>
        )}
      </div>

      <div
        className={cn(
          "p-5 border-t border-white/5 bg-gradient-to-b relative overflow-hidden shrink-0 mt-auto",
          derived.positive ? "from-success/10 to-background/40" : "from-danger/10 to-background/40",
        )}
      >
        <div
          className={cn(
            "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40",
            derived.positive ? "bg-success" : "bg-danger",
          )}
        />
        <ValuationRadar
          currentPrice={item.currentPrice}
          currency={item.currency}
          bazin={valuation.bazin}
          graham={valuation.graham}
          gordon={valuation.gordon}
          consensus={valuation.consensus}
          className="w-full relative z-10"
        />
      </div>
    </Card>
  );
}

function AssetCardImpl(props: AssetCardProps) {
  if (props.variant === "search" && props.asset && props.targetYield !== undefined) {
    return (
      <SearchVariant
        asset={props.asset}
        targetYield={props.targetYield}
        averagePrice={props.averagePrice}
        hideAddToWatchlist={props.hideAddToWatchlist}
        hidePlayground={props.hidePlayground}
        hideGoalPlanner={props.hideGoalPlanner}
      />
    );
  }

  if (props.variant === "allocation") {
    return <AllocationVariant {...props} />;
  }

  // By default (or variant === "watchlist" / "search"), we render the Watchlist variant
  // ResultCard can be merged in similarly by adapting the WatchlistVariant
  // or creating a distinct SearchVariant if props differ significantly.
  return <WatchlistVariant {...props} />;
}

export const AssetCard = memo(AssetCardImpl);

interface Props {
  asset: Asset;
  targetYield: number;
  averagePrice?: number | null;
  hideAddToWatchlist?: boolean;
  hidePlayground?: boolean;
  hideGoalPlanner?: boolean;
}

function SearchVariant({
  asset,
  targetYield: initialTargetYield,
  averagePrice: initialAveragePrice,
  hideAddToWatchlist,
  hidePlayground,
  hideGoalPlanner,
}: Props) {
  const { t, locale } = useI18n();
  const [timeframe, setTimeframe] = useState<Timeframe>(3);
  const [localTargetYield, setLocalTargetYield] = useState(initialTargetYield);
  const [localAveragePrice, setLocalAveragePrice] = useState(initialAveragePrice);
  const [localCustomTaxRate, setLocalCustomTaxRate] = useState<number | null>(null);
  const customTaxUnlocked = useFeatureGate("customTaxUnlocked") as boolean;
  const [showPaywall, setShowPaywall] = useState(false);

  const { avg, availableTimeframes } = useMemo(
    () => computeAvgDividend(asset, timeframe),
    [asset, timeframe],
  );

  const { data: selic } = useSelic();
  const { data: ipcaAvg } = useQuery(ipcaFiveYearAverageQueryOptions());

  // Reuses fetchAssetPriceHistoryFn/assetPriceHistoryQueryOptions (already
  // built for the Comparador chart) — 5y window, single asset, so this is a
  // single extra request scoped to whichever ticker the user is inspecting,
  // not an N-ticker fan-out across the whole portfolio.
  const priceHistoryFromDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    return d.toISOString().slice(0, 10);
  }, []);
  const priceHistoryToDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { data: priceHistory } = useQuery(
    assetPriceHistoryQueryOptions(asset.ticker, priceHistoryFromDate, priceHistoryToDate),
  );

  const historicalYieldAverage = useMemo(
    () =>
      calculateHistoricalYieldAverage(asset.dividendHistory, priceHistory, asset.currentPrice),
    [asset.dividendHistory, priceHistory, asset.currentPrice],
  );

  const valuation = getAssetValuation({
    targetYield: localTargetYield,
    currentPrice: asset.currentPrice,
    avgDividend: avg,
    eps: asset.epsCurrent ?? asset.metrics?.eps ?? null,
    bvps: calculateBvps(asset.metrics?.bvps, asset.metrics?.pbRatio, asset.currentPrice),
    dividendCagr: asset.metrics?.dividendCagr5y ?? null,
    selicPct: selic ?? SELIC_FALLBACK,
    terminalGrowthRate: ipcaAvg ?? GORDON_TERMINAL_GROWTH_RATE,
    currency: asset.currency,
    type: asset.type,
    historicalYieldAverage,
  });

  const activeCeiling = valuation.activeCeiling;
  const margin = valuation.margin;
  const positive = margin >= 0;
  const avgYieldPct = valuation.dividendYield;
  const yocPct = yieldOnCost(avg, localAveragePrice);
  const isUs = isUsAsset(asset.type, asset.currency);
  const netAvg = netAfterTax(avg, asset.type, asset.currency, localCustomTaxRate ?? undefined);

  const exDateFormatted = asset.exDividendDate
    ? formatResultDate(asset.exDividendDate, locale)
    : null;

  const chartData = (asset.dividendHistory ?? []).filter((p) => p.amount > 0);
  const displayTicker = asset.ticker;

  const handleShare = useCallback(async () => {
    const text = buildResultShareText(displayTicker, activeCeiling, asset.currency, yocPct, locale);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `${displayTicker} — Fuente Price Pro`, text });
      } else if (navigator?.clipboard) {
        await navigator.clipboard.writeText(text);
        toast.success(t.result.shareCopied);
      }
    } catch {
      /* user cancelled */
    }
  }, [asset.currency, activeCeiling, displayTicker, locale, t.result.shareCopied, yocPct]);

  return (
    <Card
      className={cn(
        "border border-border/50 bg-background/60 backdrop-blur-md",
        positive
          ? "shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          : "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold leading-none tracking-tight">{displayTicker}</h2>
            <Badge variant="secondary">
              <span className="mr-1">{asset.currency === "USD" ? "🇺🇸" : "🇧🇷"}</span>
              {t.types[asset.type]}
            </Badge>
            {(timeframe !== 3 ||
              localTargetYield !== initialTargetYield ||
              localAveragePrice !== initialAveragePrice ||
              localCustomTaxRate != null) && (
              <Badge
                variant="outline"
                className="text-[10px] text-warning/90 border-warning/30 bg-warning/10"
              >
                {t.watchlist.simulationBadge}
              </Badge>
            )}
            {valuation.yieldTrapWarning === true && <YieldTrapBadge />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{asset.name}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-start gap-2">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t.result.currentPrice}
              </div>
              <div className="text-xl font-semibold text-foreground">
                {formatCurrency(asset.currentPrice, asset.currency, locale)}
              </div>
            </div>
            <button
              type="button"
              onClick={handleShare}
              aria-label={t.result.share}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
          {!hideAddToWatchlist && (
            <AddToWatchlistDialog
              asset={asset}
              targetYield={localTargetYield}
              averagePrice={localAveragePrice ?? null}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!hidePlayground && (
          <ResultStats
            asset={asset}
            timeframe={timeframe}
            availableTimeframes={availableTimeframes}
            onTimeframeChange={setTimeframe}
            avg={avg}
            netAvg={netAvg}
            isUs={isUs}
            avgYieldPct={avgYieldPct}
            yocPct={yocPct}
            exDateFormatted={exDateFormatted}
            ceiling={activeCeiling}
            isUnavailable={valuation.isUnavailable}
            targetYield={localTargetYield}
            margin={margin}
            positive={positive}
            averagePrice={localAveragePrice ?? null}
            customTaxRate={localCustomTaxRate}
            onTargetYieldChange={setLocalTargetYield}
            onAveragePriceChange={setLocalAveragePrice}
            onCustomTaxRateChange={setLocalCustomTaxRate}
            isPro={customTaxUnlocked}
            onShowPaywall={() => setShowPaywall(true)}
          />
        )}

        <IndicatorGrid asset={asset} />

        {chartData.length > 1 && (
          <DividendHistoryChart
            data={asset.dividendHistory}
            currency={asset.currency}
            locale={locale}
            title={t.result.dividendHistory}
          />
        )}

        <ValuationRadar
          currentPrice={asset.currentPrice}
          currency={asset.currency}
          bazin={valuation.bazin}
          graham={valuation.graham}
          gordon={valuation.gordon}
          consensus={valuation.consensus}
        />

        {!hideGoalPlanner && (
          <GoalPlanner
            annualDividend={avg}
            currentPrice={asset.currentPrice}
            currency={asset.currency}
          />
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {!positive && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => toast(t.result.priceAlertToast)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Bell className="mr-2 h-4 w-4" />
              {t.result.setPriceAlert}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            {positive ? t.result.shareOpportunity : t.result.shareAnalysis}
          </Button>
        </div>
      </CardContent>

      <PaywallDialog
        open={showPaywall}
        onOpenChange={setShowPaywall}
        title={t.form.advancedSettingsLocked}
        description={t.form.advancedSettingsLockedDesc}
      />
    </Card>
  );
}
