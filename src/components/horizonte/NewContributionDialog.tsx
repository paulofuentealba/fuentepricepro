import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TickerSearchField } from "@/components/shared/TickerSearchField";
import { TransactionFormFields } from "@/components/ceiling/watchlist/TransactionFormFields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { SearchHit } from "@/lib/apiService.functions";
import { assetQueryOptions } from "@/lib/queryOptions";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { useTransactions, recalculateHoldingFromTransactions, type Transaction } from "@/lib/transactions";
import { buildWatchlistItem } from "@/lib/buildWatchlistItem";
import { useSettings } from "@/lib/settings";
import { useI18n } from "@/lib/i18n-provider";
import { displayTicker } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Single-modal "Registrar novo aporte" flow for the Horizonte FI home
 * (prompt "Horizonte FI Fase 2", complemento ao Ponto 2; unificado num único
 * Dialog persistente no prompt "Unificar Modal Registrar Aporte" — o Dialog
 * nunca desmonta entre os passos, só o conteúdo interno muda).
 *
 * Combines ticker search (TickerSearchField, shared with the Screener's
 * AssetForm.tsx) with the transaction form fields already used to edit a
 * position (TransactionFormFields.tsx, shared with TransactionForm.tsx /
 * TransactionsPanel.tsx) — no new asset-creation or search logic is
 * introduced here, both are reused as-is.
 */
export function NewContributionDialog({ open, onOpenChange }: Props) {
  const { t } = useI18n();
  const { targetYield: globalYield } = useSettings();
  const { items, upsert: upsertWatchlistItem } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();

  const [pickedHit, setPickedHit] = useState<SearchHit | null>(null);
  const [workingItem, setWorkingItem] = useState<WatchlistItem | null>(null);

  const assetResult = useQuery({
    ...assetQueryOptions(pickedHit?.ticker ?? ""),
    enabled: !!pickedHit?.ticker,
  });

  const existingItem = useMemo(
    () => (pickedHit ? items.find((i) => i.ticker === pickedHit.ticker) ?? null : null),
    [items, pickedHit],
  );

  useEffect(() => {
    if (!pickedHit || !assetResult.data) return;
    if (existingItem) {
      setWorkingItem(existingItem);
      return;
    }
    if (workingItem && workingItem.ticker === pickedHit.ticker) return;
    // New ticker: create the watchlist item now (quantity starts at 0 — the
    // transaction registered right after is what sets the real position),
    // reusing the same builder AddToWatchlistDialog.tsx uses so the
    // asset-creation logic isn't duplicated.
    const draft = buildWatchlistItem(assetResult.data, {
      targetYield: globalYield,
      quantity: 0,
      averagePrice: null,
    });
    upsertWatchlistItem(draft);
    setWorkingItem(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedHit, assetResult.data, existingItem]);

  const tickerTxs = useMemo(
    () => (workingItem ? transactions.filter((tx) => tx.ticker === workingItem.ticker) : []),
    [transactions, workingItem],
  );

  function reset() {
    setPickedHit(null);
    setWorkingItem(null);
  }

  // Reopens the ticker search step without closing the surrounding Dialog.
  function handleChangeTicker() {
    setPickedHit(null);
    setWorkingItem(null);
  }

  function handleDialogOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleSaveTransaction(tx: Transaction) {
    if (!workingItem) return;
    await upsertTransaction(tx);
    const newTxs = [...transactions.filter((t) => t.id !== tx.id), tx].filter(
      (t) => t.ticker === workingItem.ticker,
    );
    const { quantity, averagePrice } = recalculateHoldingFromTransactions(
      newTxs.sort((a, b) => b.date - a.date),
    );
    upsertWatchlistItem({ ...workingItem, quantity, averagePrice });
    reset();
    onOpenChange(false);
  }

  const title = pickedHit
    ? `${t.transactions.newContributionTitle} — ${displayTicker(pickedHit.ticker)}`
    : t.transactions.newContributionTitle;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[425px]" closeLabel={t.common.close}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {!workingItem ? (
          <div className="py-4">
            <TickerSearchField onPick={setPickedHit} autoFocus />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t.form.ticker}
              </Label>
              <div className="flex h-11 items-center justify-between rounded-md border border-border bg-muted/40 px-3">
                <span className="text-sm font-medium text-foreground">
                  {displayTicker(workingItem.ticker)}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={handleChangeTicker}>
                  {t.common.change}
                </Button>
              </div>
            </div>

            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <TransactionFormFields
                item={workingItem}
                onSave={handleSaveTransaction}
                existingTransactions={tickerTxs}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
