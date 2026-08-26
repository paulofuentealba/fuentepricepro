import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TickerSearchField } from "@/components/shared/TickerSearchField";
import { TransactionFormFields } from "@/components/ceiling/watchlist/TransactionFormFields";
import type { SearchHit } from "@/lib/apiService.functions";
import { assetQueryOptions } from "@/lib/queryOptions";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { useTransactions, recalculateHoldingFromTransactions, type Transaction, type ThesisSnapshot } from "@/lib/transactions";
import { buildWatchlistItem } from "@/lib/buildWatchlistItem";
import { getAssetValuation } from "@/lib/calculations";
import { useSettings } from "@/lib/settings";
import { useI18n } from "@/lib/i18n-provider";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Single-modal, single-screen "Registrar novo aporte" flow for the Horizonte
 * FI home. Ticker search and transaction fields are both visible from the
 * moment the modal opens (prompt "Modal em 1 Tela Única") — the transaction
 * fields render disabled until a ticker is picked, no step-1/step-2 swap.
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
    // New ticker: build the working draft in local state only (quantity starts at 0,
    // the transaction registered upon save is what sets the real position and writes to Firestore),
    // reusing the same builder AddToWatchlistDialog.tsx uses so the asset-creation logic isn't duplicated.
    const draft = buildWatchlistItem(assetResult.data, {
      targetYield: globalYield,
      quantity: 0,
      averagePrice: null,
    });
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

  function handleDialogOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleSaveTransaction(tx: Transaction) {
    if (!workingItem) return;

    let finalTx: Transaction = tx;
    if (tx.type === "buy" && !tx.thesisSnapshot) {
      try {
        const val = getAssetValuation({
          targetYield: workingItem.targetYield,
          currentPrice: tx.pricePerShare || workingItem.currentPrice || 1,
          avgDividend: workingItem.annualDividend,
          eps: (assetResult.data as any)?.epsCurrent ?? (assetResult.data as any)?.metrics?.eps ?? null,
          bvps: (assetResult.data as any)?.metrics?.bvps ?? null,
          dividendCagr: (assetResult.data as any)?.metrics?.dividendCagr5y ?? null,
          currency: workingItem.currency,
          type: workingItem.type,
        });

        const consensusPrice = val.fuenteConsensus;
        const safetyMarginVsConsensus =
          consensusPrice != null && tx.pricePerShare > 0
            ? ((consensusPrice - tx.pricePerShare) / tx.pricePerShare) * 100
            : null;
        const dy =
          tx.pricePerShare > 0 && workingItem.annualDividend > 0
            ? (workingItem.annualDividend / tx.pricePerShare) * 100
            : val.dividendYield;

        const snapshot: ThesisSnapshot = {
          consensusPrice,
          bazinPrice: val.methods.bazin,
          grahamPrice: val.methods.graham,
          gordonPrice: val.methods.gordon,
          purchasePrice: tx.pricePerShare,
          safetyMarginVsConsensus,
          payoutRatio: workingItem.payoutRatio ?? null,
          dividendYield: dy,
          dividendCagr5y: (assetResult.data as any)?.metrics?.dividendCagr5y ?? null,
          piotroskiScore: (assetResult.data as any)?.metrics?.piotroskiScore ?? null,
          isYieldTrap: !!val.yieldTrapWarning,
          valuationVersion: "fuente-v1",
          capturedAt: Date.now(),
          unavailableReason: consensusPrice == null ? "CONSENSUS_UNAVAILABLE" : null,
        };
        finalTx = { ...tx, thesisSnapshot: snapshot };
      } catch {
        finalTx = {
          ...tx,
          thesisSnapshot: {
            consensusPrice: null,
            bazinPrice: null,
            grahamPrice: null,
            gordonPrice: null,
            purchasePrice: tx.pricePerShare,
            safetyMarginVsConsensus: null,
            payoutRatio: null,
            dividendYield: null,
            dividendCagr5y: null,
            piotroskiScore: null,
            isYieldTrap: null,
            valuationVersion: "fuente-v1",
            capturedAt: Date.now(),
            unavailableReason: "VALUATION_ERROR",
          },
        };
      }
    }

    await upsertTransaction(finalTx);
    const newTxs = [...transactions.filter((t) => t.id !== finalTx.id), finalTx].filter(
      (t) => t.ticker === workingItem.ticker,
    );
    const { quantity, averagePrice } = recalculateHoldingFromTransactions(
      newTxs.sort((a, b) => b.date - a.date),
    );
    upsertWatchlistItem({ ...workingItem, quantity, averagePrice });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[425px]" closeLabel={t.common.close}>
        <DialogHeader>
          <DialogTitle>{t.transactions.newContributionTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <TickerSearchField onPick={setPickedHit} autoFocus />

          <TransactionFormFields
            key={workingItem?.ticker ?? "empty"}
            item={workingItem}
            onSave={handleSaveTransaction}
            existingTransactions={tickerTxs}
            disabled={!workingItem}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
