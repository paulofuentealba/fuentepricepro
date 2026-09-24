import { useMemo } from "react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { netAfterTax } from "@/lib/calculations";
import { Download } from "lucide-react";
import { DgiBadge } from "@/components/shared/DgiBadge";
import { cn } from "@/lib/utils";
import { AssetClassFilterChips } from "@/components/shared/AssetClassFilterChips";
import { useAssetClassFilter } from "@/lib/selectors/useAssetClassFilter";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

interface PortfolioPositionsTableProps {
  valuedItems: ValuedWatchlistItem[];
  onSelectItem: (item: ValuedWatchlistItem) => void;
  isLoading: boolean;
}

export function PortfolioPositionsTable({ valuedItems, onSelectItem, isLoading }: PortfolioPositionsTableProps) {
  const { locale, t } = useI18n();

  const positions = useMemo(
    () => valuedItems.filter((item) => !item.isClosedPosition),
    [valuedItems],
  );

  const {
    activeFilter,
    setActiveFilter,
    availableClasses,
    filteredItems: filteredPositions,
    countsByClass,
  } = useAssetClassFilter(positions, { onlyExisting: true });

  const columns: DataTableColumn<ValuedWatchlistItem>[] = useMemo(
    () => [
      {
        id: "asset",
        header: t.portfolio.columnAsset,
        sticky: true,
        accessor: (item) => item.ticker,
        cell: (item) => (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-accent-gold text-base leading-tight">
                {item.ticker}
              </span>
              <DgiBadge ticker={item.ticker} size="sm" />
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[140px]">
              {item.name}
            </div>
          </div>
        ),
      },
      {
        id: "broker",
        header: t.portfolio.columnBroker,
        accessor: (item) => item.broker || "",
        cell: (item) => (
          <span className="text-xs text-muted-foreground">{item.broker || "—"}</span>
        ),
      },
      {
        id: "quantity",
        header: t.portfolio.columnQty,
        align: "right",
        accessor: (item) => item.quantity,
        cell: (item) => (
          <span className="font-semibold text-foreground">
            {item.quantity.toLocaleString(locale === "en" ? "en-US" : "pt-BR")}
          </span>
        ),
      },
      {
        id: "avgPrice",
        header: t.portfolio.columnAvgPrice,
        align: "right",
        accessor: (item) => item.averagePrice ?? 0,
        cell: (item) => (
          <span className="text-foreground">
            {formatCurrency(item.averagePrice ?? 0, item.currency, locale)}
          </span>
        ),
      },
      {
        id: "price",
        header: t.portfolio.columnPrice,
        align: "right",
        accessor: (item) => item.livePrice ?? item.currentPrice ?? 0,
        cell: (item) => (
          <span className="font-semibold text-foreground">
            {formatCurrency(item.livePrice ?? item.currentPrice ?? 0, item.currency, locale)}
          </span>
        ),
      },
      {
        id: "total",
        header: t.portfolio.columnTotal,
        align: "right",
        accessor: (item) => (item.livePrice ?? item.currentPrice ?? 0) * item.quantity,
        cell: (item) => {
          const total = (item.livePrice ?? item.currentPrice ?? 0) * item.quantity;
          return (
            <span className="font-serif font-bold text-accent-gold">
              {formatCurrency(total, item.currency, locale)}
            </span>
          );
        },
      },
      {
        id: "pnl",
        header: t.portfolio.columnPnl,
        align: "right",
        accessor: (item) => {
          const livePrice = item.livePrice ?? item.currentPrice ?? 0;
          const avgPrice = item.averagePrice ?? 0;
          return (livePrice - avgPrice) * item.quantity;
        },
        cell: (item) => {
          const livePrice = item.livePrice ?? item.currentPrice ?? 0;
          const avgPrice = item.averagePrice ?? 0;
          const total = livePrice * item.quantity;
          const invested = avgPrice * item.quantity;
          const pnl = total - invested;
          const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
          return (
            <span
              className={cn(
                "font-bold text-xs",
                pnl >= 0 ? "text-accent-emerald-light" : "text-accent-red",
              )}
            >
              {pnl >= 0 ? "+" : ""}
              {formatCurrency(pnl, item.currency, locale)} ({pnlPct >= 0 ? "+" : ""}
              {formatPercent(pnlPct, locale, 1)})
            </span>
          );
        },
      },
      {
        id: "yoc",
        header: t.portfolio.columnYoc,
        align: "right",
        accessor: (item) => {
          const avgPrice = item.averagePrice ?? 0;
          if (avgPrice <= 0) return 0;
          const netAnnualDividendPerShare = netAfterTax(
            item.annualDividend || 0,
            item.type,
            item.currency,
            item.customTaxRate,
          );
          return (netAnnualDividendPerShare / avgPrice) * 100;
        },
        cell: (item) => {
          const avgPrice = item.averagePrice ?? 0;
          const netAnnualDividendPerShare = netAfterTax(
            item.annualDividend || 0,
            item.type,
            item.currency,
            item.customTaxRate,
          );
          const yoc = avgPrice > 0 ? (netAnnualDividendPerShare / avgPrice) * 100 : 0;
          return (
            <span className="font-semibold text-accent-emerald-light">
              {formatPercent(yoc, locale, 2)}
            </span>
          );
        },
      },
      {
        id: "status",
        header: t.portfolio.columnStatus,
        align: "center",
        accessor: (item) => {
          const ceiling = item.valuation?.activeCeiling ?? item.ceilingPrice ?? 0;
          const livePrice = item.livePrice ?? item.currentPrice ?? 0;
          return ceiling > 0 ? ceiling - livePrice : -Infinity;
        },
        cell: (item) => {
          const livePrice = item.livePrice ?? item.currentPrice ?? 0;
          const ceiling = item.valuation?.activeCeiling ?? item.ceilingPrice ?? 0;
          const isBelowCeiling = ceiling > 0 && livePrice <= ceiling;
          const isAboveCeiling = ceiling > 0 && livePrice > ceiling;

          if (ceiling <= 0) {
            return <span className="text-muted-foreground text-xs">—</span>;
          }

          return (
            <span
              className={cn(
                "text-xs font-semibold",
                isBelowCeiling
                  ? "text-accent-emerald-light"
                  : isAboveCeiling
                    ? "text-accent-red"
                    : "text-muted-foreground",
              )}
            >
              {isBelowCeiling ? t.portfolio.statusBelowCeiling : t.portfolio.statusAboveCeiling}
            </span>
          );
        },
      },
    ],
    [locale, t],
  );

  function exportToCsv() {
    const listToExport = filteredPositions.length > 0 ? filteredPositions : positions;
    if (listToExport.length === 0) return;

    const headers = [
      t.portfolio.columnAsset,
      "Nome",
      t.portfolio.columnBroker,
      t.portfolio.columnQty,
      t.portfolio.columnAvgPrice,
      t.portfolio.columnPrice,
      t.portfolio.columnTotal,
      "Moeda",
      t.portfolio.columnPnl,
      "PnL %",
      t.portfolio.columnYoc,
      t.portfolio.columnStatus,
    ];

    const rows = listToExport.map((item) => {
      const livePrice = item.livePrice ?? item.currentPrice ?? 0;
      const avgPrice = item.averagePrice ?? 0;
      const total = livePrice * item.quantity;
      const invested = avgPrice * item.quantity;
      const pnl = total - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const netAnnualDividendPerShare = netAfterTax(
        item.annualDividend || 0,
        item.type,
        item.currency,
        item.customTaxRate,
      );
      const yoc = avgPrice > 0 ? (netAnnualDividendPerShare / avgPrice) * 100 : 0;
      const ceiling = item.valuation?.activeCeiling ?? item.ceilingPrice ?? 0;
      const status = ceiling > 0
        ? livePrice <= ceiling
          ? t.portfolio.statusBelowCeiling
          : t.portfolio.statusAboveCeiling
        : "—";

      return [
        `"${item.ticker}"`,
        `"${item.name}"`,
        `"${item.broker || "—"}"`,
        item.quantity,
        avgPrice.toFixed(2),
        livePrice.toFixed(2),
        total.toFixed(2),
        item.currency,
        pnl.toFixed(2),
        `${pnlPct.toFixed(1)}%`,
        `${yoc.toFixed(2)}%`,
        `"${status}"`,
      ].join(";");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `portfolio_posicoes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="font-serif text-xl font-semibold text-foreground">
            {t.portfolio.positionsTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.portfolio.positionsSubtitle}
          </p>
        </div>

        {positions.length > 0 && (
          <button
            type="button"
            onClick={exportToCsv}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-3 hover:border-border-focus cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-accent-gold" />
            <span>{t.portfolio.exportCsv}</span>
          </button>
        )}
      </div>

      {positions.length > 0 && availableClasses.length > 0 && (
        <AssetClassFilterChips
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          availableClasses={availableClasses}
          counts={countsByClass}
          className="mb-4"
        />
      )}

      {positions.length === 0 && !isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t.portfolio.emptyPositions}</p>
      ) : (
        <DataTable<ValuedWatchlistItem>
          data={filteredPositions}
          columns={columns}
          defaultSortKey="total"
          defaultSortDirection="desc"
          isLoading={isLoading}
          onRowClick={onSelectItem}
          emptyState={
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t.dashboard?.matrix?.empty || "Nenhum ativo encontrado nessa classe."}
            </p>
          }
          keyExtractor={(item) => item.id}
          tableClassName="min-w-[950px]"
        />
      )}
    </div>
  );
}
