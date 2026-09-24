import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import {
  classifyPositionToEightClass,
  type EightClassKey,
} from "@/lib/selectors/eightClassAllocation";
import { useMarketScope } from "@/lib/useMarketScope";
import { computeRecommendedAction, type RecommendedActionKey } from "@/lib/selectors/recommendedAction";
import { computeTaxRegimeKey } from "@/lib/selectors/taxRegimeLabel";
import { cn } from "@/lib/utils";
import { AssetClassFilterChips } from "@/components/shared/AssetClassFilterChips";
import { useAssetClassFilter } from "@/lib/selectors/useAssetClassFilter";
import { useTableSort } from "@/components/ui/table-sort";
import { SortableTableHead } from "@/components/ui/SortableTableHead";

interface OpportunityMatrixTableProps {
  valuedItems: ValuedWatchlistItem[];
  isLoading: boolean;
  onSelectTicker?: (ticker: string) => void;
}

export function OpportunityMatrixTable({ valuedItems, isLoading, onSelectTicker }: OpportunityMatrixTableProps) {
  const { locale, t } = useI18n();
  const { taxJurisdiction } = useMarketScope();

  const {
    activeFilter,
    setActiveFilter,
    availableClasses: availableFilterClasses,
    filteredItems: classFilteredItems,
    countsByClass,
  } = useAssetClassFilter(valuedItems, {
    filterPredicate: (i) => !i.isClosedPosition && (i.quantity ?? 0) > 0,
    onlyExisting: true,
  });

  const taxRegimeLabel: Record<string, string> = useMemo(
    () => ({
      exemptDouble: t.dashboard.taxRegime.exemptDouble,
      exemptDividend: t.dashboard.taxRegime.exemptDividend,
      exemptStockBr: t.dashboard.taxRegime.exemptStockBr,
      whtCompensable: t.dashboard.taxRegime.whtCompensable,
      jcpWithholding: t.dashboard.taxRegime.jcpWithholding,
      standard: t.dashboard.taxRegime.standard,
      usQualified: t.dashboard.taxRegime.usQualified,
      usReitQbi: t.dashboard.taxRegime.usReitQbi,
      usEtf: t.dashboard.taxRegime.usEtf,
      foreignBr: t.dashboard.taxRegime.foreignBr,
    }),
    [t],
  );

  function getBadgeDetails(action: RecommendedActionKey, margin: number | null) {
    if (action === "yieldTrap") {
      return {
        label: t.dashboard.matrix.actionYieldTrap || t.dashboard.matrix.actionAvoid,
        className:
          "bg-accent-red-subtle text-accent-red dark:text-[#F87171] border border-accent-red",
      };
    }
    if (action === "avoid" || (margin != null && margin < 0)) {
      return {
        label: t.dashboard.matrix.actionWatch,
        className:
          "bg-muted/40 text-muted-foreground border border-border/80",
      };
    }
    if (margin != null && margin >= 10) {
      return {
        label: t.dashboard.matrix.actionBuy,
        className:
          "bg-accent-emerald-subtle text-accent-emerald-light dark:text-[#34D399] border border-accent-emerald",
      };
    }
    if (action === "buy" || action === "watch" || (margin != null && margin >= 0)) {
      return {
        label: t.dashboard.matrix.actionOk,
        className:
          "bg-accent-gold/10 text-accent-gold dark:text-[#DFC38A] border border-accent-gold/60",
      };
    }
    return {
      label: t.dashboard.matrix.actionWatch,
      className:
        "bg-muted/40 text-muted-foreground border border-border/80",
    };
  }

  const { sortedItems, sortKey, sortDirection, toggleSort } = useTableSort<
    ValuedWatchlistItem,
    "ticker" | "class" | "price" | "ceiling" | "margin" | "dy" | "taxRegime" | "action"
  >({
    items: classFilteredItems,
    defaultSortKey: "margin",
    defaultDirection: "desc",
    extractors: {
      ticker: (i) => i.ticker,
      class: (i) => {
        const classKey = classifyPositionToEightClass(i);
        return t.dashboard.allocation.classes?.[classKey] ?? t.types[i.type] ?? i.type;
      },
      price: (i) => i.livePrice ?? i.currentPrice ?? 0,
      ceiling: (i) => i.valuation?.activeCeiling ?? i.ceilingPrice ?? 0,
      margin: (i) => i.valuation?.margin ?? i.safetyMargin ?? null,
      dy: (i) => i.valuation?.dividendYield ?? 0,
      taxRegime: (i) => {
        const regime = computeTaxRegimeKey(i.type, i.currency, taxJurisdiction);
        return taxRegimeLabel[regime] ?? "";
      },
      action: (i) => {
        const margin = i.valuation?.margin ?? i.safetyMargin ?? null;
        const action = computeRecommendedAction(i);
        return getBadgeDetails(action, margin).label;
      },
    },
  });

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm dark:border-[#1B2F27] dark:bg-[#0D1714]">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent-emerald-light dark:text-[#34D399]">
          {t.dashboard.matrix.eyebrow}
        </div>
        <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground dark:text-white">
          {t.dashboard.matrix.title}
        </h2>
      </div>

      {/* Filter Chips */}
      <AssetClassFilterChips
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        availableClasses={availableFilterClasses}
        counts={countsByClass}
        className="mb-4"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : sortedItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t.dashboard.matrix.empty}</p>
      ) : (
        <>
          {/* Mobile View (< md): Stacked Asset Cards (Zero Horizontal Scroll) */}
          <div className="flex flex-col gap-3 md:hidden">
            {sortedItems.map((item) => {
              const action = computeRecommendedAction(item);
              const regime = computeTaxRegimeKey(item.type, item.currency, taxJurisdiction);
              const livePrice = item.livePrice ?? item.currentPrice ?? 0;
              const margin = item.valuation?.margin ?? item.safetyMargin ?? null;
              const ceiling = item.valuation?.activeCeiling ?? item.ceilingPrice ?? 0;
              const badge = getBadgeDetails(action, margin);
              const classKey = classifyPositionToEightClass(item);
              const classLabel =
                t.dashboard.allocation.classes?.[classKey] ?? t.types[item.type] ?? item.type;
              const dy = item.valuation?.dividendYield ?? 0;
              const isAccumulating = item.type === "ETF" && dy === 0;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectTicker?.(item.ticker)}
                  className="rounded-xl border border-border/70 bg-surface-1 p-4 transition-all hover:border-accent-emerald/40 active:scale-[0.99] cursor-pointer dark:border-[#1B2F27] dark:bg-[#0A1612]"
                >
                  {/* Header: Ticker + Name on left, Badges on right */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-accent-gold dark:text-[#DFC38A] text-lg leading-tight font-sans">
                        {item.ticker}
                      </div>
                      <div className="text-[0.78rem] text-muted-foreground dark:text-[#64748B] font-normal mt-0.5">
                        {item.name}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-0.5 rounded-md text-[0.7rem] font-semibold tracking-wide uppercase",
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded text-[0.7rem] font-medium bg-accent-emerald-subtle text-accent-emerald dark:text-[#34D399] border border-accent-emerald/30">
                        {classLabel}
                      </span>
                    </div>
                  </div>

                  {/* 2x2 Grid of Metrics */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2.5 rounded-lg bg-surface-2/60 p-2.5 text-xs dark:bg-[#12211C]/70">
                    <div>
                      <span className="text-[0.68rem] uppercase tracking-wider text-muted-foreground dark:text-[#64748B] block">
                        {t.dashboard.matrix.columnPrice}
                      </span>
                      <span className="font-semibold text-foreground text-sm">
                        {formatCurrency(livePrice, item.currency, locale)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[0.68rem] uppercase tracking-wider text-muted-foreground dark:text-[#64748B] block">
                        {t.dashboard.matrix.columnCeiling}
                      </span>
                      <span className="font-semibold text-accent-gold dark:text-[#DFC38A] text-sm">
                        {formatCurrency(ceiling, item.currency, locale)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[0.68rem] uppercase tracking-wider text-muted-foreground dark:text-[#64748B] block">
                        {t.dashboard.matrix.columnMargin}
                      </span>
                      {margin != null ? (
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 mt-0.5 rounded font-bold text-xs",
                            margin >= 0
                              ? "text-accent-emerald-light dark:text-[#34D399] bg-accent-emerald-subtle"
                              : "text-accent-red dark:text-[#F87171] bg-accent-red-subtle",
                          )}
                        >
                          {margin > 0 ? "+" : ""}
                          {margin.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[0.68rem] uppercase tracking-wider text-muted-foreground dark:text-[#64748B] block">
                        {t.dashboard.matrix.columnNetDy}
                      </span>
                      <span className="font-semibold text-accent-emerald-light dark:text-[#34D399] text-sm">
                        {isAccumulating ? "Acumulação" : formatPercent(dy, locale, 1)}
                      </span>
                    </div>
                  </div>

                  {/* Footer: Tax Regime */}
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/40 dark:border-white/5 text-[0.72rem] text-muted-foreground dark:text-[#64748B]">
                    <span>{t.dashboard.matrix.columnTaxRegime}:</span>
                    <span className="font-medium text-foreground/80 dark:text-[#94A3B8]">
                      {taxRegimeLabel[regime]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View (>= md): Fluid Table with Sticky Asset Column */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border/60 dark:border-[#1B2F27]">
            <Table containerClassName="overflow-x-auto scrollbar-thin" className="w-full min-w-[760px]">
              <TableHeader className="bg-surface-1 dark:bg-[#0D1714]">
                <TableRow className="border-border/60 dark:border-[#1B2F27] hover:bg-transparent">
                  <SortableTableHead
                    id="ticker"
                    label={t.dashboard.matrix.columnAsset}
                    activeKey={sortKey}
                    activeDirection={sortDirection}
                    onSort={(k) => toggleSort(k as any)}
                    className="sticky left-0 z-20 bg-surface-1 dark:bg-[#0D1714] py-3 pl-3 pr-2 lg:pl-4 lg:pr-3 text-[0.72rem] uppercase tracking-wider font-semibold text-muted-foreground dark:text-[#64748B] whitespace-nowrap shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)]"
                  />
                  <SortableTableHead
                    id="class"
                    label={t.dashboard.matrix.columnClass}
                    activeKey={sortKey}
                    activeDirection={sortDirection}
                    onSort={(k) => toggleSort(k as any)}
                    className="py-3 px-2 lg:px-2.5 text-[0.72rem] uppercase tracking-wider font-semibold text-muted-foreground dark:text-[#64748B] whitespace-nowrap"
                  />
                  <SortableTableHead
                    id="price"
                    label={t.dashboard.matrix.columnPrice}
                    activeKey={sortKey}
                    activeDirection={sortDirection}
                    onSort={(k) => toggleSort(k as any)}
                    className="py-3 px-2 lg:px-2.5 text-[0.72rem] uppercase tracking-wider font-semibold text-muted-foreground dark:text-[#64748B] whitespace-nowrap"
                  />
                  <SortableTableHead
                    id="ceiling"
                    label={t.dashboard.matrix.columnCeiling}
                    activeKey={sortKey}
                    activeDirection={sortDirection}
                    onSort={(k) => toggleSort(k as any)}
                    className="py-3 px-2 lg:px-2.5 text-[0.72rem] uppercase tracking-wider font-semibold text-muted-foreground dark:text-[#64748B] whitespace-nowrap"
                  />
                  <SortableTableHead
                    id="margin"
                    label={t.dashboard.matrix.columnMargin}
                    activeKey={sortKey}
                    activeDirection={sortDirection}
                    onSort={(k) => toggleSort(k as any)}
                    className="py-3 px-2 lg:px-2.5 text-[0.72rem] uppercase tracking-wider font-semibold text-muted-foreground dark:text-[#64748B] whitespace-nowrap"
                  />
                  <SortableTableHead
                    id="dy"
                    label={t.dashboard.matrix.columnNetDy}
                    activeKey={sortKey}
                    activeDirection={sortDirection}
                    onSort={(k) => toggleSort(k as any)}
                    className="py-3 pl-2 pr-1 lg:pl-2.5 lg:pr-1.5 text-[0.72rem] uppercase tracking-wider font-semibold text-muted-foreground dark:text-[#64748B] whitespace-nowrap"
                  />
                  <SortableTableHead
                    id="taxRegime"
                    label={t.dashboard.matrix.columnTaxRegime}
                    activeKey={sortKey}
                    activeDirection={sortDirection}
                    onSort={(k) => toggleSort(k as any)}
                    className="py-3 pl-1 pr-2 lg:pl-1.5 lg:pr-2.5 text-[0.72rem] uppercase tracking-wider font-semibold text-muted-foreground dark:text-[#64748B] whitespace-nowrap"
                  />
                  <SortableTableHead
                    id="action"
                    label={t.dashboard.matrix.columnAction}
                    activeKey={sortKey}
                    activeDirection={sortDirection}
                    onSort={(k) => toggleSort(k as any)}
                    className="py-3 pl-2 pr-3 lg:pl-3 lg:pr-4 text-[0.72rem] uppercase tracking-wider font-semibold text-muted-foreground dark:text-[#64748B] whitespace-nowrap"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item) => {
                  const action = computeRecommendedAction(item);
                  const regime = computeTaxRegimeKey(item.type, item.currency, taxJurisdiction);
                  const livePrice = item.livePrice ?? item.currentPrice ?? 0;
                  const margin = item.valuation?.margin ?? item.safetyMargin ?? null;
                  const ceiling = item.valuation?.activeCeiling ?? item.ceilingPrice ?? 0;
                  const badge = getBadgeDetails(action, margin);
                  const classKey = classifyPositionToEightClass(item);
                  const classLabel =
                    t.dashboard.allocation.classes?.[classKey] ?? t.types[item.type] ?? item.type;
                  const dy = item.valuation?.dividendYield ?? 0;
                  const isAccumulating = item.type === "ETF" && dy === 0;

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => onSelectTicker?.(item.ticker)}
                      className="group border-b border-border/40 dark:border-white/5 hover:bg-surface-hover/80 dark:hover:bg-[#1A342B] cursor-pointer transition-colors"
                    >
                      <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-surface-hover/80 dark:bg-[#0D1714] dark:group-hover:bg-[#1A342B] py-3.5 pl-3 pr-2 lg:pl-4 lg:pr-3 whitespace-nowrap shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] transition-colors">
                        <div className="font-bold text-accent-gold dark:text-[#DFC38A] text-base leading-tight font-sans">
                          {item.ticker}
                        </div>
                        <div className="text-[0.74rem] text-muted-foreground dark:text-[#64748B] font-normal leading-tight mt-0.5 whitespace-nowrap max-w-[170px] truncate">
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-2 lg:px-2.5 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[0.72rem] font-semibold bg-accent-emerald-subtle text-accent-emerald dark:text-[#34D399] border border-accent-emerald/30 whitespace-nowrap">
                          {classLabel}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 px-2 lg:px-2.5 whitespace-nowrap font-semibold text-foreground">
                        {formatCurrency(livePrice, item.currency, locale)}
                      </TableCell>
                      <TableCell className="py-3.5 px-2 lg:px-2.5 whitespace-nowrap font-semibold text-accent-gold dark:text-[#DFC38A]">
                        {formatCurrency(ceiling, item.currency, locale)}
                      </TableCell>
                      <TableCell className="py-3.5 px-2 lg:px-2.5 whitespace-nowrap">
                        {margin != null ? (
                          <span
                            className={cn(
                              "inline-block px-2.5 py-1 rounded-md bg-surface-2 dark:bg-black/40 border border-border/50 font-bold text-xs whitespace-nowrap",
                              margin >= 0
                                ? "text-accent-emerald-light dark:text-[#34D399]"
                                : "text-accent-red dark:text-[#F87171]",
                            )}
                          >
                            {margin > 0 ? "+" : ""}
                            {margin.toFixed(1)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 pl-2 pr-1 lg:pl-2.5 lg:pr-1.5 whitespace-nowrap">
                        {isAccumulating ? (
                          <span className="font-semibold text-accent-emerald-light dark:text-[#34D399]">
                            Acumulação
                          </span>
                        ) : (
                          <span className="font-semibold text-accent-emerald-light dark:text-[#34D399]">
                            {formatPercent(dy, locale, 1)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 pl-1 pr-2 lg:pl-1.5 lg:pr-2.5 whitespace-nowrap text-[0.8rem] text-muted-foreground dark:text-[#64748B]">
                        {taxRegimeLabel[regime]}
                      </TableCell>
                      <TableCell className="py-3.5 pl-2 pr-3 lg:pl-3 lg:pr-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-block px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap",
                            badge.className,
                          )}
                        >
                          {badge.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
