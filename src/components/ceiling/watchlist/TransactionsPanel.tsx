import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/i18n";
import { useTransactions, recalculateHoldingFromTransactions, type Transaction } from "@/lib/transactions";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { TransactionForm } from "./TransactionForm";

export function TransactionsPanel({ item }: { item: WatchlistItem }) {
  const { t, locale } = useI18n();
  const { transactions, upsert, remove } = useTransactions();
  const { update } = useWatchlist();
  
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const tickerTxs = useMemo(() => {
    return transactions.filter(tx => tx.ticker === item.ticker).sort((a, b) => b.date - a.date);
  }, [transactions, item.ticker]);

  const { quantity, averagePrice } = useMemo(() => {
    return recalculateHoldingFromTransactions(tickerTxs);
  }, [tickerTxs]);

  const handleSave = async (tx: Transaction) => {
    await upsert(tx);
    const newTxs = [...transactions.filter(t => t.id !== tx.id), tx].filter(t => t.ticker === item.ticker);
    const { quantity, averagePrice } = recalculateHoldingFromTransactions(newTxs.sort((a, b) => b.date - a.date));
    await update(item.id, { quantity, averagePrice });
  };

  const handleDelete = async (id: string) => {
    if (confirm(t.transactions.confirmDelete)) {
      await remove(id);
      const newTxs = transactions.filter(t => t.id !== id && t.ticker === item.ticker);
      const { quantity, averagePrice } = recalculateHoldingFromTransactions(newTxs.sort((a, b) => b.date - a.date));
      await update(item.id, { quantity, averagePrice });
    }
  };

  const currencySymbol = item.currency === "USD" ? "US$" : "R$";

  return (
    <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t.transactions.title}
          </h3>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">{t.transactions.computedQty}</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">{t.transactions.computedPrice}</span>
              <span className="font-medium">
                {formatCurrency(averagePrice, item.currency, locale)}
              </span>
            </div>
          </div>
        </div>
        <Button size="sm" onClick={() => { setEditingTx(null); setIsFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          {t.transactions.add}
        </Button>
      </div>

      <div className="space-y-2 mt-4">
        {tickerTxs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">
            {t.transactions.empty}
          </div>
        ) : (
          tickerTxs.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-md border bg-card text-sm">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {tx.type === 'buy' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div>
                  <div className="font-medium">
                    {tx.type === 'buy' ? t.transactions.buy : t.transactions.sell}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(tx.date)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <div className="font-medium">{tx.quantity} {t.transactions.qtyUnit}</div>
                  <div className="text-muted-foreground text-xs">
                    {formatCurrency(tx.pricePerShare, item.currency, locale)} {t.transactions.perShare}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTx(tx); setIsFormOpen(true); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
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
