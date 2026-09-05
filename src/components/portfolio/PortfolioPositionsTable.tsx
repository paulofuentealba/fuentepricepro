import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { STICKY_FIRST_COLUMN_CLASS } from "@/components/ui/responsive-table";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { netAfterTax } from "@/lib/calculations";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioPositionsTableProps {
  valuedItems: ValuedWatchlistItem[];
  onSelectItem: (item: ValuedWatchlistItem) => void;
  isLoading: boolean;
}

export function PortfolioPositionsTable({ valuedItems, onSelectItem, isLoading }: PortfolioPositionsTableProps) {
  const { locale, t } = useI18n();

  const positions = valuedItems.filter((item) => !item.isClosedPosition);

  function exportToCsv() {
    if (positions.length === 0) return;

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

    const rows = positions.map((item) => {
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
            className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-3 hover:border-border-focus"
          >
            <Download className="h-3.5 w-3.5 text-accent-gold" />
            <span>{t.portfolio.exportCsv}</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : positions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t.portfolio.emptyPositions}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table className="min-w-[950px]">
            <TableHeader className="bg-surface-1">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className={cn(STICKY_FIRST_COLUMN_CLASS, "text-xs uppercase tracking-wider text-muted-foreground font-semibold")}>
                  {t.portfolio.columnAsset}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {t.portfolio.columnBroker}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {t.portfolio.columnQty}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {t.portfolio.columnAvgPrice}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {t.portfolio.columnPrice}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {t.portfolio.columnTotal}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {t.portfolio.columnPnl}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {t.portfolio.columnYoc}
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {t.portfolio.columnStatus}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((item) => {
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
                const isBelowCeiling = ceiling > 0 && livePrice <= ceiling;
                const isAboveCeiling = ceiling > 0 && livePrice > ceiling;

                return (
                  <TableRow
                    key={item.id}
                    className="border-border/40 hover:bg-surface-hover/80 cursor-pointer transition-colors"
                    onClick={() => onSelectItem(item)}
                  >
                    <TableCell className={cn(STICKY_FIRST_COLUMN_CLASS, "bg-inherit")}>
                      <div className="font-bold text-accent-gold text-base leading-tight">
                        {item.ticker}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.broker || "—"}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {item.quantity.toLocaleString(locale === "en" ? "en-US" : "pt-BR")}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatCurrency(avgPrice, item.currency, locale)}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {formatCurrency(livePrice, item.currency, locale)}
                    </TableCell>
                    <TableCell className="font-serif font-bold text-accent-gold">
                      {formatCurrency(total, item.currency, locale)}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="font-semibold text-accent-emerald-light">
                      {formatPercent(yoc, locale, 2)}
                    </TableCell>
                    <TableCell>
                      {ceiling > 0 ? (
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
                          {isBelowCeiling
                            ? t.portfolio.statusBelowCeiling
                            : t.portfolio.statusAboveCeiling}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
