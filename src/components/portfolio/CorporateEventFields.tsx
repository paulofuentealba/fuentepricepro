import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency as formatCurrencySSOT } from "@/lib/formatters";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { useTransactions } from "@/lib/transactions";
import {
  applyCorporateEvent,
  type PendingCorporateEvent,
} from "@/lib/corporateEvents";
import { toast } from "sonner";
import { ArrowDown, AlertCircle, Calendar, Scissors, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface CorporateEventFieldsProps {
  item: WatchlistItem;
  pendingEvent?: PendingCorporateEvent | null;
  /** Called after the event is successfully applied and persisted. */
  onApplied?: () => void;
}

/**
 * Presentational + self-contained corporate event viewer for a specific asset.
 * Displays only the detected pertinent event for this holding, eliminating arbitrary
 * manual event creation, and allows applying with 2-step confirmation.
 */
export function CorporateEventFields({ item, pendingEvent, onApplied }: CorporateEventFieldsProps) {
  const { t, locale } = useI18n();
  const { upsertAsync } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!pendingEvent) {
    return null;
  }

  const eventType = pendingEvent.type;
  const rawRatio = pendingEvent.ratio || 1;
  const factor = eventType === "split" ? rawRatio : (rawRatio < 1 ? rawRatio : 1 / rawRatio);
  const cleanRatio = eventType === "split" ? rawRatio : (rawRatio < 1 ? Math.round(1 / rawRatio) : rawRatio);
  const displayRatio = eventType === "split" ? `1 : ${cleanRatio}` : `${cleanRatio} : 1`;

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
      newAppliedEvents.push({
        eventId: pendingEvent.eventId,
        date: pendingEvent.date,
        type: pendingEvent.type,
        ratio: pendingEvent.ratio,
      });

      const updatedItem = {
        ...item,
        quantity: newPosition.quantity,
        averagePrice: newPosition.averagePrice,
        appliedEvents: newAppliedEvents,
      };

      // If the asset uses the transaction ledger, persist an idempotent
      // corporate_action adjustment so derived positions / realized income
      // reflect the split/grouping.
      const hasLedger = transactions.some((tx) => tx.ticker === item.ticker);
      if (hasLedger) {
        const eventId = pendingEvent.eventId;
        const eventDate = pendingEvent.date || Date.now();
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

  const formatCurrency = (val: number) => formatCurrencySSOT(val, item.currency, locale);

  const formattedDate = pendingEvent.date
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR", {
        dateStyle: "medium",
      }).format(new Date(pendingEvent.date))
    : null;

  return (
    <div className="grid gap-5">
      {/* Event Details Header */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border",
                eventType === "split"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-warning/10 text-warning border-warning/30",
              )}
            >
              <Scissors className="h-3.5 w-3.5" />
              {eventType === "split" ? t.corporateEvents.split : t.corporateEvents.grouping}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-muted border border-border/60 text-foreground">
              {displayRatio}
            </span>
          </div>

          {/* Validation Status Badge */}
          {(pendingEvent.confidence === "confirmed" || pendingEvent.status === "confirmed") && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success border border-success/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.corporateEvents.confirmedBadge}
            </span>
          )}
          {(pendingEvent.confidence === "single_source" || pendingEvent.status === "unconfirmed") && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/30">
              <AlertCircle className="h-3.5 w-3.5" />
              {t.corporateEvents.singleSourceBadge}
            </span>
          )}
          {(pendingEvent.confidence === "divergent" || pendingEvent.status === "divergent") && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/15 text-destructive border border-destructive/30">
              <AlertCircle className="h-3.5 w-3.5" />
              {t.corporateEvents.divergentBadge}
            </span>
          )}
        </div>

        <div className="space-y-1 text-xs">
          <p className="font-medium text-foreground">
            {eventType === "split"
              ? t.corporateEvents.splitHelper.replace("{{ratio}}", String(cleanRatio))
              : t.corporateEvents.groupingHelper.replace("{{ratio}}", String(cleanRatio))}
          </p>
          {formattedDate && (
            <p className="text-muted-foreground flex items-center gap-1.5 pt-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{t.corporateEvents.effectiveDate}:</span>
              <span className="font-medium text-foreground">{formattedDate}</span>
            </p>
          )}
        </div>
      </div>

      {/* Position Impact Preview Card */}
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
          <span className="text-base font-bold text-success font-mono">
            {t.corporateEvents.sharesAt
              .replace("{{qty}}", String(newPosition.quantity))
              .replace("{{price}}", formatCurrency(newPosition.averagePrice))}
          </span>
          {item.ceilingPrice > 0 && (
            <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-success/20 text-xs">
              <span className="text-muted-foreground font-medium">
                {t.corporateEvents.ceilingImpactLabel}:
              </span>
              <span className="font-semibold text-foreground font-mono">
                {formatCurrency(item.ceilingPrice)} → {formatCurrency(item.ceilingPrice / factor)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-1">
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
              <span className="font-semibold text-foreground font-mono">{displayRatio}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/40">
              <span className="text-muted-foreground">{t.corporateEvents.previewNew}:</span>
              <span className="font-bold text-success font-mono">
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
