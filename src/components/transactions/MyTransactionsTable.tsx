import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit2,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, displayTicker, toIntlLocale } from "@/lib/i18n";
import type { Transaction } from "@/lib/transactions";

interface MyTransactionsTableProps {
  allTransactions: Transaction[];
  filteredTransactions: Transaction[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onBatchDelete: (ids: string[]) => void;
  onViewThesis: (tx: Transaction) => void;
}

const PAGE_SIZE = 25;

export function MyTransactionsTable({
  allTransactions,
  filteredTransactions,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onEdit,
  onDelete,
  onBatchDelete,
  onViewThesis,
}: MyTransactionsTableProps) {
  const { t, locale } = useI18n();
  const [currentPage, setCurrentPage] = useState(1);

  // Compute running balance per ticker across ALL transactions chronologically
  const runningBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const byTicker = new Map<string, Transaction[]>();

    for (const tx of allTransactions) {
      const list = byTicker.get(tx.ticker) || [];
      list.push(tx);
      byTicker.set(tx.ticker, list);
    }

    byTicker.forEach((txList) => {
      const sortedAsc = [...txList].sort((a, b) => a.date - b.date);
      let runningQty = 0;
      for (const tx of sortedAsc) {
        if (tx.type === "buy") {
          runningQty += tx.quantity;
        } else if (tx.type === "sell") {
          runningQty = Math.max(0, runningQty - tx.quantity);
        } else if (
          tx.type === "corporate_action" &&
          typeof tx.factor === "number" &&
          tx.factor > 0
        ) {
          runningQty = Math.round(runningQty * tx.factor * 1000000) / 1000000;
        }
        map.set(tx.id, runningQty);
      }
    });

    return map;
  }, [allTransactions]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, safeCurrentPage]);

  const pageIds = useMemo(
    () => paginatedTransactions.map((tx) => tx.id),
    [paginatedTransactions]
  );

  const areAllOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const handleHeaderCheckboxToggle = () => {
    if (areAllOnPageSelected) {
      onClearSelection();
    } else {
      onSelectAll(pageIds);
    }
  };

  const intlLocale = toIntlLocale(locale);

  if (filteredTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 py-16 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-3">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground">
          {t.transactionsLedger.table.emptyTitle}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {t.transactionsLedger.table.emptyDesc}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 animate-in fade-in-50">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
              {selectedIds.size}
            </span>
            <span>
              {selectedIds.size === 1
                ? t.transactionsLedger.batch.selectedCount.replace("{{count}}", "1")
                : t.transactionsLedger.batch.selectedCountPlural.replace(
                    "{{count}}",
                    String(selectedIds.size)
                  )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              className="h-8 text-xs"
            >
              {t.transactionsLedger.batch.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onBatchDelete(Array.from(selectedIds))}
              className="h-8 gap-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.transactionsLedger.batch.deleteSelected}
            </Button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={areAllOnPageSelected}
                    onCheckedChange={handleHeaderCheckboxToggle}
                    aria-label="Select all on page"
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.transactionsLedger.table.date}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.transactionsLedger.table.asset}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.transactionsLedger.table.type}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.transactionsLedger.table.broker}
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.transactionsLedger.table.quantity}
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.transactionsLedger.table.unitPrice}
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.transactionsLedger.table.fees}
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.transactionsLedger.table.total}
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.transactionsLedger.table.runningBalance}
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.transactionsLedger.table.thesis}
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">
                  {t.transactionsLedger.table.actions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx) => {
                const isSelected = selectedIds.has(tx.id);
                const runningQty = runningBalanceMap.get(tx.id) ?? 0;
                const formattedDate = new Intl.DateTimeFormat(intlLocale, {
                  dateStyle: "short",
                }).format(new Date(tx.date));

                let totalAmount: number | null = null;
                if (tx.type === "buy") {
                  totalAmount = tx.quantity * tx.pricePerShare + (tx.fees || 0);
                } else if (tx.type === "sell") {
                  totalAmount = tx.quantity * tx.pricePerShare - (tx.fees || 0);
                }

                return (
                  <TableRow
                    key={tx.id}
                    className={`border-border/50 transition-colors ${
                      isSelected ? "bg-accent/10 hover:bg-accent/15" : "hover:bg-muted/30"
                    }`}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(tx.id)}
                        aria-label={`Select ${tx.ticker}`}
                      />
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                      {formattedDate}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {displayTicker(tx.ticker)}
                        </span>
                        {tx.notes && (
                          <span
                            className="text-[11px] text-muted-foreground truncate max-w-[120px]"
                            title={tx.notes}
                          >
                            {tx.notes}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {tx.type === "buy" ? (
                        <Badge
                          variant="outline"
                          className="border-success/30 bg-success/10 text-success font-semibold text-[10px]"
                        >
                          {t.transactionsLedger.table.buyBadge}
                        </Badge>
                      ) : tx.type === "sell" ? (
                        <Badge
                          variant="outline"
                          className="border-danger/30 bg-danger/10 text-danger font-semibold text-[10px]"
                        >
                          {t.transactionsLedger.table.sellBadge}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 text-primary font-semibold text-[10px]"
                        >
                          {t.transactionsLedger.table.splitBadge}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {tx.broker || "—"}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-right font-mono text-xs font-medium text-foreground">
                      {tx.type === "corporate_action" ? `1:${tx.factor ?? 1}` : tx.quantity}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-right font-mono text-xs text-foreground">
                      {tx.type === "corporate_action"
                        ? "—"
                        : formatCurrency(tx.pricePerShare, "BRL", locale)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-right font-mono text-xs text-muted-foreground">
                      {tx.fees ? formatCurrency(tx.fees, "BRL", locale) : "—"}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-right font-mono text-xs font-semibold text-foreground">
                      {totalAmount != null ? formatCurrency(totalAmount, "BRL", locale) : "—"}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-right font-mono text-xs text-muted-foreground">
                      {runningQty}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-center">
                      {tx.thesisSnapshot ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewThesis(tx)}
                          className="h-7 gap-1 px-2 text-[11px] font-medium text-accent-text hover:text-accent-text hover:bg-accent/15"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>{t.transactionsLedger.table.viewThesis}</span>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(tx)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title={t.transactionsLedger.table.edit}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(tx)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title={t.transactionsLedger.table.delete}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
          <span>
            {t.transactionsLedger.table.showingCount
              .replace("{{shown}}", String(paginatedTransactions.length))
              .replace("{{total}}", String(filteredTransactions.length))}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                {t.transactionsLedger.table.previousPage}
              </Button>
              <span className="font-mono text-xs">
                {safeCurrentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="h-7 px-2 text-xs"
              >
                {t.transactionsLedger.table.nextPage}
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
