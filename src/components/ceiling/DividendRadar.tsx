import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n-provider";
import { getAssetValuation, getCanonicalAnnualDividend } from "@/lib/calculations";
import { classifyBr } from "@/lib/classify";
import { useSelic } from "@/lib/useSelic";
import { formatCurrency, formatPercent } from "@/lib/i18n";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AssetTicker,
  PriceTag,
  SafetyMarginBadge,
  YieldIndicator,
} from "./shared/AssetDataDisplay";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { TargetYieldSlider } from "@/components/ui/TargetYieldSlider";
import { useSettings } from "@/lib/settings";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRadarFn } from "@/lib/apiService.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetFilterSort } from "@/lib/useAssetFilterSort";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WatchlistFilterBar } from "./watchlist/WatchlistFilterBar";

export function DividendRadar() {
  const { t } = useI18n();
  const [market, setMarket] = useState<"BR" | "US">("BR");
  const { targetYield, setTargetYield } = useSettings();

  const {
    data: radarData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dividend-radar", market],
    queryFn: () => fetchRadarFn(),
    staleTime: 1000 * 60 * 15, // 15 mins
  });
  const { data: selic } = useSelic();

  const rawData = market === "BR" ? radarData?.br : radarData?.us;

  // Transform backend ApiAsset into the format needed for the table
  const data =
    rawData
      ?.map((asset: any) => {
        const canonicalDiv = getCanonicalAnnualDividend(asset, 3);
        const dy = asset.currentPrice > 0 ? (canonicalDiv / asset.currentPrice) * 100 : 0;
        const assetType = asset.type || (market === "BR" ? classifyBr(asset.ticker) : "STOCK_US");
        const currency = market === "BR" ? "BRL" : "USD";

        const valuation = getAssetValuation({
          targetYield,
          currentPrice: asset.currentPrice,
          avgDividend: canonicalDiv,
          eps: asset.metrics?.eps ?? null,
          bvps: asset.metrics?.pbRatio && asset.currentPrice > 0 ? asset.currentPrice / asset.metrics.pbRatio : null,
          dividendCagr: asset.metrics?.dividendCagr5y ?? null,
          selicPct: selic ?? 10.5,
          currency: currency,
          type: assetType,
        });

        return {
          ticker: asset.ticker,
          name: asset.name,
          currentPrice: asset.currentPrice,
          annualDividend: canonicalDiv,
          safetyMargin: valuation.margin,
          ceiling: valuation.activeCeiling,
          type:
            asset.type ||
            (market === "BR"
              ? classifyBr(asset.ticker)
              : "STOCK_US"),
          currency: market === "BR" ? "BRL" : "USD",
          dy: dy,
          sector: asset.sector || "N/A",
          exDate: asset.exDividendDate
            ? new Date(asset.exDividendDate).toISOString().split("T")[0]
            : null,
        };
      })
      .filter((asset: any) => asset.ceiling > asset.currentPrice) || [];

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
  } = useAssetFilterSort(data as any, "yield_desc");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <CurrencyToggle value={market} onChange={setMarket} />
        <TargetYieldSlider value={targetYield} onChange={setTargetYield} />
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
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

      <Card className="border border-border/50 bg-background/60 backdrop-blur-md shadow-2xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t.radar.topOpportunities}
              </CardTitle>
              <div className="text-sm text-muted-foreground bg-accent/30 px-3 py-1.5 rounded-md border border-border/40 inline-flex items-center gap-1.5">
                <Info className="h-4 w-4" />
                {t.radar.globalYieldNote?.replace("{targetYield}", targetYield.toString())}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TooltipProvider delayDuration={200}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.radar.asset}</TableHead>
                    <TableHead>{t.global.type}</TableHead>
                    <TableHead>{t.radar.sector}</TableHead>
                    <TableHead className="text-right">{t.radar.currentPrice}</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {t.radar.ceilingPrice}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px]">
                            {t.radar.globalYieldNote?.replace("{targetYield}", targetYield.toString())}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableHead>
                    <TableHead className="text-right">{t.radar.currentDy}</TableHead>
                    <TableHead className="text-right">{t.radar.exDate}</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-10 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-20 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-12 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-destructive">
                    {t.radar.error}
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t.radar.empty}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((asset: any) => {
                  const margin = asset.safetyMargin;
                  return (
                    <TableRow
                      key={asset.ticker}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <TableCell>
                        <AssetTicker ticker={asset.ticker} name={asset.name} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold bg-muted text-muted-foreground border-transparent uppercase tracking-wider"
                        >
                          {asset.type === "STOCK_BR" || asset.type === "STOCK_US"
                            ? "Ações"
                            : asset.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {asset.sector}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <PriceTag
                          value={asset.currentPrice}
                          currency={market === "BR" ? "BRL" : "USD"}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <PriceTag
                          value={asset.ceiling}
                          currency={market === "BR" ? "BRL" : "USD"}
                          className="text-success"
                        />
                        <SafetyMarginBadge margin={margin} />
                      </TableCell>
                      <TableCell className="text-right">
                        <YieldIndicator value={asset.dy} />
                      </TableCell>
                      <TableCell className="text-right">
                        {asset.exDate ? (
                          <div className="font-medium text-amber-500/90">{asset.exDate}</div>
                        ) : (
                          <div className="text-xs text-muted-foreground">-</div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
