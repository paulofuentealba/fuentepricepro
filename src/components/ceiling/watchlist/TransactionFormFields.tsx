import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useI18n } from "@/lib/i18n-provider";
import { displayTicker, toIntlLocale } from "@/lib/i18n";
import type { WatchlistItem } from "@/lib/watchlist";
import type { Transaction } from "@/lib/transactions";
import { getQuantityAtDate } from "@/lib/transactions";
import { MaskedInput } from "../shared/MaskedInput";

interface Props {
  /** Null when no ticker has been picked yet (see `disabled`). */
  item: WatchlistItem | null;
  onSave: (tx: Transaction) => void | Promise<void>;
  existingTransactions: Transaction[];
  initialData?: Transaction | null;
  /** Called when the user cancels the form (e.g. closes the dialog). */
  onCancel?: () => void;
  /** Disables all inputs + Save button, e.g. before a ticker is picked. */
  disabled?: boolean;
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/**
 * Presentational fields for a buy/sell transaction — Type/Date/Quantity/
 * Price per share/Fees + Save/Cancel buttons. No `Dialog` of its own: the
 * caller owns the surrounding modal (see `TransactionForm.tsx` for the
 * single-form case and `NewContributionDialog.tsx` for the unified
 * search-and-form-together flow, where `item` starts `null` and the fields
 * render disabled until a ticker is picked).
 */
export function TransactionFormFields({
  item,
  onSave,
  existingTransactions,
  initialData,
  onCancel,
  disabled,
}: Props) {
  const { t, locale } = useI18n();

  // corporate_action rows are auto-generated adjustments and are not editable
  // via the buy/sell form, so they safely fall back to "buy" as the initial value.
  const [type, setType] = useState<"buy" | "sell">(
    initialData?.type === "buy" || initialData?.type === "sell" ? initialData.type : "buy",
  );
  const [date, setDate] = useState<Date | undefined>(initialData?.date ? new Date(initialData.date) : new Date());

  const [quantity, setQuantity] = useState<string>(initialData?.quantity ? String(initialData.quantity) : "");
  const [pricePerShare, setPricePerShare] = useState<string>(initialData?.pricePerShare ? String(initialData.pricePerShare) : "");
  const [fees, setFees] = useState<string>(initialData?.fees ? String(initialData.fees) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDuplicate, setPendingDuplicate] = useState<Transaction | null>(null);
  // React state updates from setIsSaving don't apply synchronously, so a
  // rapid double-click (two handleSubmit calls in the same tick, before
  // re-render) would both read isSaving=false. This ref is set immediately,
  // in the same synchronous call, to close that window.
  const savingRef = useRef(false);

  const buildTransaction = (): Transaction | null => {
    if (disabled || !item || !date) return null;

    const q = parseFloat(quantity);
    const p = parseFloat(pricePerShare);
    const f = fees ? parseFloat(fees) : 0;

    if (isNaN(q) || isNaN(p) || q <= 0 || p <= 0) return null;

    // Validation for short selling
    if (type === "sell") {
      const maxQty = getQuantityAtDate(
        existingTransactions.filter((tx) => tx.id !== initialData?.id),
        date.getTime()
      );
      if (q > maxQty) {
        alert(t.transactions.validateShort.replace("{{max}}", String(maxQty)));
        return null;
      }
    }

    return {
      id: initialData?.id ?? crypto.randomUUID(),
      ticker: item.ticker,
      type,
      date: date.getTime(),
      quantity: q,
      pricePerShare: p,
      fees: f > 0 ? f : null,
    };
  };

  // Client-side check against already-loaded transactions — not a
  // determinism/overwrite mechanism like the CSV/PDF import ID (product
  // decision: a manual entry with identical values may be a real, distinct
  // second purchase, so we warn instead of silently colliding).
  const findDuplicate = (tx: Transaction): Transaction | null =>
    existingTransactions.find(
      (existing) =>
        existing.id !== tx.id &&
        existing.ticker === tx.ticker &&
        existing.type === tx.type &&
        isSameDay(existing.date, tx.date) &&
        existing.quantity === tx.quantity &&
        existing.pricePerShare === tx.pricePerShare,
    ) ?? null;

  const persist = async (tx: Transaction) => {
    savingRef.current = true;
    setIsSaving(true);
    try {
      await onSave(tx);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const tx = buildTransaction();
    if (!tx) return;

    if (findDuplicate(tx)) {
      setPendingDuplicate(tx);
      return;
    }

    await persist(tx);
  };

  const handleConfirmDuplicate = async () => {
    if (!pendingDuplicate) return;
    const tx = pendingDuplicate;
    setPendingDuplicate(null);
    await persist(tx);
  };

  const duplicateDateLabel = pendingDuplicate
    ? new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: "medium" }).format(
        new Date(pendingDuplicate.date),
      )
    : "";

  const currencySymbol = item?.currency === "USD" ? "US$" : "R$";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.transactions.type}</Label>
          <Select value={type} onValueChange={(v: "buy"|"sell") => setType(v)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">{t.transactions.buy}</SelectItem>
              <SelectItem value="sell">{t.transactions.sell}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t.transactions.date}</Label>
          <DatePicker
            value={date}
            onChange={(d) => setDate(d)}
            placeholder={t.transactions.date}
            disabled={disabled ? true : (d) => d > new Date() || d < new Date("1990-01-01")}
            rangeMode="past"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.transactions.qty}</Label>
        <MaskedInput
          id="tx-qty"
          formatMode="numeric"
          value={quantity ? parseFloat(quantity) : null}
          onChangeValue={(v) => setQuantity(v !== undefined ? String(v) : "")}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.transactions.price}</Label>
          <MaskedInput
            id="tx-price"
            formatMode="currency"
            currencySymbol={currencySymbol}
            value={pricePerShare ? parseFloat(pricePerShare) : null}
            onChangeValue={(v) => setPricePerShare(v !== undefined ? String(v) : "")}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>{t.transactions.fees}</Label>
          <MaskedInput
            id="tx-fees"
            formatMode="currency"
            currencySymbol={currencySymbol}
            value={fees ? parseFloat(fees) : null}
            onChangeValue={(v) => setFees(v !== undefined ? String(v) : "")}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
            {t.common.cancel}
          </Button>
        )}
        <Button type="submit" disabled={disabled || isSaving || !date || !quantity || !pricePerShare}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isSaving ? t.common.saving : t.common.save}
        </Button>
      </div>

      <AlertDialog open={!!pendingDuplicate} onOpenChange={(open) => !open && setPendingDuplicate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.transactions.duplicateWarningTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.transactions.duplicateWarningDescription
                .replace("{{ticker}}", pendingDuplicate ? displayTicker(pendingDuplicate.ticker) : "")
                .replace("{{date}}", duplicateDateLabel)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={() => setPendingDuplicate(null)}>
              {t.transactions.duplicateWarningCancel}
            </AlertDialogCancel>
            <AlertDialogAction type="button" onClick={handleConfirmDuplicate}>
              {t.transactions.duplicateWarningConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
