import type { ReactNode } from "react";
import type { AssetType, Currency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { FilterPill } from "./FilterPill";
import { flagFor } from "./utils";
import { getColorForAsset } from "../shared/chartColors";
import type { OppFilter, SortOption } from "@/lib/useAssetFilterSort";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TypeFilter = { key: string; type: AssetType; currency: Currency };

interface Props {
  typeFilters: TypeFilter[];
  counts: { total: number; byType: Map<string, number>; under: number; over: number };
  typeFilter: string | null;
  oppFilter: OppFilter;
  sortOption: SortOption;
  onSetTypeFilter: (key: string | null) => void;
  onSetOppFilter: (opp: OppFilter) => void;
  onSetSortOption: (sort: SortOption) => void;
}

export function WatchlistFilterBar({
  typeFilters,
  counts,
  typeFilter,
  oppFilter,
  sortOption,
  onSetTypeFilter,
  onSetOppFilter,
  onSetSortOption,
}: Props): ReactNode {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap justify-start items-center gap-2 w-full">
      <div className="flex items-center flex-wrap gap-2">
        {typeFilter ? (
          <div className="inline-flex h-8 items-center gap-2 px-3 rounded-full border border-border bg-background text-xs font-medium">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getColorForAsset(typeFilter) }}
            />
            {String(counts?.byType?.get(typeFilter) ?? 0)}
          </div>
        ) : (
          <div className="inline-flex h-8 items-center gap-2 px-3 rounded-full border border-border bg-background text-xs font-medium text-muted-foreground">
            {t.watchlist.filterAll} {String(counts?.total ?? 0)}
          </div>
        )}
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
