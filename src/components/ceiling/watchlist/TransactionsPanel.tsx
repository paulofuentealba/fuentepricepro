import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Search, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, toIntlLocale } from "@/lib/i18n";
import { useTransactions, recalculateHoldingFromTransactions, recalculateInvestingSinceFromTransactions, type Transaction } from "@/lib/transactions";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { TransactionForm } from "./TransactionForm";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { cn } from "@/lib/utils";

const FILTER_THRESHOLD = 15;

export function TransactionsPanel({ item }: { item: WatchlistItem }) {
  const { t, locale } = useI18n();
  const { transactions, upsert, remove } = useTransactions();
  const { updateAsync } = useWatchlist();
  
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "buy" | "sell" | "corporate_action">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const tickerTxs = useMemo(() => {
    return transactions.filter(tx => tx.ticker === item.ticker).sort((a, b) => b.date - a.date);
  }, [transactions, item.ticker]);

  const { quantity, averagePrice } = useMemo(() => {
    return recalculateHoldingFromTransactions(tickerTxs);
  }, [tickerTxs]);

  const totalInvested = useMemo(() => {
    if (quantity > 0 && averagePrice != null && averagePrice > 0) {
      return quantity * averagePrice;
    }
    return 0;
  }, [quantity, averagePrice]);

  // Compute running balance chronologically
  const txsWithRunningBalance = useMemo(() => {
    const sortedAsc = [...tickerTxs].sort((a, b) => a.date - b.date);
    let runningQty = 0;
    const balanceMap = new Map<string, number>();

    for (const tx of sortedAsc) {
      if (tx.type === "buy") {
        runningQty += tx.quantity;
      } else if (tx.type === "sell") {
        runningQty = Math.max(0, runningQty - tx.quantity);
      } else if (tx.type === "corporate_action" && typeof tx.factor === "number" && tx.factor > 0) {
        runningQty = Math.round(runningQty * tx.factor * 1000000) / 1000000;
      }
      balanceMap.set(tx.id, runningQty);
    }

    return tickerTxs.map((tx) => ({
      ...tx,
      runningBalance: balanceMap.get(tx.id) ?? 0,
    }));
  }, [tickerTxs]);

  const filteredTxs = useMemo(() => {
    return txsWithRunningBalance.filter((tx) => {
      if (filterType !== "all" && tx.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const notesMatch = tx.notes?.toLowerCase().includes(q);
        const typeMatch = tx.type.toLowerCase().includes(q);
        const dateMatch = new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: "medium" })
          .format(tx.date)
          .toLowerCase()
          .includes(q);
        if (!notesMatch && !typeMatch && !dateMatch) return false;
      }
      return true;
    });
  }, [txsWithRunningBalance, filterType, searchQuery, locale]);

  const handleSave = async (tx: Transaction) => {
    await upsert(tx);
    const newTxs = [...transactions.filter(t => t.id !== tx.id), tx].filter(t => t.ticker === item.ticker);
    const { quantity, averagePrice } = recalculateHoldingFromTransactions(newTxs.sort((a, b) => b.date - a.date));
    const newInvestingSince = recalculateInvestingSinceFromTransactions(newTxs) ?? item.investingSince;
    await updateAsync(item.id, { quantity, averagePrice, investingSince: newInvestingSince });
  };

  const handleDelete = async (id: string) => {
    if (confirm(t.transactions.confirmDelete)) {
      await remove(id);
      const newTxs = transactions.filter(t => t.id !== id && t.ticker === item.ticker);
      const { quantity, averagePrice } = recalculateHoldingFromTransactions(newTxs.sort((a, b) => b.date - a.date));
      const newInvestingSince = recalculateInvestingSinceFromTransactions(newTxs) ?? item.investingSince;
      await updateAsync(item.id, { quantity, averagePrice, investingSince: newInvestingSince });
    }
  };

  const showFilters = tickerTxs.length >= FILTER_THRESHOLD;

  return (
    <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t.transactions.title}
          </h3>
          <div className="flex items-center gap-4 sm:gap-6 mt-2 flex-wrap">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {t.transactions.computedQty}
                <InfoTooltip content={t.tooltips?.computedQty || ""} />
              </span>
              <span className="font-medium text-foreground">{quantity}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {t.transactions.computedPrice}
                <InfoTooltip content={t.tooltips?.computedPrice || ""} />
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(averagePrice, item.currency, locale)}
              </span>
            </div>
            {totalInvested > 0 && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {t.transactions.totalInvested}
                </span>
                <span className="font-medium text-primary">
                  {formatCurrency(totalInvested, item.currency, locale)}
                </span>
              </div>
            )}
          </div>
        </div>
        <Button
          size="sm"
          className="w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold"
          onClick={() => { setEditingTx(null); setIsFormOpen(true); }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.transactions.add}
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 pt-2 border-t border-border/40">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.transactions.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background/50"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { key: "all", label: t.transactions.filterAll },
                { key: "buy", label: t.transactions.filterBuys },
                { key: "sell", label: t.transactions.filterSells },
                { key: "corporate_action", label: t.transactions.filterCorpActions },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterType(tab.key)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                  filterType === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background/40 text-muted-foreground hover:text-foreground hover:bg-background/70 border border-border/40",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 mt-3">
        {filteredTxs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-sm text-muted-foreground text-center py-8 px-4 border rounded-lg border-dashed space-y-3">
            <p>{t.transactions.empty}</p>
            <Button
              variant="outline"
              size="sm"
              className="h-11 sm:h-9 text-xs font-semibold"
              onClick={() => {
                setEditingTx(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.watchlist.manualBalanceAdjustment}
            </Button>
          </div>
        ) : (
          filteredTxs.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-md border bg-card text-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    tx.type === "corporate_action"
                      ? "bg-primary/10 text-primary"
                      : tx.type === "buy"
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                  }`}
                >
                  {tx.type === "corporate_action" ? (
                    <Scissors className="h-4 w-4" />
                  ) : tx.type === "buy" ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    <span>
                      {tx.type === "corporate_action"
                        ? t.transactions.corporateAction
                        : tx.type === "buy"
                          ? t.transactions.buy
                          : t.transactions.sell}
                    </span>
                    {tx.notes && (
                      <span className="text-[10px] text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded border border-border/40">
                        {tx.notes}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs flex items-center gap-2 mt-0.5">
                    <span>
                      {new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: "medium" }).format(tx.date)}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-[11px] text-muted-foreground/80">
                      {t.transactions.runningBalance?.replace("{balance}", String(tx.runningBalance)) ?? `Saldo: ${tx.runningBalance} cotas`}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  {tx.type === "corporate_action" ? (
                    <>
                      <div className="font-medium">
                        {typeof tx.factor === "number" && Number.isFinite(tx.factor)
                          ? `${tx.factor}×`
                          : "—"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {t.transactions.corporateAction}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium">{tx.quantity} {t.transactions.qtyUnit}</div>
                      <div className="text-muted-foreground text-xs">
                        {formatCurrency(tx.pricePerShare, item.currency, locale)} {t.transactions.perShare}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  {tx.type !== "corporate_action" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTx(tx); setIsFormOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10" onClick={() => handleDelete(tx.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isFormOpen && (
        <TransactionForm
          item={item}
          open={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingTx(null); }}
          onSave={handleSave}
          existingTransactions={tickerTxs}
          initialData={editingTx}
        />
      )}
    </div>
  );
}
