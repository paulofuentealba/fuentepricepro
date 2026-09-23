import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { FilterPill } from "./FilterPill";
import type { OppFilter, SortOption } from "@/lib/useAssetFilterSort";
import type { EightClassKey } from "@/lib/selectors/eightClassAllocation";
import { AssetClassFilterChips } from "@/components/shared/AssetClassFilterChips";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  activeClassFilter: EightClassKey | "ALL";
  onSelectClassFilter: (key: EightClassKey | "ALL") => void;
  availableClasses: EightClassKey[];
  classCounts?: Partial<Record<EightClassKey | "ALL", number>> | Record<string, number>;
  counts: { total: number; under: number; over: number };
  oppFilter: OppFilter;
  sortOption: SortOption;
  onSetOppFilter: (opp: OppFilter) => void;
  onSetSortOption: (sort: SortOption) => void;
}

export function WatchlistFilterBar({
  activeClassFilter,
  onSelectClassFilter,
  availableClasses,
  classCounts,
  counts,
  oppFilter,
  sortOption,
  onSetOppFilter,
  onSetSortOption,
}: Props): ReactNode {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap justify-start items-center gap-3 w-full">
      <div className="flex items-center flex-wrap gap-2 flex-1 min-w-[280px]">
        <AssetClassFilterChips
          activeFilter={activeClassFilter}
          onSelectFilter={onSelectClassFilter}
          availableClasses={availableClasses}
          counts={classCounts}
        />
      </div>

      <div className="shrink-0 w-full lg:w-auto lg:pl-2 lg:ml-auto flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
        <div className="flex items-center gap-2 border-r border-border/60 pr-4 shrink-0">
          <FilterPill
            active={oppFilter === "under"}
            tone="success"
            onClick={() => onSetOppFilter(oppFilter === "under" ? null : "under")}
            count={counts.under}
          >
            {t.watchlist.filterUndervalued}
          </FilterPill>
          <FilterPill
            active={oppFilter === "over"}
            tone="danger"
            onClick={() => onSetOppFilter(oppFilter === "over" ? null : "over")}
            count={counts.over}
          >
            {t.watchlist.filterOvervalued}
          </FilterPill>
        </div>
        <Select value={sortOption} onValueChange={(v) => onSetSortOption(v as SortOption)}>
          <SelectTrigger className="h-8 text-xs font-medium bg-background w-[180px] shrink-0">
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
    </div>
  );
}
