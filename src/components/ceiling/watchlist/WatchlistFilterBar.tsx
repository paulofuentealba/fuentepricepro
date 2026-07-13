import type { ReactNode } from "react";
import type { AssetType, Currency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { FilterPill } from "./FilterPill";
import { flagFor } from "./utils";
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
    <div className="flex items-center gap-2 w-full">
      <div className="flex flex-1 gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <FilterPill
          active={typeFilter === null}
          onClick={() => onSetTypeFilter(null)}
          count={counts.total}
        >
          {t.watchlist.filterAll}
        </FilterPill>
        {typeFilters.map((f) => (
          <FilterPill
            key={f.key}
            active={typeFilter === f.key}
            onClick={() => onSetTypeFilter(typeFilter === f.key ? null : f.key)}
            count={counts.byType.get(f.key) ?? 0}
          >
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-muted/50 text-muted-foreground uppercase leading-none">{flagFor(f.currency)}</span>
            {t.types[f.type]}
          </FilterPill>
        ))}
      </div>

      <div className="shrink-0 pl-2 ml-auto flex items-center gap-2 hidden lg:flex">
        <div className="flex items-center gap-2 border-r border-border/60 pr-4">
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
          <SelectTrigger className="h-8 text-xs font-medium bg-background/40 w-[180px]">
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
