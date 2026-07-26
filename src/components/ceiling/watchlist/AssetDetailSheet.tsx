import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AssetCard } from "@/components/shared/AssetCard";
import { ResultSkeleton } from "@/components/ceiling/ResultSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { assetQueryOptions } from "@/lib/queryOptions";
import type { WatchlistItem } from "@/lib/watchlist";
import { useI18n } from "@/lib/i18n-provider";
import { Info, Calendar } from "lucide-react";
import { useAssetCardDerived } from "./assetCard/useAssetCardDerived";
import { AssetCardFinancials } from "./assetCard/AssetCardFinancials";

import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { formatCurrency, displayTicker } from "@/lib/i18n";

import { getAssetValuation } from "@/lib/calculations";
import { useSelic } from "@/lib/useSelic";
import { ConsensusPyramid } from "./ConsensusPyramid";
import { FixedIncomePanel } from "./FixedIncomePanel";

function WowInsights({ item, asset, valuation }: { item: WatchlistItem; asset?: any; valuation: ReturnType<typeof getAssetValuation> }) {
  const { t, locale } = useI18n();

  const margin = valuation.margin;
  const marginStr = Math.abs(margin).toFixed(1);
  const isBargain = margin > 10;
  const isFair = margin >= 0 && margin <= 10;

  let insightText = "";
  let badgeColor = "";
  let iconColor = "";
  if (isBargain) {
    insightText = t.result.insights.bargain.replace("{{margin}}", marginStr);
    badgeColor = "bg-emerald-500/5 border-emerald-500/20";
    iconColor = "text-emerald-500";
  } else if (isFair) {
    insightText = t.result.insights.fair.replace("{{margin}}", marginStr);
    badgeColor = "bg-amber-500/5 border-amber-500/20";
    iconColor = "text-amber-500";
  } else {
    insightText = t.result.insights.overvalued.replace("{{margin}}", marginStr);
    badgeColor = "bg-rose-500/5 border-rose-500/20";
    iconColor = "text-rose-500";
  }

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  let nextPayment = null;
  if (item.paymentMonths && item.paymentMonths.length > 0) {
    const sorted = [...item.paymentMonths].sort((a, b) => a - b);
    nextPayment = sorted.find((m) => m >= currentMonth) || sorted[0];
  }

  let monthName = "";
  if (nextPayment) {
    const date = new Date(2024, nextPayment - 1, 1);
    monthName = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
      month: "long",
    }).format(date);
    // Capitalize first letter
    monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <div className={`flex flex-col gap-2 rounded-lg border p-4 ${badgeColor}`}>
        <div className={`flex items-center gap-2 font-semibold ${iconColor}`}>
          <Info className="h-4 w-4" />
          <span className="text-foreground">{t.result.insights.title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{insightText}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex items-center gap-2 font-semibold text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{t.result.insights.nextPayment}</span>
        </div>
        <p className="text-sm font-medium">
          {nextPayment
            ? t.result.insights.predictedMonth.replace("{{month}}", monthName)
            : t.result.insights.noPaymentData}
        </p>
      </div>
    </div>
  );
}

function AssetHoldings({ item, activeMargin }: { item: WatchlistItem; activeMargin: number }) {
  const { t } = useI18n();
  const derived = useAssetCardDerived(item);
  return (
    <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-4">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t.tabs.portfolio}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <AssetCardFinancials item={item} derived={derived} activeMargin={activeMargin} />
      </div>
    </div>
  );
}

interface AssetDetailSheetProps {
  item: WatchlistItem | null;
  onClose: () => void;
  hidePlayground?: boolean;
  hideGoalPlanner?: boolean;
}

export function AssetDetailSheet({ item, onClose, hidePlayground, hideGoalPlanner }: AssetDetailSheetProps) {
  const { t, locale } = useI18n();
  const { data: selic } = useSelic();
  const { data: fx } = useQuery(exchangeRateQueryOptions());

  const query = useQuery({
    ...assetQueryOptions(item?.ticker ?? ""),
    enabled: !!item,
  });

  const asset = useMemo(() => {
    if (!query.data || !item) return null;
    return { ...query.data, type: item.type };
  }, [query.data, item]);

  const loading = !!item && query.isPending;
  const error = query.isError ? t.errors.notFound : null;

  const valuation = useMemo(() => {
    if (!asset || !item) return null;
    const livePrice = asset.currentPrice ?? item.currentPrice;
    return getAssetValuation({
      targetYield: item.targetYield,
      currentPrice: livePrice,
      avgDividend: item.annualDividend ?? 0,
      eps: asset.epsCurrent ?? asset.metrics?.eps ?? null,
      bvps: asset.metrics?.pbRatio ? livePrice / asset.metrics.pbRatio : null,
      dividendCagr: asset.metrics?.dividendCagr5y ?? null,
      selicPct: selic ?? 10.5,
      currency: asset.currency,
      type: asset.type,
    });
  }, [asset, item, selic]);

  const displayTickerStr = displayTicker(item?.ticker ?? "");

  return (
    <Sheet open={item != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-border/50 bg-slate-950/70 backdrop-blur-xl p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-4">
          <SheetTitle className="text-base font-semibold">{displayTickerStr}</SheetTitle>
          {item?.currency === "USD" && fx?.USDBRL && (
            <p className="text-sm text-muted-foreground mt-1">
              ~ {formatCurrency((asset?.currentPrice ?? item.currentPrice) * fx.USDBRL, "BRL", locale)} (converted)
            </p>
          )}
        </SheetHeader>
        <div className="p-4 sm:p-6">
          {loading && <ResultSkeleton />}
          {!loading && error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
          )}
          {!loading && asset && item && valuation && (
            <ErrorBoundary label="asset_detail_sheet">
              {item.type !== "FIXED_INCOME" && (
                <WowInsights item={item} asset={asset} valuation={valuation} />
              )}
              <AssetHoldings 
                item={item} 
                activeMargin={valuation.margin} 
              />
              {item.type === "FIXED_INCOME" ? (
                <FixedIncomePanel item={item} />
              ) : (
                <ConsensusPyramid valuation={valuation} currency={asset.currency} />
              )}
              <AssetCard
                variant="search"
                asset={asset}
                targetYield={item.targetYield || 6}
                averagePrice={item.averagePrice}
                hideAddToWatchlist
                hidePlayground={hidePlayground}
                hideGoalPlanner={hideGoalPlanner}
              />
            </ErrorBoundary>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
