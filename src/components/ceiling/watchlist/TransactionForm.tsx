import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n-provider";
import { displayTicker } from "@/lib/i18n";
import type { WatchlistItem } from "@/lib/watchlist";
import type { Transaction } from "@/lib/transactions";
import { TransactionFormFields } from "./TransactionFormFields";

interface Props {
  item: WatchlistItem;
  open: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  existingTransactions: Transaction[];
  initialData?: Transaction | null;
}

export function TransactionForm({ item, open, onClose, onSave, existingTransactions, initialData }: Props) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]" closeLabel={t.common.close}>
        <DialogHeader>
          <DialogTitle>
            {initialData ? t.transactions.edit : t.transactions.add} — {displayTicker(item.ticker)}
          </DialogTitle>
        </DialogHeader>

        <TransactionFormFields
          item={item}
          onSave={(tx) => {
            onSave(tx);
            onClose();
          }}
          existingTransactions={existingTransactions}
          initialData={initialData}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
