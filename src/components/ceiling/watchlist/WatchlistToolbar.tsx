import { LayoutGrid, List } from "lucide-react";
import { WatchlistFilterBar, type TypeFilter } from "./WatchlistFilterBar";
import { AddAssetDropdown } from "./AddAssetDropdown";
import { DataManagement } from "./DataManagement";
import type { OppFilter, SortOption } from "@/lib/useAssetFilterSort";

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
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
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
      <div className="flex items-center gap-4 shrink-0 flex-wrap">
        <AddAssetDropdown
          onNavigateToScreener={onNavigateToScreener}
          onOpenFIWizard={onOpenFIWizard}
          onOpenBrokerUploader={onOpenBrokerUploader}
        />
        <DataManagement />
        <div className="flex items-center gap-1 rounded-md border border-border/60 bg-background/50 p-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`rounded p-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-muted text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`rounded p-1.5 transition-colors ${
              viewMode === "table"
                ? "bg-muted text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
            title="Table View (Bulk Edit)"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
