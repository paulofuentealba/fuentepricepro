import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, Sector } from "recharts";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n-provider";
import type { WatchlistItem } from "@/lib/watchlist";
import { formatCurrency, getDisplayAssetType } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getColorForAsset } from "../shared/chartColors";
import { convertCurrency } from "@/lib/currency";
import { EXCHANGE_RATE_FALLBACK } from "@/lib/macroDefaults";

interface Props {
  items: WatchlistItem[];
  selectedType?: string | null;
  onSelectType?: (type: string | null) => void;
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export function AllocationChart({ items, selectedType, onSelectType }: Props) {
  const { t, locale } = useI18n();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const exchangeRate = fx?.USDBRL ?? EXCHANGE_RATE_FALLBACK;
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const hasUsdAssets = useMemo(
    () => items.some((it) => it.currency === "USD" && it.quantity > 0),
    [items]
  );
  const isEstimatedFx = !fx?.USDBRL && hasUsdAssets;

  const data = useMemo(() => {
    const totals = new Map<string, { name: string; value: number; type: string }>();

    for (const it of items) {
      const value = it.currentPrice * it.quantity;
      if (value <= 0) continue;

      const valueInBrl = convertCurrency(value, it.currency, "BRL", exchangeRate);
      const displayType = getDisplayAssetType(it.type);
      const typeLabel = t.types[displayType as import("@/lib/domain").AssetType] || displayType;

      if (!totals.has(typeLabel)) {
        totals.set(typeLabel, { name: typeLabel, value: 0, type: displayType });
      }
      totals.get(typeLabel)!.value += valueInBrl;
    }

    return Array.from(totals.values()).sort((a, b) => b.value - a.value);
  }, [items, exchangeRate, t.types]);

  if (data.length === 0) return null;

  return (
    <Card className="border border-border/50 bg-background h-full">
      <CardContent className="flex flex-col md:flex-row items-center p-6 gap-6">
        <div className="w-full md:w-1/2 h-[200px] shrink-0">
          <ChartContainer config={{}} className="h-full w-full">
            <PieChart>
              <Pie
                data={data || []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {(data || []).map((d, index) => {
                  const isSelected = selectedType === d.type;
                  const opacity = selectedType ? (isSelected ? 1 : 0.4) : 1;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={getColorForAsset(d.type)}
                      className="cursor-pointer transition-all duration-300"
                      onClick={() => onSelectType?.(isSelected ? null : d.type)}
                      style={{
                        opacity,
                        filter:
                          activeIndex === index || isSelected
                            ? `drop-shadow(0px 0px 6px ${getColorForAsset(d.type)})`
                            : "none",
                      }}
                    />
                  );
                })}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value: any) => formatCurrency(value, "BRL", locale)}
                    hideLabel
                  />
                }
              />
            </PieChart>
          </ChartContainer>
        </div>
        <div className="w-full md:w-1/2 flex flex-col space-y-1.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t.watchlist.allocationByType}
            </span>
            {isEstimatedFx && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    data-testid="estimated-fx-badge"
                    className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning ring-1 ring-warning/30 cursor-help"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{t.watchlist.estimatedFxBadge}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p>
                    {t.watchlist.estimatedFxTooltip.replace(
                      "{{rate}}",
                      formatCurrency(EXCHANGE_RATE_FALLBACK, "BRL", locale)
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {(data || []).map((d, i) => {
            const isSelected = selectedType === d.type;
            const opacity = selectedType ? (isSelected ? 1 : 0.4) : 1;
            return (
              <div
                key={d.name}
                className="flex items-center justify-between text-sm transition-opacity duration-200 cursor-pointer"
                style={{ opacity: activeIndex === -1 ? opacity : activeIndex === i ? 1 : 0.4 }}
                onClick={() => onSelectType?.(isSelected ? null : d.type)}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full transition-shadow duration-300"
                    style={{
                      backgroundColor: getColorForAsset(d.type),
                      boxShadow:
                        activeIndex === i || isSelected
                          ? `0 0 8px ${getColorForAsset(d.type)}`
                          : "none",
                    }}
                  />
                  <span className="text-foreground">{d.name}</span>
                </div>
                <span className="font-medium tabular-nums">
                  {formatCurrency(d.value, "BRL", locale)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
