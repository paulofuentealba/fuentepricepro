import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useUserSettings } from "@/lib/useUserSettings";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { formatCurrency } from "@/lib/formatters";
import { dividendRadarQueryOptions } from "@/lib/queryOptions";
import {
  buildRadarItems,
  detectPortfolioGaps,
  type RadarItem,
  type RadarStrategy,
} from "@/lib/dividendRadarLogic";
import { DividendRadarHero } from "./DividendRadarHero";
import { DividendRadarSeasonalityBar } from "./DividendRadarSeasonalityBar";
import { DividendRadarFilters } from "./DividendRadarFilters";
import { DividendRadarCard } from "./DividendRadarCard";
import { DividendRadarTable } from "./DividendRadarTable";
import { DividendRadarDetailSheet } from "./DividendRadarDetailSheet";

export function DividendRadarView() {
  const { t, locale } = useI18n();
  const d = t.dividendRadar;
  const { settings } = useUserSettings();
  const { valuedItems } = useValuedPortfolio();

  const radarQuery = useQuery(dividendRadarQueryOptions());

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">("ALL");
  const [selectedStrategy, setSelectedStrategy] = useState<RadarStrategy>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Detail Sheet State
  const [activeDetailItem, setActiveDetailItem] = useState<RadarItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Currency Formatter Helper
  const formatCurr = (val: number, cur: string = "BRL") =>
    formatCurrency(val, cur as any, locale);

  // Derived Items
  const items = useMemo(() => {
    return buildRadarItems(radarQuery.data, settings?.taxJurisdiction, locale);
  }, [radarQuery.data, settings?.taxJurisdiction, locale]);

  // Gap Analysis
  const gapAnalysis = useMemo(() => {
    return detectPortfolioGaps(valuedItems, d.seasonality.monthNames);
  }, [valuedItems, d.seasonality.monthNames]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Month Filter
      if (selectedMonth !== "ALL" && !item.months.includes(selectedMonth)) {
        return false;
      }
      // Strategy Filter
      if (selectedStrategy !== "all" && !item.tags.includes(selectedStrategy)) {
        return false;
      }
      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.ticker.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [items, selectedMonth, selectedStrategy, searchQuery]);

  // Actions
  const handleInvest = (item: RadarItem) => {
    toast.success(d.investToast.replace("{{ticker}}", item.ticker));
  };

  const handleOpenDetail = (item: RadarItem) => {
    setActiveDetailItem(item);
    setIsDetailOpen(true);
  };

  const handleToggleViewMode = () => {
    setViewMode((prev) => (prev === "cards" ? "table" : "cards"));
  };

  return (
    <div data-testid="dividend-radar-view" className="space-y-6">
      {/* Hero & Gap Finder */}
      <DividendRadarHero
        analysis={gapAnalysis}
        totalCount={items.length}
        onSelectMonth={setSelectedMonth}
        formatCurrency={formatCurr}
      />

      {/* Seasonality 13-Tab Bar */}
      <DividendRadarSeasonalityBar
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        items={items}
      />

      {/* Strategy Filters, Search & View Switcher */}
      <DividendRadarFilters
        selectedStrategy={selectedStrategy}
        onSelectStrategy={setSelectedStrategy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
      />

      {/* Main Content Area */}
      {filteredItems.length === 0 ? (
        <div
          data-testid="radar-empty-state"
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card p-10 text-center space-y-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Info className="h-6 w-6" />
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{d.empty}</p>
        </div>
      ) : viewMode === "cards" ? (
        <div
          data-testid="radar-cards-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredItems.map((item) => (
            <DividendRadarCard
              key={item.ticker}
              item={item}
              onOpenDetail={handleOpenDetail}
              onInvest={handleInvest}
              formatCurrency={formatCurr}
            />
          ))}
        </div>
      ) : (
        <DividendRadarTable
          items={filteredItems}
          onOpenDetail={handleOpenDetail}
          onInvest={handleInvest}
          formatCurrency={formatCurr}
        />
      )}

      {/* Regulatory & Methodology Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed">
        <span className="font-serif text-sm font-bold text-primary shrink-0 mt-0.5">
          ◆
        </span>
        <div>
          <strong className="text-foreground">{d.disclaimer.prefix}</strong>{" "}
          {d.disclaimer.body}
        </div>
      </div>

      {/* Deep Dive Raio-X Side Drawer Sheet */}
      <DividendRadarDetailSheet
        item={activeDetailItem}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onInvest={handleInvest}
        formatCurrency={formatCurr}
      />
    </div>
  );
}
