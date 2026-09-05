import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { AssetType } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";
import {
  computeEightClassAllocations,
  type EightClassKey,
} from "@/lib/selectors/eightClassAllocation";

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

  const entries = useMemo(
    () => computeEightClassAllocations(valuedItems, smartAllocationTargets, usdRate),
    [valuedItems, smartAllocationTargets, usdRate],
  );

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 flex flex-col justify-between shadow-sm dark:border-[#234839] dark:bg-[radial-gradient(circle_at_top_right,#132C22,#0D1A15_70%)]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-accent-emerald-light dark:text-[#34D399]">
              {t.dashboard.allocation.eyebrow}
            </div>
            <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground dark:text-white">
              {t.dashboard.allocation.title}
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{t.dashboard.allocation.subtitle}</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <Skeleton key={n} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {entries.map((entry) => {
              const classLabel =
                t.dashboard.allocation.classes?.[entry.key as EightClassKey] ?? entry.key;

              let statusLabel = t.dashboard.allocation.statusBalanced;
              let statusColor = "text-[#a97a1f] dark:text-[#DFC38A]";
              let barColor = "bg-[#DFC38A]";

              if (entry.status === "invest") {
                statusLabel = t.dashboard.allocation.statusInvest;
                statusColor = "text-[#15803d] dark:text-[#34D399]";
                barColor = "bg-[#34D399]";
              } else if (entry.status === "above") {
                statusLabel = t.dashboard.allocation.statusAbove;
                statusColor = "text-[#dc2626] dark:text-[#F87171]";
                barColor = "bg-[#F87171]";
              }

              const fillPct = Math.min(
                100,
                Math.max(entry.currentPct > 0 ? 4 : 0, (entry.currentPct / 30.0) * 100),
              );

              return (
                <div
                  key={entry.key}
                  className="rounded-xl border border-border/60 bg-surface-2 p-3.5 transition-colors hover:border-border dark:border-[#182C25] dark:bg-[#0D1714]"
                >
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-sm text-foreground dark:text-white truncate pr-2">
                      {classLabel}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono shrink-0">
                      {entry.currentPct.toFixed(1)}% / {entry.targetPct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3 dark:bg-[#182C25] my-2">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

