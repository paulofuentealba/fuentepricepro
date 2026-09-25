import React from "react";
import { Search, LayoutGrid, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-provider";
import type { RadarStrategy } from "@/lib/dividendRadarLogic";

interface DividendRadarFiltersProps {
  selectedStrategy: RadarStrategy;
  onSelectStrategy: (s: RadarStrategy) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: "cards" | "table";
  onToggleViewMode: () => void;
}

export function DividendRadarFilters({
  selectedStrategy,
  onSelectStrategy,
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleViewMode,
}: DividendRadarFiltersProps) {
  const { t } = useI18n();
  const d = t.dividendRadar;

  const strategies: { id: RadarStrategy; label: string }[] = [
    { id: "all", label: d.strategies.all },
    { id: "dgi", label: d.strategies.dgi },
    { id: "bazin", label: d.strategies.bazin },
    { id: "monthly", label: d.strategies.monthly },
    { id: "risk", label: d.strategies.risk },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Strategy Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {strategies.map((strat) => {
          const isSelected = selectedStrategy === strat.id;
          return (
            <button
              key={strat.id}
              type="button"
              onClick={() => onSelectStrategy(strat.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all border cursor-pointer",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/60 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {strat.label}
            </button>
          );
        })}
      </div>

      {/* Search & View Mode Switcher */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={d.searchPlaceholder}
            className="h-8 pl-8 text-xs bg-card"
          />
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onToggleViewMode}
          className="h-8 gap-1.5 text-xs shrink-0 bg-card"
        >
          {viewMode === "cards" ? (
            <>
              <TableProperties className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{d.viewMode.table}</span>
            </>
          ) : (
            <>
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{d.viewMode.cards}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
