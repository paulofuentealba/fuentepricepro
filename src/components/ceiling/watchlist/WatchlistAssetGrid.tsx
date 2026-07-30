import { Button } from "@/components/ui/button";
import { AssetCard } from "@/components/shared/AssetCard";
import { WatchlistTable } from "./WatchlistTable";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

interface WatchlistAssetGridProps {
  filteredAndSorted: ValuedWatchlistItem[];
  valuedItemsLength: number;
  quotes: Record<string, any>;
  meta: Record<string, any>;
  viewMode: "grid" | "table";
  onEdit: (it: ValuedWatchlistItem) => void;
  onRemove: (id: string) => void;
  onOpenDetail: (it: ValuedWatchlistItem) => void;
  onClearFilters: () => void;
}

export function WatchlistAssetGrid({
  filteredAndSorted,
  valuedItemsLength,
  quotes,
  meta,
  viewMode,
  onEdit,
  onRemove,
  onOpenDetail,
  onClearFilters,
}: WatchlistAssetGridProps) {
  const { t } = useI18n();

  if (filteredAndSorted.length === 0 && valuedItemsLength > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/50 bg-background/40 backdrop-blur-md">
        <p className="text-sm text-muted-foreground mb-4">
          {t.emptyStates?.noMatch || "Nenhum ativo encontrado."}
        </p>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          {t.emptyStates?.clearFilters || "Limpar Filtros"}
        </Button>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredAndSorted.map((it) => (
          <AssetCard
            key={it.id}
            item={it}
            quote={quotes[it.ticker]}
            meta={meta[it.ticker]}
            onEdit={onEdit}
            onRemove={onRemove}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    );
  }

  return <WatchlistTable items={filteredAndSorted} quotes={quotes} />;
}
