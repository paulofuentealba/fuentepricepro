import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-provider";
import { displayTicker, toIntlLocale } from "@/lib/i18n";
import type { WatchlistItem } from "@/lib/watchlist";
import type { Transaction } from "@/lib/transactions";
import { getQuantityAtDate } from "@/lib/transactions";
import { MaskedInput } from "../shared/MaskedInput";

interface Props {
  item: WatchlistItem;
  open: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  existingTransactions: Transaction[];
  initialData?: Transaction | null;
}

export function TransactionForm({ item, open, onClose, onSave, existingTransactions, initialData }: Props) {
  const { t, locale } = useI18n();

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
    onClose();
  };

  const currencySymbol = item.currency === "USD" ? "US$" : "R$";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]" closeLabel={t.common.close}>
        <DialogHeader>
          <DialogTitle>
            {initialData ? t.transactions.edit : t.transactions.add} — {displayTicker(item.ticker)}
          </DialogTitle>
        </DialogHeader>

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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: "medium" }).format(date) : <span>{t.transactions.date}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d > new Date() || d < new Date("1990-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
            <Button type="button" variant="ghost" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={!date || !quantity || !pricePerShare}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
