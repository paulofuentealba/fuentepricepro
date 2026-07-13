import { useCallback, useMemo, useState } from "react";
import { Bell, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Asset } from "@/lib/domain";
import { ceilingPrice, isUsAsset, netAfterTax, safetyMargin } from "@/lib/calc";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import {
  buildResultShareText,
  computeAvgDividend,
  formatResultDate,
  type Timeframe,
} from "@/lib/resultCard";
import { AddToWatchlistDialog } from "./AddToWatchlistDialog";
import { IndicatorGrid } from "./IndicatorGrid";
import { GoalPlanner } from "./GoalPlanner";
import { DividendHistoryChart } from "./result/DividendHistoryChart";
import { ResultStats } from "./result/ResultStats";
import { useSubscription } from "@/lib/subscription";
import { PaywallDialog } from "../ui/PaywallDialog";

interface Props {
  asset: Asset;
  targetYield: number;
  averagePrice?: number | null;
  hideAddToWatchlist?: boolean;
}

export function ResultCard({ asset, targetYield: initialTargetYield, averagePrice: initialAveragePrice, hideAddToWatchlist }: Props) {
  const { t, locale } = useI18n();
  const [timeframe, setTimeframe] = useState<Timeframe>(3);
  const [localTargetYield, setLocalTargetYield] = useState(initialTargetYield);
  const [localAveragePrice, setLocalAveragePrice] = useState(initialAveragePrice);
  const [localCustomTaxRate, setLocalCustomTaxRate] = useState<number | null>(null);
  const { isPro } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const { avg, availableTimeframes } = useMemo(
    () => computeAvgDividend(asset, timeframe),
    [asset, timeframe],
  );

  const ceiling = ceilingPrice(avg, localTargetYield);
  const margin = safetyMargin(ceiling, asset.currentPrice);
  const positive = margin >= 0;
  const avgYieldPct = (avg / asset.currentPrice) * 100;
  const yocPct =
    localAveragePrice && localAveragePrice > 0 ? (avg / localAveragePrice) * 100 : null;
  const isUs = isUsAsset(asset.type, asset.currency);
  const netAvg = netAfterTax(avg, asset.type, asset.currency, localCustomTaxRate ?? undefined);

  const exDateFormatted = asset.exDividendDate
    ? formatResultDate(asset.exDividendDate, locale)
    : null;

  const chartData = (asset.dividendHistory ?? []).filter((p) => p.amount > 0);
  const displayTicker = asset.ticker.replace(/\.SA$/i, "");

  const handleShare = useCallback(async () => {
    const text = buildResultShareText(displayTicker, ceiling, asset.currency, yocPct, locale);
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
  }, [asset.currency, ceiling, displayTicker, locale, t.result.shareCopied, yocPct]);

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold leading-none tracking-tight">{displayTicker}</h2>
            <Badge variant="secondary">
              <span className="mr-1">{asset.currency === "USD" ? "🇺🇸" : "🇧🇷"}</span>
              {t.types[asset.type]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{asset.name}</p>
        </div>
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
      </CardHeader>

      <CardContent className="space-y-6">
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
          ceiling={ceiling}
          targetYield={localTargetYield}
          margin={margin}
          positive={positive}
          averagePrice={localAveragePrice ?? null}
          customTaxRate={localCustomTaxRate}
          onTargetYieldChange={setLocalTargetYield}
          onAveragePriceChange={setLocalAveragePrice}
          onCustomTaxRateChange={setLocalCustomTaxRate}
          isPro={isPro}
          onShowPaywall={() => setShowPaywall(true)}
        />

        <IndicatorGrid asset={asset} />

        {chartData.length > 1 && (
          <DividendHistoryChart
            data={asset.dividendHistory}
            currency={asset.currency}
            locale={locale}
            title={t.result.dividendHistory}
          />
        )}

        <GoalPlanner
          annualDividend={avg}
          currentPrice={asset.currentPrice}
          currency={asset.currency}
        />

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
          {!hideAddToWatchlist && (
            <AddToWatchlistDialog
              asset={asset}
              targetYield={localTargetYield}
              averagePrice={localAveragePrice ?? null}
            />
          )}
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
