import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n-provider";
import { toIntlLocale } from "@/lib/i18n";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { useTransactions } from "@/lib/transactions";
import {
  applyCorporateEvent,
  type CorporateEventType,
  type PendingCorporateEvent,
} from "@/lib/corporateEvents";
import { toast } from "sonner";
import { ArrowDown, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CorporateEventFieldsProps {
  item: WatchlistItem;
  pendingEvent?: PendingCorporateEvent | null;
  /** Called after the event is successfully applied and persisted. */
  onApplied?: () => void;
}

/**
 * Presentational + self-contained "Apply Corporate Event" form. Same
 * factor/idempotent-transaction logic that used to live in
 * CorporateEventModal's Dialog, now usable as inline content inside a
 * collapsible section with 2-step confirmation.
 */
export function CorporateEventFields({ item, pendingEvent, onApplied }: CorporateEventFieldsProps) {
  const { t, locale } = useI18n();
  const { upsertAsync } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const [eventType, setEventType] = useState<CorporateEventType>(pendingEvent?.type ?? "split");
  const [ratio, setRatio] = useState<string>(pendingEvent ? String(pendingEvent.ratio) : "4");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (pendingEvent) {
      setEventType(pendingEvent.type);
      setRatio(pendingEvent.ratio.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEvent?.eventId]);

  const numericRatio = parseFloat(ratio) || 1;
  const factor = eventType === "split" ? numericRatio : 1 / numericRatio;

  // Calculate preview using the engine
  const newPosition = applyCorporateEvent(
    {
      ticker: item.ticker,
      quantity: item.quantity,
      averagePrice: item.averagePrice ?? item.currentPrice,
    },
    { type: eventType, factor },
    true,
    item.currentPrice,
  );

  const handleSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const newAppliedEvents = [...(item.appliedEvents || [])];
      if (pendingEvent) {
        newAppliedEvents.push({
          eventId: pendingEvent.eventId,
          date: pendingEvent.date,
          type: pendingEvent.type,
          ratio: pendingEvent.ratio,
        });
      }

      const updatedItem = {
        ...item,
        quantity: newPosition.quantity,
        averagePrice: newPosition.averagePrice,
        appliedEvents: newAppliedEvents,
      };

      // If the asset uses the transaction ledger, persist an idempotent
      // corporate_action adjustment so derived positions / realized income
      // reflect the split/grouping. Only when transactions already exist —
      // otherwise the item-level update is the single source (writing a tx
      // would switch the asset onto the ledger path unexpectedly).
      const hasLedger = transactions.some((tx) => tx.ticker === item.ticker);
      if (hasLedger) {
        const eventId = pendingEvent?.eventId ?? `manual-${Date.now()}`;
        const eventDate = pendingEvent?.date ?? Date.now();
        await upsertTransaction({
          id: `corp-${eventId}`,
          ticker: item.ticker,
          type: "corporate_action",
          date: eventDate,
          quantity: 0,
          pricePerShare: 0,
          factor,
          notes: t.transactions.corporateAction,
        });
      }

      await upsertAsync(updatedItem);
      toast.success(`${item.ticker} ${t.corporateEvents.successMessage}`);
      setIsConfirmOpen(false);
      onApplied?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(toIntlLocale(locale), { style: "currency", currency: item.currency }).format(val);

  return (
    <div className="grid gap-6">
      {pendingEvent && (
        <Alert variant="default" className="bg-primary/10 text-primary border-primary/20">
          <AlertCircle className="h-4 w-4 stroke-primary" />
          <AlertDescription className="ml-2 font-medium">{t.publicEvents.modalAlert}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Label>{t.corporateEvents.eventType}</Label>
        <RadioGroup
          value={eventType}
          onValueChange={(val) => setEventType(val as CorporateEventType)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="split" id="r1" />
            <Label htmlFor="r1">{t.corporateEvents.split}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="grouping" id="r2" />
            <Label htmlFor="r2">{t.corporateEvents.grouping}</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>{t.corporateEvents.ratio}</Label>
        <Input
          type="number"
          min="1"
          step="0.01"
          value={ratio}
          onChange={(e) => setRatio(e.target.value)}
        />
        <p className="text-xs text-muted-foreground font-medium">
          {eventType === "split"
            ? t.corporateEvents.splitHelper.replace("{{ratio}}", String(numericRatio))
            : t.corporateEvents.groupingHelper.replace("{{ratio}}", String(numericRatio))}
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-5 space-y-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            {t.corporateEvents.previewOriginal}
          </span>
          <span className="text-base font-medium text-foreground">
            {t.corporateEvents.sharesAt
              .replace("{{qty}}", String(item.quantity))
              .replace("{{price}}", formatCurrency(item.averagePrice ?? item.currentPrice))}
          </span>
        </div>

        <div className="flex justify-center -my-2 relative z-10">
          <div className="bg-background rounded-full p-1 border border-border/50">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 bg-success/10 -mx-5 -mb-5 p-5 rounded-b-xl border-t border-success/20">
          <span className="text-xs text-success font-semibold uppercase tracking-wider">
            {t.corporateEvents.previewNew}
          </span>
          <span className="text-base font-bold text-success">
            {t.corporateEvents.sharesAt
              .replace("{{qty}}", String(newPosition.quantity))
              .replace("{{price}}", formatCurrency(newPosition.averagePrice))}
          </span>
          {item.ceilingPrice > 0 && (
            <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-success/20 text-xs">
              <span className="text-muted-foreground font-medium">
                {t.corporateEvents.ceilingImpactLabel}:
              </span>
              <span className="font-semibold text-foreground">
                {formatCurrency(item.ceilingPrice)} →{" "}
                {formatCurrency(
                  eventType === "split"
                    ? item.ceilingPrice / numericRatio
                    : item.ceilingPrice * numericRatio,
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={() => setIsConfirmOpen(true)} disabled={isSaving} className="w-full sm:w-auto">
          {t.corporateEvents.applyButton}
        </Button>
      </div>

      {/* 2-Step Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.corporateEvents.confirmModalTitle}</DialogTitle>
            <DialogDescription>{t.corporateEvents.confirmModalDesc}</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.corporateEvents.eventType}:</span>
              <span className="font-semibold text-foreground">
                {eventType === "split" ? t.corporateEvents.split : t.corporateEvents.grouping}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.corporateEvents.ratio}:</span>
              <span className="font-semibold text-foreground">
                {eventType === "split" ? `1 : ${numericRatio}` : `${numericRatio} : 1`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/40">
              <span className="text-muted-foreground">{t.corporateEvents.previewNew}:</span>
              <span className="font-bold text-success">
                {t.corporateEvents.sharesAt
                  .replace("{{qty}}", String(newPosition.quantity))
                  .replace("{{price}}", formatCurrency(newPosition.averagePrice))}
              </span>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSaving}
            >
              {t.common?.cancel || "Cancelar"}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {t.corporateEvents.confirmModalButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
