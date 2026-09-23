import { memo } from "react";
import { useI18n } from "@/lib/i18n-provider";
import type { EightClassKey } from "@/lib/selectors/eightClassAllocation";
import { cn } from "@/lib/utils";

export interface AssetClassFilterChipsProps {
  activeFilter: EightClassKey | "ALL";
  onSelectFilter: (filter: EightClassKey | "ALL") => void;
  availableClasses: EightClassKey[];
  counts?: Partial<Record<EightClassKey | "ALL", number>> | Record<string, number>;
  className?: string;
  allLabel?: string;
}

function AssetClassFilterChipsImpl({
  activeFilter,
  onSelectFilter,
  availableClasses,
  counts,
  className,
  allLabel,
}: AssetClassFilterChipsProps) {
  const { t } = useI18n();

  const resolvedAllLabel =
    allLabel ||
    t.dashboard?.matrix?.filterAllDynamic ||
    t.dashboard?.matrix?.filterAll ||
    t.watchlist?.filterAll ||
    "Todas as Classes";

  const totalCount = counts?.ALL;

  return (
    <div
      role="group"
      aria-label="Filtro de classes de ativo"
      className={cn("flex flex-wrap items-center gap-2 overflow-x-auto pb-1", className)}
    >
      {/* ALL pill */}
      <button
        type="button"
        onClick={() => onSelectFilter("ALL")}
        className={cn(
          "inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
          activeFilter === "ALL"
            ? "border-accent-emerald-light bg-accent-emerald text-primary-foreground dark:bg-[#2A7F5F] dark:border-[#34D399]"
            : "border-border/80 bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground dark:border-[#1B2F27] dark:bg-[#12211C] dark:text-[#94A3B8]",
        )}
      >
        <span>{resolvedAllLabel}</span>
        {typeof totalCount === "number" && (
          <span
            className={cn(
              "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none",
              activeFilter === "ALL"
                ? "bg-white/20 text-white"
                : "bg-foreground/10 text-muted-foreground",
            )}
          >
            {totalCount}
          </span>
        )}
      </button>

      {/* Class pills */}
      {availableClasses.map((clsKey) => {
        const isActive = activeFilter === clsKey;
        const label = t.dashboard?.allocation?.classes?.[clsKey] ?? clsKey;
        const count = counts?.[clsKey];

        return (
          <button
            key={clsKey}
            type="button"
            onClick={() => onSelectFilter(clsKey)}
            className={cn(
              "inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
              isActive
                ? "border-accent-emerald-light bg-accent-emerald text-primary-foreground dark:bg-[#2A7F5F] dark:border-[#34D399]"
                : "border-border/80 bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground dark:border-[#1B2F27] dark:bg-[#12211C] dark:text-[#94A3B8]",
            )}
          >
            <span>{label}</span>
            {typeof count === "number" && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-foreground/10 text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const AssetClassFilterChips = memo(AssetClassFilterChipsImpl);
