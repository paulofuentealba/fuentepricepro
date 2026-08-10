import { useState, useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isBrTicker } from "@/lib/classify";
import type { Asset } from "@/lib/domain";
import type { BenchmarkPoint } from "@/lib/benchmark";
import { assetPriceHistoryQueryOptions, benchmarkHistoryQueryOptions } from "@/lib/queryOptions";
import { displayTicker, toIntlLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ASSET_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
const BENCHMARK_IBOV_COLOR = "var(--warning)";
const BENCHMARK_SPX_COLOR = "var(--muted-foreground)";
const COLOR_GRID = "color-mix(in oklab, var(--border) 40%, transparent)";
const COLOR_MUTED_FG = "var(--muted-foreground)";
const COLOR_CURSOR = "color-mix(in oklab, var(--primary) 12%, transparent)";

export type TimeRange = "6M" | "1A" | "5A";

function getDatesForRange(range: TimeRange): { fromDate: string; toDate: string } {
  const now = new Date();
  const toDate = now.toISOString().slice(0, 10);

  const past = new Date(now);
  if (range === "6M") {
    past.setMonth(past.getMonth() - 6);
  } else if (range === "1A") {
    past.setFullYear(past.getFullYear() - 1);
  } else if (range === "5A") {
    past.setFullYear(past.getFullYear() - 5);
  }
  const fromDate = past.toISOString().slice(0, 10);
  return { fromDate, toDate };
}

function formatDateLabel(dateStr: string, locale: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00Z");
    const m = d.toLocaleString(toIntlLocale(locale as any), {
      month: "short",
      timeZone: "UTC",
    });
    const y = d.getUTCFullYear().toString().slice(-2);
    return `${m}/${y}`;
  } catch {
    return dateStr;
  }
}

interface Props {
  assets: Asset[];
}

export function ComparatorPerformanceChart({ assets }: Props) {
  const { t, locale } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>("1A");

  const { fromDate, toDate } = useMemo(() => getDatesForRange(timeRange), [timeRange]);

  const hasBrlAsset = useMemo(
    () => assets.some((a) => a.currency === "BRL" || a.ticker.endsWith(".SA") || isBrTicker(a.ticker)),
    [assets],
  );

  const hasUsdAsset = useMemo(
    () => assets.some((a) => a.currency === "USD" || !(a.ticker.endsWith(".SA") || isBrTicker(a.ticker))),
    [assets],
  );

  // Queries for individual assets
  const assetQueries = useQueries({
    queries: assets.map((a) => assetPriceHistoryQueryOptions(a.ticker, fromDate, toDate)),
  });

  // Queries for benchmarks
  const ibovQuery = useQuery({
    ...benchmarkHistoryQueryOptions("IBOV", fromDate, toDate),
    enabled: hasBrlAsset && Boolean(fromDate && toDate),
  });

  const spxQuery = useQuery({
    ...benchmarkHistoryQueryOptions("SPX", fromDate, toDate),
    enabled: hasUsdAsset && Boolean(fromDate && toDate),
  });

  const isLoading =
    assetQueries.some((q) => q.isFetching) ||
    (hasBrlAsset && ibovQuery.isFetching) ||
    (hasUsdAsset && spxQuery.isFetching);

  // Process and merge series data into unified timeline
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();

    const addSeries = (seriesKey: string, points?: BenchmarkPoint[]) => {
      if (!points || points.length === 0) return;
      for (const p of points) {
        if (!dateMap.has(p.date)) {
          dateMap.set(p.date, {});
        }
        dateMap.get(p.date)![seriesKey] = p.cumulativeReturnPct;
      }
    };

    assets.forEach((a, idx) => {
      const q = assetQueries[idx];
      addSeries(a.ticker, q?.data);
    });

    if (hasBrlAsset && ibovQuery.data) {
      addSeries("IBOV", ibovQuery.data);
    }
    if (hasUsdAsset && spxQuery.data) {
      addSeries("SPX", spxQuery.data);
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    return sortedDates.map((date) => {
      const formattedDate = formatDateLabel(date, locale);
      return {
        date,
        formattedDate,
        ...dateMap.get(date),
      };
    });
  }, [assets, assetQueries, hasBrlAsset, ibovQuery.data, hasUsdAsset, spxQuery.data, locale]);

  if (assets.length === 0) return null;

  return (
    <Card className="border border-border/50 bg-background/40 backdrop-blur-md p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {t.comparator.chartTitle}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t.comparator.chartSubtitle}
            </p>
          </div>
        </div>

        {/* Time range selector buttons */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/40">
          {(["6M", "1A", "5A"] as TimeRange[]).map((r) => (
            <Button
              key={r}
              type="button"
              variant={timeRange === r ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs font-medium rounded-md transition-all",
                timeRange === r
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setTimeRange(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[300px] w-full rounded-xl bg-muted/40" />
      ) : chartData.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-xl">
          {t.comparator.noHistoryData}
        </div>
      ) : (
        <div className="h-[320px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} vertical={false} />
              <XAxis
                dataKey="formattedDate"
                stroke={COLOR_MUTED_FG}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke={COLOR_MUTED_FG}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: COLOR_CURSOR, strokeWidth: 2 }} />

              {/* Asset Lines */}
              {assets.map((a, idx) => (
                <Line
                  key={a.ticker}
                  type="monotone"
                  dataKey={a.ticker}
                  name={displayTicker(a.ticker)}
                  stroke={ASSET_COLORS[idx % ASSET_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}

              {/* Benchmark Lines */}
              {hasBrlAsset && (
                <Line
                  key="IBOV"
                  type="monotone"
                  dataKey="IBOV"
                  name="IBOV"
                  stroke={BENCHMARK_IBOV_COLOR}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />
              )}
              {hasUsdAsset && (
                <Line
                  key="SPX"
                  type="monotone"
                  dataKey="SPX"
                  name="S&P 500"
                  stroke={BENCHMARK_SPX_COLOR}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/80 bg-background/95 p-3 shadow-xl backdrop-blur text-xs space-y-1.5 min-w-[160px]">
      <div className="font-semibold text-foreground border-b border-border/40 pb-1">
        {payload[0]?.payload?.date || label}
      </div>
      <div className="space-y-1">
        {payload.map((entry: any) => {
          const val = entry.value;
          if (val === undefined || val === null) return null;
          return (
            <div key={entry.name} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.stroke || entry.color }}
                />
                <span className="text-muted-foreground font-medium">{entry.name}</span>
              </div>
              <span
                className={cn(
                  "font-semibold font-mono",
                  val > 0 ? "text-success" : val < 0 ? "text-danger" : "text-foreground",
                )}
              >
                {val > 0 ? "+" : ""}
                {val.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
