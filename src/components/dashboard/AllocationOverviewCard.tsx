import { Skeleton } from "@/components/ui/skeleton";
import type { ClassAllocationState } from "@/lib/portfolioAllocationState";
import type { AssetType } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";

interface AllocationOverviewCardProps {
  allocationState: Map<AssetType, ClassAllocationState>;
  isLoading: boolean;
}

export function AllocationOverviewCard({ allocationState, isLoading }: AllocationOverviewCardProps) {
  const { t } = useI18n();
  const entries = Array.from(allocationState.values());

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t.dashboard.allocation.eyebrow}
          </div>
          <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
            {t.dashboard.allocation.title}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">{t.dashboard.allocation.subtitle}</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.dashboard.allocation.empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => {
            const targetPct = entry.targetPct * 100;
            const currentPct = entry.currentPct * 100;
            return (
              <div key={entry.type} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{t.types[entry.type]}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.dashboard.allocation.current} {currentPct.toFixed(1)}% ·{" "}
                    {t.dashboard.allocation.target} {targetPct.toFixed(1)}%
                  </span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
                    style={{ width: `${Math.min(100, currentPct)}%` }}
                  />
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground"
                    style={{ left: `${Math.min(100, targetPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
