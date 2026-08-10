import { LayoutGrid, List } from "lucide-react";
import { WatchlistFilterBar, type TypeFilter } from "./WatchlistFilterBar";
import { AddAssetDropdown } from "./AddAssetDropdown";
import { DataManagement } from "./DataManagement";
import type { OppFilter, SortOption } from "@/lib/useAssetFilterSort";
import { useI18n } from "@/lib/i18n-provider";

interface WatchlistToolbarProps {
  typeFilters: TypeFilter[];
  counts: { total: number; byType: Map<string, number>; under: number; over: number };
  typeFilter: string | null;
  oppFilter: OppFilter;
  sortOption: SortOption;
  onSetTypeFilter: (val: string | null) => void;
  onSetOppFilter: (val: OppFilter) => void;
  onSetSortOption: (val: SortOption) => void;
  viewMode: "grid" | "table";
  setViewMode: (mode: "grid" | "table") => void;
  onNavigateToScreener: () => void;
  onOpenFIWizard: () => void;
  onOpenBrokerUploader: () => void;
}

export function WatchlistToolbar({
  typeFilters,
  counts,
  typeFilter,
  oppFilter,
  sortOption,
  onSetTypeFilter,
  onSetOppFilter,
  onSetSortOption,
  viewMode,
  setViewMode,
  onNavigateToScreener,
  onOpenFIWizard,
  onOpenBrokerUploader,
}: WatchlistToolbarProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
      <div className="flex-1 min-w-0">
        <WatchlistFilterBar
          typeFilters={typeFilters}
          counts={counts}
          typeFilter={typeFilter}
          oppFilter={oppFilter}
          sortOption={sortOption}
          onSetTypeFilter={onSetTypeFilter}
          onSetOppFilter={onSetOppFilter}
          onSetSortOption={onSetSortOption}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <AddAssetDropdown
          onNavigateToScreener={onNavigateToScreener}
          onOpenFIWizard={onOpenFIWizard}
          onOpenBrokerUploader={onOpenBrokerUploader}
        />
        <DataManagement />
        <div className="inline-flex h-8 items-center gap-0.5 rounded-lg border border-border/60 bg-background/50 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
              viewMode === "grid"
                ? "bg-muted text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
            title={t.watchlist.gridView}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
              viewMode === "table"
                ? "bg-muted text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
            title={t.watchlist.tableView}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
