import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useI18n } from "@/lib/i18n-provider";
import type { WatchlistItem } from "@/lib/watchlist";
import type { Transaction } from "@/lib/transactions";
import { getQuantityAtDate } from "@/lib/transactions";
import { MaskedInput } from "../shared/MaskedInput";

interface Props {
  item: WatchlistItem;
  onSave: (tx: Transaction) => void;
  existingTransactions: Transaction[];
  initialData?: Transaction | null;
  /** Called when the user cancels the form (e.g. closes the dialog). */
  onCancel?: () => void;
}

/**
 * Presentational fields for a buy/sell transaction — Type/Date/Quantity/
 * Price per share/Fees + Save/Cancel buttons. No `Dialog` of its own: the
 * caller owns the surrounding modal (see `TransactionForm.tsx` for the
 * single-form case and `NewContributionDialog.tsx` for the unified
 * search-then-form flow).
 */
export function TransactionFormFields({ item, onSave, existingTransactions, initialData, onCancel }: Props) {
  const { t } = useI18n();

  const [type, setType] = useState<"buy" | "sell">(initialData?.type ?? "buy");
  const [date, setDate] = useState<Date | undefined>(initialData?.date ? new Date(initialData.date) : new Date());

  const [quantity, setQuantity] = useState<string>(initialData?.quantity ? String(initialData.quantity) : "");
  const [pricePerShare, setPricePerShare] = useState<string>(initialData?.pricePerShare ? String(initialData.pricePerShare) : "");
  const [fees, setFees] = useState<string>(initialData?.fees ? String(initialData.fees) : "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    const q = parseFloat(quantity);
    const p = parseFloat(pricePerShare);
    const f = fees ? parseFloat(fees) : 0;

    if (isNaN(q) || isNaN(p) || q <= 0 || p <= 0) return;

    // Validation for short selling
    if (type === "sell") {
      const maxQty = getQuantityAtDate(
        existingTransactions.filter((tx) => tx.id !== initialData?.id),
        date.getTime()
      );
      if (q > maxQty) {
        alert(t.transactions.validateShort.replace("{{max}}", String(maxQty)));
        return;
      }
    }

    const tx: Transaction = {
      id: initialData?.id ?? crypto.randomUUID(),
      ticker: item.ticker,
      type,
      date: date.getTime(),
      quantity: q,
      pricePerShare: p,
      fees: f > 0 ? f : null,
    };

    onSave(tx);
  };

  const currencySymbol = item.currency === "USD" ? "US$" : "R$";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.transactions.type}</Label>
          <Select value={type} onValueChange={(v: "buy"|"sell") => setType(v)}>
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
            disabled={(d) => d > new Date() || d < new Date("1990-01-01")}
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
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.common.cancel}
          </Button>
        )}
        <Button type="submit" disabled={!date || !quantity || !pricePerShare}>
          {t.common.save}
        </Button>
      </div>
    </form>
  );
}
