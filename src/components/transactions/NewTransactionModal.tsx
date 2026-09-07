import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Info, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n-provider";
import { cleanTicker } from "@/lib/formatters";
import {
  useTransactions,
  recalculateHoldingFromTransactions,
  recalculateInvestingSinceFromTransactions,
  getQuantityAtDate,
  type Transaction,
  type ThesisSnapshot,
} from "@/lib/transactions";
import { useWatchlist } from "@/lib/watchlist";
import { getAssetValuation } from "@/lib/calculations";
import { KNOWN_BROKER_LABELS } from "@/lib/brokers";

interface NewTransactionModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: Transaction | null;
  existingTransactions: Transaction[];
  onSaved?: (tx: Transaction) => void;
}

const BROKER_SUGGESTIONS = Array.from(
  new Set([
    ...Object.values(KNOWN_BROKER_LABELS),
    "Avenue",
    "Interactive Brokers",
    "Nomad",
  ])
).sort();

export function NewTransactionModal({
  open,
  onClose,
  initialData,
  existingTransactions,
  onSaved,
}: NewTransactionModalProps) {
  const { t } = useI18n();
  const { upsert } = useTransactions();
  const { items: watchlistItems, updateAsync } = useWatchlist();

  const [ticker, setTicker] = useState(initialData?.ticker || "");
  const [type, setType] = useState<Transaction["type"]>(
    initialData?.type || "buy"
  );
  const [date, setDate] = useState<Date | undefined>(
    initialData?.date ? new Date(initialData.date) : new Date()
  );
  const [quantity, setQuantity] = useState(
    initialData?.quantity ? String(initialData.quantity) : ""
  );
  const [price, setPrice] = useState(
    initialData?.pricePerShare ? String(initialData.pricePerShare) : ""
  );
  const [factor, setFactor] = useState(
    initialData?.factor ? String(initialData.factor) : "1"
  );
  const [fees, setFees] = useState(
    initialData?.fees ? String(initialData.fees) : ""
  );
  const [broker, setBroker] = useState(initialData?.broker || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTicker(initialData.ticker);
        setType(initialData.type);
        setDate(new Date(initialData.date));
        setQuantity(String(initialData.quantity));
        setPrice(String(initialData.pricePerShare));
        setFactor(initialData.factor ? String(initialData.factor) : "1");
        setFees(initialData.fees ? String(initialData.fees) : "");
        setBroker(initialData.broker || "");
        setNotes(initialData.notes || "");
      } else {
        setTicker("");
        setType("buy");
        setDate(new Date());
        setQuantity("");
        setPrice("");
        setFactor("1");
        setFees("");
        setBroker("");
        setNotes("");
      }
      setIsSaving(false);
      savingRef.current = false;
    }
  }, [open, initialData]);

  const resolvedTicker = cleanTicker(ticker);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;

    if (!resolvedTicker) {
      toast.error(t.transactionsLedger.newModal.invalidTicker);
      return;
    }

    if (!date) {
      toast.error(t.transactions.date);
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.error(t.transactionsLedger.newModal.invalidQuantity);
      return;
    }

    let priceNum = parseFloat(price);
    if (type !== "corporate_action" && (isNaN(priceNum) || priceNum < 0)) {
      toast.error(t.transactionsLedger.newModal.invalidPrice);
      return;
    }
    if (type === "corporate_action") {
      priceNum = 0;
    }

    const factorNum = parseFloat(factor);
    if (type === "corporate_action" && (isNaN(factorNum) || factorNum <= 0)) {
      toast.error("Informe um fator/proporção válido e positivo para o evento corporativo.");
      return;
    }

    const feesNum = fees ? parseFloat(fees) : 0;
    const finalFees = isNaN(feesNum) || feesNum < 0 ? null : feesNum > 0 ? feesNum : null;

    // Short-selling guard for sell orders
    if (type === "sell") {
      const otherTxs = existingTransactions.filter(
        (tx) => tx.ticker === resolvedTicker && tx.id !== initialData?.id
      );
      const availableQty = getQuantityAtDate(otherTxs, date.getTime());
      if (qtyNum > availableQty) {
        toast.error(
          t.transactions?.validateShort?.replace("{{max}}", String(availableQty)) ||
            `Quantidade insuficiente em custódia na data informada (máximo: ${availableQty}).`
        );
        return;
      }
    }

    savingRef.current = true;
    setIsSaving(true);

    try {
      const matchingWatchlistItem = watchlistItems.find(
        (it) => it.ticker.toUpperCase() === resolvedTicker.toUpperCase()
      );

      let snapshot: ThesisSnapshot | null = initialData?.thesisSnapshot ?? null;

      // Auto-capture thesis for buy orders if not present
      if (type === "buy" && !snapshot) {
        if (matchingWatchlistItem) {
          try {
            const val = getAssetValuation({
              targetYield: matchingWatchlistItem.targetYield,
              currentPrice: priceNum || matchingWatchlistItem.currentPrice || 1,
              avgDividend: matchingWatchlistItem.annualDividend,
              eps: (matchingWatchlistItem as any)?.epsCurrent ?? (matchingWatchlistItem as any)?.metrics?.eps ?? null,
              bvps: (matchingWatchlistItem as any)?.metrics?.bvps ?? null,
              dividendCagr: (matchingWatchlistItem as any)?.dividendCagr5y ?? null,
              currency: matchingWatchlistItem.currency,
              type: matchingWatchlistItem.type,
            });

            const consensusPrice = val.fuenteConsensus;
            const safetyMarginVsConsensus =
              consensusPrice != null && priceNum > 0
                ? ((consensusPrice - priceNum) / priceNum) * 100
                : null;
            const dy =
              priceNum > 0 && matchingWatchlistItem.annualDividend > 0
                ? (matchingWatchlistItem.annualDividend / priceNum) * 100
                : val.dividendYield;

            snapshot = {
              consensusPrice,
              bazinPrice: val.methods.bazin,
              grahamPrice: val.methods.graham ?? val.methods.lynch ?? null,
              gordonPrice: val.methods.gordon,
              purchasePrice: priceNum,
              safetyMarginVsConsensus,
              payoutRatio: matchingWatchlistItem.payoutRatio ?? null,
              dividendYield: dy,
              dividendCagr5y: (matchingWatchlistItem as any)?.dividendCagr5y ?? null,
              piotroskiScore: (matchingWatchlistItem as any)?.piotroskiScore ?? null,
              isYieldTrap: !!val.yieldTrapWarning,
              valuationVersion: "fuente-v1",
              capturedAt: Date.now(),
              unavailableReason: consensusPrice == null ? "CONSENSUS_UNAVAILABLE" : null,
            };
          } catch {
            snapshot = {
              consensusPrice: null,
              bazinPrice: null,
              grahamPrice: null,
              gordonPrice: null,
              purchasePrice: priceNum,
              safetyMarginVsConsensus: null,
              payoutRatio: null,
              dividendYield: null,
              dividendCagr5y: null,
              piotroskiScore: null,
              isYieldTrap: null,
              valuationVersion: "fuente-v1",
              capturedAt: Date.now(),
              unavailableReason: "VALUATION_ERROR",
            };
          }
        }
      }

      const txToSave: Transaction = {
        id: initialData?.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}`),
        ticker: resolvedTicker,
        type,
        date: date.getTime(),
        quantity: qtyNum,
        pricePerShare: priceNum,
        factor: type === "corporate_action" ? factorNum : null,
        fees: finalFees,
        broker: broker.trim() || null,
        notes: notes.trim() || null,
        thesisSnapshot: snapshot,
      };

      await upsert(txToSave);

      // Recalculate portfolio position if asset is in watchlist
      const updatedTxs = [
        ...existingTransactions.filter((tx) => tx.id !== txToSave.id),
        txToSave,
      ].filter((tx) => tx.ticker === resolvedTicker);

      if (matchingWatchlistItem) {
        const { quantity: nextQty, averagePrice: nextAvgPrice } =
          recalculateHoldingFromTransactions(updatedTxs);
        const nextInvestingSince =
          recalculateInvestingSinceFromTransactions(updatedTxs) ??
          matchingWatchlistItem.investingSince;

        const isLatestTx =
          [...updatedTxs].sort((a, b) => b.date - a.date)[0]?.id === txToSave.id;

        await updateAsync(matchingWatchlistItem.id, {
          quantity: nextQty,
          averagePrice: nextAvgPrice,
          investingSince: nextInvestingSince,
          ...(txToSave.broker && (isLatestTx || !matchingWatchlistItem.broker)
            ? { broker: txToSave.broker }
            : {}),
        });
      }

      toast.success(
        initialData
          ? t.transactionsLedger.newModal.successEdit.replace("{{ticker}}", resolvedTicker)
          : t.transactionsLedger.newModal.successCreate.replace("{{ticker}}", resolvedTicker)
      );

      onSaved?.(txToSave);
      onClose();
    } catch (err) {
      console.error("[NewTransactionModal] Error saving transaction:", err);
      toast.error(t.errors?.saveTransactionFailed || "Erro ao salvar transação.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[500px]" closeLabel={t.common.close}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {initialData
              ? t.transactionsLedger.newModal.editTitle.replace(
                  "{{ticker}}",
                  initialData.ticker
                )
              : t.transactionsLedger.newModal.createTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t.transactionsLedger.newModal.createSubtitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Operation Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              {t.transactionsLedger.newModal.operationType}
            </Label>
            <Select
              value={type}
              onValueChange={(val: Transaction["type"]) => setType(val)}
              disabled={isSaving}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">{t.transactionsLedger.newModal.buy}</SelectItem>
                <SelectItem value="sell">{t.transactionsLedger.newModal.sell}</SelectItem>
                <SelectItem value="corporate_action">
                  {t.transactionsLedger.newModal.corporateAction}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Asset (Ticker) + Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                {t.transactionsLedger.newModal.ticker}
              </Label>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder={t.transactionsLedger.newModal.tickerPlaceholder}
                disabled={Boolean(initialData) || isSaving}
                className="h-9 font-mono uppercase"
                list="watchlist-tickers-list"
                required
              />
              <datalist id="watchlist-tickers-list">
                {watchlistItems.map((item) => (
                  <option key={item.id} value={item.ticker}>
                    {item.name || item.ticker}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                {t.transactionsLedger.newModal.date}
              </Label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder={t.transactionsLedger.newModal.date}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Quantity + Unit Price (or Factor) Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                {t.transactionsLedger.newModal.quantity}
              </Label>
              <Input
                type="number"
                step="any"
                min="0.000001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 100"
                disabled={isSaving}
                className="h-9 font-mono"
                required
              />
            </div>

            {type === "corporate_action" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">
                  {t.transactionsLedger.newModal.factor}
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={factor}
                  onChange={(e) => setFactor(e.target.value)}
                  placeholder="Ex: 2 (para 1:2) ou 0.5 (para 2:1)"
                  disabled={isSaving}
                  className="h-9 font-mono"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">
                  {t.transactionsLedger.newModal.price}
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 34.50"
                  disabled={isSaving}
                  className="h-9 font-mono"
                  required
                />
              </div>
            )}
          </div>

          {/* Broker + Fees Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                {t.transactionsLedger.newModal.broker}
              </Label>
              <Input
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                placeholder={t.transactionsLedger.newModal.brokerPlaceholder}
                disabled={isSaving}
                className="h-9"
                list="brokers-suggestions-list"
              />
              <datalist id="brokers-suggestions-list">
                {BROKER_SUGGESTIONS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                {t.transactionsLedger.newModal.fees}
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="Ex: 4.90"
                disabled={isSaving}
                className="h-9 font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              {t.transactionsLedger.newModal.notes}
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.transactionsLedger.newModal.notesPlaceholder}
              disabled={isSaving}
              className="h-9"
            />
          </div>

          {type === "buy" && (
            <div className="flex items-start gap-2.5 rounded-lg border border-accent/30 bg-accent/10 p-2.5 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 shrink-0 text-accent-text mt-0.5" />
              <span>{t.transactionsLedger.newModal.thesisNotice}</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              {t.transactionsLedger.newModal.cancel}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.transactionsLedger.newModal.saving}
                </>
              ) : (
                t.transactionsLedger.newModal.save
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
