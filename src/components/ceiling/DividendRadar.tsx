import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AssetTicker, PriceTag, SafetyMarginBadge, YieldIndicator } from "./shared/AssetDataDisplay";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { TargetYieldSlider } from "@/components/ui/TargetYieldSlider";
import { useSettings } from "@/lib/settings";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRadarFn } from "@/lib/apiService.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetFilterSort } from "@/lib/useAssetFilterSort";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DividendRadar() {
  const { t } = useI18n();
  const [market, setMarket] = useState<"BR" | "US">("BR");
  const { targetYield, setTargetYield } = useSettings();

  const { data: radarData, isLoading, isError } = useQuery({
    queryKey: ["dividend-radar", market],
    queryFn: () => fetchRadarFn(),
    staleTime: 1000 * 60 * 15, // 15 mins
  });

  const rawData = market === "BR" ? radarData?.br : radarData?.us;
  
  // Transform backend ApiAsset into the format needed for the table
  const data = rawData?.map((asset: any) => {
    // Basic Bazin calculation: Dividend per share / (targetYield / 100)
    const lastDiv = asset.dividendHistory?.[asset.dividendHistory.length - 1]?.amount || 0;
    const ceiling = lastDiv / (targetYield / 100);
    const dy = asset.currentPrice > 0 ? (lastDiv / asset.currentPrice) * 100 : 0;
    
    return {
      ticker: asset.ticker,
      name: asset.name,
      currentPrice: asset.currentPrice,
      annualDividend: lastDiv,
      safetyMargin: ceiling > 0 && asset.currentPrice > 0 ? ((ceiling - asset.currentPrice) / asset.currentPrice) * 100 : 0,
      type: asset.type || (market === "BR" ? "STOCK_BR" : "STOCK_US"),
      currency: market === "BR" ? "BRL" : "USD",
      ceiling: ceiling > 0 ? ceiling : asset.currentPrice,
      dy: dy,
      sector: asset.sector || "N/A",
      exDate: asset.exDividendDate ? new Date(asset.exDividendDate).toISOString().split('T')[0] : null
    };
  }).filter((asset: any) => asset.ceiling > asset.currentPrice) || [];
  
  const {
    typeFilter, setTypeFilter,
    oppFilter, setOppFilter,
    sortOption, setSortOption,
    typeFilters,
    counts,
    filteredAndSorted
  } = useAssetFilterSort(data as any, "yield_desc");

  return (
    <div className="space-y-6">


      <div className="flex items-center justify-between gap-4 flex-wrap">
        <CurrencyToggle value={market} onChange={setMarket} />
        <TargetYieldSlider value={targetYield} onChange={setTargetYield} />
      </div>

      <div className="flex justify-end mb-4">
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as any)}>
          <SelectTrigger className="h-9 w-[200px] bg-background/40">
            <SelectValue placeholder={t.watchlist.sort.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ticker_asc">{t.watchlist.sort.ticker_asc}</SelectItem>
            <SelectItem value="yield_desc">{t.watchlist.sort.yield_desc}</SelectItem>
            <SelectItem value="margin_desc">{t.watchlist.sort.margin_desc}</SelectItem>
            <SelectItem value="income_desc">{t.watchlist.sort.income_desc}</SelectItem>
            <SelectItem value="yoc_desc">{t.watchlist.sort.yoc_desc}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/60 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t.radar.topOpportunities}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.radar.asset}</TableHead>
                <TableHead>{t.radar.sector}</TableHead>
                <TableHead className="text-right">{t.radar.currentPrice}</TableHead>
                <TableHead className="text-right">{t.radar.ceilingPrice}</TableHead>
                <TableHead className="text-right">{t.radar.currentDy}</TableHead>
                <TableHead className="text-right">{t.radar.exDate}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-destructive">
                    {t.radar.error}
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t.radar.empty}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((asset: any) => {
                  const margin = asset.safetyMargin;
                return (
                  <TableRow key={asset.ticker} className="hover:bg-muted/50 cursor-pointer transition-colors">
                    <TableCell>
                      <AssetTicker ticker={asset.ticker} name={asset.name} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {asset.sector}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <PriceTag value={asset.currentPrice} currency={market === "BR" ? "BRL" : "USD"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PriceTag value={asset.ceiling} currency={market === "BR" ? "BRL" : "USD"} className="text-success" />
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
        </CardContent>
      </Card>
    </div>
  );
}
