import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Building, Calendar, FileText, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n-provider";
import { KNOWN_BROKER_LABELS } from "@/lib/brokers";
import type { Transaction } from "@/lib/transactions";

interface BulkEditTransactionsModalProps {
  open: boolean;
  onClose: () => void;
  selectedTransactions: Transaction[];
  onApply: (changes: {
    broker?: string | null;
    date?: number;
    notes?: string | null;
    updateThesis?: boolean;
  }) => Promise<void>;
}

const BROKER_SUGGESTIONS = Array.from(
  new Set([
    ...Object.values(KNOWN_BROKER_LABELS),
    "Avenue",
    "Interactive Brokers",
    "Nomad",
  ])
).sort();

export function BulkEditTransactionsModal({
  open,
  onClose,
  selectedTransactions,
  onApply,
}: BulkEditTransactionsModalProps) {
  const { t } = useI18n();
  const B = t.transactionsLedger.bulkModal;

  const selectedBuyCount = useMemo(
    () => selectedTransactions.filter((t) => t.type === "buy").length,
    [selectedTransactions]
  );
  const missingThesisBuyCount = useMemo(
    () => selectedTransactions.filter((t) => t.type === "buy" && !t.thesisSnapshot).length,
    [selectedTransactions]
  );

  const [shouldChangeBroker, setShouldChangeBroker] = useState(
    missingThesisBuyCount > 0 && selectedBuyCount === selectedTransactions.length ? false : true
  );
  const [brokerValue, setBrokerValue] = useState("");
  const [clearBroker, setClearBroker] = useState(false);

  const [shouldChangeDate, setShouldChangeDate] = useState(false);
  const [dateValue, setDateValue] = useState<Date | undefined>(new Date());

  const [shouldChangeNotes, setShouldChangeNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const [shouldUpdateThesis, setShouldUpdateThesis] = useState(
    missingThesisBuyCount > 0 && selectedBuyCount === selectedTransactions.length
  );

  const [isApplying, setIsApplying] = useState(false);

  // Distinct tickers affected
  const uniqueTickers = useMemo(() => {
    const set = new Set<string>();
    for (const tx of selectedTransactions) {
      set.add(tx.ticker.toUpperCase());
    }
    return Array.from(set).sort();
  }, [selectedTransactions]);

  const handleApply = async () => {
    if (
      !shouldChangeBroker &&
      !shouldChangeDate &&
      !shouldChangeNotes &&
      !shouldUpdateThesis
    ) {
      toast.error(B.noChangesSelected);
      return;
    }

    const changes: {
      broker?: string | null;
      date?: number;
      notes?: string | null;
      updateThesis?: boolean;
    } = {};

    if (shouldChangeBroker) {
      changes.broker = clearBroker ? null : brokerValue.trim() || null;
    }

    if (shouldChangeDate && dateValue) {
      changes.date = dateValue.getTime();
    }

    if (shouldChangeNotes) {
      changes.notes = notesValue.trim() || null;
    }

    if (shouldUpdateThesis) {
      changes.updateThesis = true;
    }

    try {
      setIsApplying(true);
      await onApply(changes);
      toast.success(
        B.success.replace("{{count}}", String(selectedTransactions.length))
      );
      onClose();
    } catch (err) {
      console.error("[BulkEditTransactionsModal] Error applying changes:", err);
    } finally {
      setIsApplying(false);
    }
  };

  const isFormValid =
    shouldChangeBroker || shouldChangeDate || shouldChangeNotes || shouldUpdateThesis;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isApplying && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building className="h-5 w-5 text-accent-text" />
            {B.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {B.description.replace("{{count}}", String(selectedTransactions.length))}
          </DialogDescription>
        </DialogHeader>

        {/* Affected Assets Summary */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
          <span className="text-xs font-medium text-foreground block">
            {B.affectedAssets} ({selectedTransactions.length} transações)
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {uniqueTickers.map((ticker) => (
              <Badge key={ticker} variant="secondary" className="font-mono text-xs">
                {ticker}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-4 py-1">
          {/* 1. Alterar Corretora */}
          <div className="rounded-xl border border-border/60 p-3.5 space-y-3 bg-card">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="bulk-change-broker"
                checked={shouldChangeBroker}
                onCheckedChange={(checked) => setShouldChangeBroker(Boolean(checked))}
                disabled={isApplying}
              />
              <Label
                htmlFor="bulk-change-broker"
                className="text-xs font-semibold cursor-pointer text-foreground flex items-center gap-1.5"
              >
                <Building className="h-3.5 w-3.5 text-primary" />
                {B.changeBroker}
              </Label>
            </div>

            {shouldChangeBroker && (
              <div className="pl-6 space-y-2">
                <Input
                  value={brokerValue}
                  onChange={(e) => {
                    setBrokerValue(e.target.value);
                    if (clearBroker) setClearBroker(false);
                  }}
                  placeholder={B.brokerPlaceholder}
                  disabled={clearBroker || isApplying}
                  className="h-9 text-xs"
                  list="bulk-broker-suggestions"
                />
                <datalist id="bulk-broker-suggestions">
                  {BROKER_SUGGESTIONS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="bulk-clear-broker"
                    checked={clearBroker}
                    onCheckedChange={(checked) => {
                      setClearBroker(Boolean(checked));
                      if (checked) setBrokerValue("");
                    }}
                    disabled={isApplying}
                  />
                  <Label
                    htmlFor="bulk-clear-broker"
                    className="text-[11px] text-muted-foreground cursor-pointer font-normal"
                  >
                    {B.clearBrokerOption}
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* 2. Alterar Data */}
          <div className="rounded-xl border border-border/60 p-3.5 space-y-3 bg-card">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="bulk-change-date"
                checked={shouldChangeDate}
                onCheckedChange={(checked) => setShouldChangeDate(Boolean(checked))}
                disabled={isApplying}
              />
              <Label
                htmlFor="bulk-change-date"
                className="text-xs font-semibold cursor-pointer text-foreground flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {B.changeDate}
              </Label>
            </div>

            {shouldChangeDate && (
              <div className="pl-6">
                <DatePicker
                  value={dateValue}
                  onChange={setDateValue}
                  placeholder={B.changeDate}
                  disabled={isApplying}
                />
              </div>
            )}
          </div>

          {/* 3. Alterar Observações / Notas */}
          <div className="rounded-xl border border-border/60 p-3.5 space-y-3 bg-card">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="bulk-change-notes"
                checked={shouldChangeNotes}
                onCheckedChange={(checked) => setShouldChangeNotes(Boolean(checked))}
                disabled={isApplying}
              />
              <Label
                htmlFor="bulk-change-notes"
                className="text-xs font-semibold cursor-pointer text-foreground flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                {B.changeNotes}
              </Label>
            </div>

            {shouldChangeNotes && (
              <div className="pl-6">
                <Input
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder={B.notesPlaceholder}
                  disabled={isApplying}
                  className="h-9 text-xs"
                />
              </div>
            )}
          </div>

          {/* 4. Gerar / Atualizar Tese Fuente (ThesisSnapshot) */}
          {selectedBuyCount > 0 && (
            <div className="rounded-xl border border-accent/40 p-3.5 space-y-2 bg-accent/5">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="bulk-update-thesis"
                  checked={shouldUpdateThesis}
                  onCheckedChange={(checked) => setShouldUpdateThesis(Boolean(checked))}
                  disabled={isApplying}
                />
                <Label
                  htmlFor="bulk-update-thesis"
                  className="text-xs font-semibold cursor-pointer text-foreground flex items-center gap-1.5 flex-wrap"
                >
                  <Sparkles className="h-3.5 w-3.5 text-accent-text shrink-0" />
                  <span>{B.recalculateThesis}</span>
                  {missingThesisBuyCount > 0 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-accent/40 text-accent-text bg-accent/10">
                      {B.missingThesisBadge.replace("{{count}}", String(missingThesisBuyCount))}
                    </Badge>
                  )}
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground pl-6 leading-relaxed">
                {B.recalculateThesisDesc}
              </p>
            </div>
          )}
        </div>

        {/* Warning Alert about recalculation */}
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-[11px] text-warning/90">
          <AlertCircle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
          <span>{B.noticeRecalculation}</span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isApplying}
            className="text-xs"
          >
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={!isFormValid || isApplying}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1.5"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {B.saving}
              </>
            ) : (
              B.saveChanges.replace("{{count}}", String(selectedTransactions.length))
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
