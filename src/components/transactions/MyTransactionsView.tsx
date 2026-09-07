import { useState, useMemo } from "react";
import { Plus, Download, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n-provider";
import { buildTransactionsCsv, downloadCsv } from "@/lib/csv";
import {
  useTransactions,
  recalculateHoldingFromTransactions,
  recalculateInvestingSinceFromTransactions,
  type Transaction,
} from "@/lib/transactions";
import { useWatchlist } from "@/lib/watchlist";
import { MyTransactionsKpis } from "./MyTransactionsKpis";
import { MyTransactionsTable } from "./MyTransactionsTable";
import { NewTransactionModal } from "./NewTransactionModal";
import { ThesisSnapshotModal } from "./ThesisSnapshotModal";

export function MyTransactionsView() {
  const { t } = useI18n();
  const { transactions, isLoading, remove } = useTransactions();
  const { items: watchlistItems, updateAsync } = useWatchlist();

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "buy" | "sell" | "corporate_action"
  >("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "year" | "30d">("all");
  const [brokerFilter, setBrokerFilter] = useState<string>("all");

  // Selection & modals state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [viewingThesisTx, setViewingThesisTx] = useState<Transaction | null>(null);

  // Deletion confirmations
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [batchToDeleteIds, setBatchToDeleteIds] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract unique brokers for filter dropdown
  const uniqueBrokers = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) {
      if (tx.broker && tx.broker.trim()) {
        set.add(tx.broker.trim());
      }
    }
    return Array.from(set).sort();
  }, [transactions]);

  // Filtered transactions (ordered chronologically descending for display)
  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    return [...transactions]
      .sort((a, b) => b.date - a.date)
      .filter((tx) => {
        // Type filter
        if (typeFilter !== "all" && tx.type !== typeFilter) {
          return false;
        }

        // Period filter
        if (periodFilter === "year" && tx.date < startOfYear) {
          return false;
        }
        if (periodFilter === "30d" && tx.date < thirtyDaysAgo) {
          return false;
        }

        // Broker filter
        if (brokerFilter !== "all") {
          if (!tx.broker || tx.broker.trim() !== brokerFilter) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTicker = tx.ticker.toLowerCase().includes(q);
          const matchBroker = tx.broker?.toLowerCase().includes(q);
          const matchNotes = tx.notes?.toLowerCase().includes(q);
          if (!matchTicker && !matchBroker && !matchNotes) {
            return false;
          }
        }

        return true;
      });
  }, [transactions, typeFilter, periodFilter, brokerFilter, searchQuery]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Export CSV
  const handleExportCsv = () => {
    const listToExport =
      filteredTransactions.length > 0 ? filteredTransactions : transactions;
    if (listToExport.length === 0) {
      toast.info(t.toasts?.emptyTransactionsExport || "Nenhuma transação para exportar.");
      return;
    }

    try {
      const csv = buildTransactionsCsv(listToExport);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadCsv(`extrato-transacoes-${dateStr}.csv`, csv);
      toast.success(
        t.toasts?.exportSuccess?.replace("{{count}}", String(listToExport.length)) ||
          `Exportação concluída com ${listToExport.length} transações!`
      );
    } catch (err) {
      console.error("[MyTransactionsView] CSV Export error:", err);
      toast.error(t.toasts?.exportFailed || "Erro ao exportar CSV.");
    }
  };

  // Single transaction delete
  const handleConfirmSingleDelete = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      await remove(txToDelete.id);

      const remainingTxs = transactions.filter(
        (t) => t.id !== txToDelete.id && t.ticker === txToDelete.ticker
      );
      const matchingWatchlistItem = watchlistItems.find(
        (it) => it.ticker.toUpperCase() === txToDelete.ticker.toUpperCase()
      );

      if (matchingWatchlistItem) {
        const { quantity, averagePrice } = recalculateHoldingFromTransactions(
          remainingTxs.sort((a, b) => b.date - a.date)
        );
        const investingSince =
          recalculateInvestingSinceFromTransactions(remainingTxs) ??
          matchingWatchlistItem.investingSince;

        await updateAsync(matchingWatchlistItem.id, {
          quantity,
          averagePrice,
          investingSince,
        });
      }

      toast.success(t.transactionsLedger.newModal.successDelete);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(txToDelete.id);
        return next;
      });
    } catch (err) {
      console.error("[MyTransactionsView] Delete error:", err);
      toast.error(t.errors?.deleteTransactionFailed || "Erro ao excluir transação.");
    } finally {
      setIsDeleting(false);
      setTxToDelete(null);
    }
  };

  // Batch delete
  const handleConfirmBatchDelete = async () => {
    if (!batchToDeleteIds || batchToDeleteIds.length === 0) return;
    setIsDeleting(true);
    try {
      const idsToDelete = new Set(batchToDeleteIds);
      const affectedTickers = new Set<string>();

      for (const tx of transactions) {
        if (idsToDelete.has(tx.id)) {
          affectedTickers.add(tx.ticker);
          await remove(tx.id);
        }
      }

      // Recalculate each affected ticker in watchlist
      for (const ticker of affectedTickers) {
        const remainingTxs = transactions.filter(
          (t) => !idsToDelete.has(t.id) && t.ticker === ticker
        );
        const matchingWatchlistItem = watchlistItems.find(
          (it) => it.ticker.toUpperCase() === ticker.toUpperCase()
        );

        if (matchingWatchlistItem) {
          const { quantity, averagePrice } = recalculateHoldingFromTransactions(
            remainingTxs.sort((a, b) => b.date - a.date)
          );
          const investingSince =
            recalculateInvestingSinceFromTransactions(remainingTxs) ??
            matchingWatchlistItem.investingSince;

          await updateAsync(matchingWatchlistItem.id, {
            quantity,
            averagePrice,
            investingSince,
          });
        }
      }

      toast.success(
        t.transactionsLedger.newModal.successBatchDelete.replace(
          "{{count}}",
          String(batchToDeleteIds.length)
        )
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error("[MyTransactionsView] Batch delete error:", err);
      toast.error(t.errors?.deleteTransactionFailed || "Erro ao excluir transações.");
    } finally {
      setIsDeleting(false);
      setBatchToDeleteIds(null);
    }
  };

  const matchingWatchlistForThesis = watchlistItems.find(
    (it) => it.ticker.toUpperCase() === viewingThesisTx?.ticker.toUpperCase()
  );

  return (
    <div className="space-y-6">
      {/* Header with Title and Primary Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {t.transactionsLedger.pageTitle}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {t.transactionsLedger.pageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isLoading || transactions.length === 0}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t.transactionsLedger.exportBtn}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingTx(null);
              setIsNewModalOpen(true);
            }}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.transactionsLedger.registerBtn}</span>
          </Button>
        </div>
      </div>

      {/* 4 KPIs Summary Cards */}
      <MyTransactionsKpis transactions={transactions} />

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.transactionsLedger.filters.searchPlaceholder}
            className="h-9 pl-9 text-xs"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <Select
            value={typeFilter}
            onValueChange={(val: "all" | "buy" | "sell" | "corporate_action") =>
              setTypeFilter(val)
            }
          >
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.transactionsLedger.filters.all}</SelectItem>
              <SelectItem value="buy">{t.transactionsLedger.filters.buys}</SelectItem>
              <SelectItem value="sell">{t.transactionsLedger.filters.sells}</SelectItem>
              <SelectItem value="corporate_action">
                {t.transactionsLedger.filters.corporateActions}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Period Filter */}
          <Select
            value={periodFilter}
            onValueChange={(val: "all" | "year" | "30d") => setPeriodFilter(val)}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.transactionsLedger.filters.allPeriods}</SelectItem>
              <SelectItem value="year">{t.transactionsLedger.filters.currentYear}</SelectItem>
              <SelectItem value="30d">{t.transactionsLedger.filters.last30Days}</SelectItem>
            </SelectContent>
          </Select>

          {/* Broker Filter */}
          {uniqueBrokers.length > 0 && (
            <Select
              value={brokerFilter}
              onValueChange={(val) => setBrokerFilter(val)}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t.transactionsLedger.filters.allBrokers}
                </SelectItem>
                {uniqueBrokers.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Main Ledger Table */}
      <MyTransactionsTable
        allTransactions={transactions}
        filteredTransactions={filteredTransactions}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onEdit={(tx) => {
          setEditingTx(tx);
          setIsNewModalOpen(true);
        }}
        onDelete={(tx) => setTxToDelete(tx)}
        onBatchDelete={(ids) => setBatchToDeleteIds(ids)}
        onViewThesis={(tx) => setViewingThesisTx(tx)}
      />

      {/* Create / Edit Transaction Modal */}
      <NewTransactionModal
        open={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setEditingTx(null);
        }}
        initialData={editingTx}
        existingTransactions={transactions}
      />

      {/* View Thesis Snapshot Modal */}
      {viewingThesisTx && (
        <ThesisSnapshotModal
          open={Boolean(viewingThesisTx)}
          onClose={() => setViewingThesisTx(null)}
          snapshot={viewingThesisTx.thesisSnapshot}
          ticker={viewingThesisTx.ticker}
          currency={matchingWatchlistForThesis?.currency || "BRL"}
        />
      )}

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(txToDelete)}
        onOpenChange={(open) => !open && !isDeleting && setTxToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.transactionsLedger.table.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.transactionsLedger.table.confirmDelete}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t.common?.cancel || "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSingleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.transactionsLedger.table.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(batchToDeleteIds && batchToDeleteIds.length > 0)}
        onOpenChange={(open) =>
          !open && !isDeleting && setBatchToDeleteIds(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.transactionsLedger.batch.deleteSelected}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.transactionsLedger.batch.confirmBatchDelete.replace(
                "{{count}}",
                String(batchToDeleteIds?.length || 0)
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t.transactionsLedger.batch.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBatchDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.transactionsLedger.batch.deleteSelected}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
