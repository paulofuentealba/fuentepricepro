import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { AssetType } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";
import {
  computeCanonicalClassAllocations,
  type CanonicalClassAllocationItem,
} from "@/lib/selectors/eightClassAllocation";
import { useMarketScope } from "@/lib/useMarketScope";

interface AllocationOverviewCardProps {
  valuedItems?: ValuedWatchlistItem[];
  smartAllocationTargets?: Partial<Record<AssetType, number>>;
  usdRate?: number;
  isLoading: boolean;
}

export function AllocationOverviewCard({
  valuedItems = [],
  smartAllocationTargets,
  usdRate,
  isLoading,
}: AllocationOverviewCardProps) {
  const { t } = useI18n();
  const { isUSNative, taxJurisdiction } = useMarketScope();

  const entries = useMemo(
    () =>
      computeCanonicalClassAllocations(
        valuedItems,
        smartAllocationTargets,
        usdRate,
        taxJurisdiction,
      ),
    [valuedItems, smartAllocationTargets, usdRate, taxJurisdiction],
  );

  const cardTitle = isUSNative
    ? t.dashboard.allocation.titleUs || "US Asset Allocation"
    : t.dashboard.allocation.title;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 flex flex-col justify-between shadow-sm dark:border-[#234839] dark:bg-[radial-gradient(circle_at_top_right,#132C22,#0D1A15_70%)]">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-accent-emerald-light dark:text-[#34D399]">
              {t.dashboard.allocation.eyebrow}
            </div>
            <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground dark:text-white">
              {cardTitle}
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{t.dashboard.allocation.subtitle}</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: isUSNative ? 4 : 6 }).map((_, n) => (
              <Skeleton key={n} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {entries.map((entry) => {
              const classLabel = t.types[entry.type] ?? entry.type;

              let statusLabel = t.dashboard.allocation.statusBalanced;
              let statusColor = "text-accent-gold dark:text-[#DFC38A]";
              let barColor = "bg-accent-gold dark:bg-[#DFC38A]";

              if (entry.status === "invest") {
                statusLabel = t.dashboard.allocation.statusInvest;
                statusColor = "text-success dark:text-[#34D399]";
                barColor = "bg-success dark:bg-[#34D399]";
              } else if (entry.status === "above") {
                statusLabel = t.dashboard.allocation.statusAbove;
                statusColor = "text-danger dark:text-[#F87171]";
                barColor = "bg-danger dark:bg-[#F87171]";
              }

              const fillPct =
                entry.targetPct > 0
                  ? Math.min(
                      100,
                      Math.max(entry.currentPct > 0 ? 4 : 0, (entry.currentPct / entry.targetPct) * 100),
                    )
                  : entry.currentPct > 0
                  ? 100
                  : 0;

              const activeSubAllocations =
                entry.subAllocations?.filter((s) => s.currentPct > 0) ?? [];
              const showSubComposition = activeSubAllocations.length > 1;

              return (
                <div
                  key={entry.type}
                  className="rounded-xl border border-border/60 bg-muted/40 p-3.5 transition-colors hover:border-border dark:border-[#182C25] dark:bg-[#0D1714]"
                >
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-sm text-foreground truncate pr-2">
                      {classLabel}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono shrink-0">
                      {entry.currentPct.toFixed(1)}% / {entry.targetPct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted dark:bg-[#182C25] my-2">
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", barColor)}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={cn("font-semibold", statusColor)}>{statusLabel}</span>
                    <span className="text-muted-foreground text-[11px]">
                      {entry.priority === "priority"
                        ? t.dashboard.allocation.statusPrioritary
                        : t.dashboard.allocation.statusInBalance}
                    </span>
                  </div>

                  {showSubComposition && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground/70">
                        {t.dashboard.allocation.composition}:
                      </span>
                      {activeSubAllocations.map((sub, idx, arr) => {
                        const subLabel =
                          t.dashboard.allocation.subClasses?.[
                            sub.rawType as keyof typeof t.dashboard.allocation.subClasses
                          ] ??
                          t.types[sub.rawType as AssetType] ??
                          sub.rawType;
                        return (
                          <span key={sub.rawType} className="font-mono">
                            {subLabel} {(sub.currentPct * 100).toFixed(1)}%
                            {idx < arr.length - 1 ? " ·" : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

