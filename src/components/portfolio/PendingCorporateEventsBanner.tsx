import { useState } from "react";
import {
  usePortfolioCorporateEvents,
  type PendingPortfolioEvent,
} from "@/lib/usePortfolioCorporateEvents";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency as formatCurrencySSOT } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CorporateEventReviewSheet } from "./CorporateEventReviewSheet";
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  Calendar,
} from "lucide-react";
import type { WatchlistItem } from "@/lib/watchlist";
import type { ReconciledCorporateEvent } from "@/lib/api/corporateEventsReconciler.server";

export function PendingCorporateEventsBanner() {
  const { pendingEvents, applyEvent, applyingEventId } = usePortfolioCorporateEvents();
  const { t, locale } = useI18n();
  const C = t.corporateEvents;

  const [reviewItem, setReviewItem] = useState<{
    item: WatchlistItem;
    event: ReconciledCorporateEvent;
  } | null>(null);

  const [confirmingEvent, setConfirmingEvent] = useState<PendingPortfolioEvent | null>(null);

  if (pendingEvents.length === 0) {
    return null;
  }

  const handleFastConfirm = async () => {
    if (!confirmingEvent) return;
    await applyEvent(confirmingEvent);
    setConfirmingEvent(null);
  };

  return (
    <>
      <section aria-label={C.bannerTitle} className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-success" />
            {C.bannerTitle}
          </h2>
          <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold">
            {pendingEvents.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {pendingEvents.map((pending) => {
            const { event, item, preview, deltaQuantity, priceVariationPct, displayRatioText } =
              pending;
            const isConfirmed = event.confidence === "confirmed";
            const currentAvg = item.averagePrice ?? item.currentPrice;
            const isApplying = applyingEventId === event.eventId;

            const formatCurrency = (val: number) =>
              formatCurrencySSOT(val, item.currency, locale);

            return (
              <div
                key={event.eventId}
                className="relative overflow-hidden rounded-xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-md transition-all hover:border-border hover:shadow-md flex flex-col justify-between gap-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-bold text-foreground">
                        {item.ticker}
                      </span>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-muted/60 text-foreground border border-border/40">
                        {event.type === "split" ? C.split : C.grouping} ({displayRatioText})
                      </span>
                    </div>
                    {event.effectiveDate && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {C.effectiveDate}: {event.effectiveDate}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Trust Badge */}
                  {isConfirmed ? (
                    <span
                      title={C.confirmedBadge}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 whitespace-nowrap"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>{C.confirmedBadge}</span>
                    </span>
                  ) : (
                    <span
                      title={event.confidence === "divergent" ? C.divergentBadge : C.singleSourceBadge}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 whitespace-nowrap"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {event.confidence === "divergent" ? C.divergentBadge : C.singleSourceBadge}
                      </span>
                    </span>
                  )}
                </div>

                {/* Impact Mini-Table */}
                <div className="rounded-lg border border-border/40 bg-background/50 p-2.5 text-xs font-mono tabular-nums">
                  <div className="grid grid-cols-4 pb-1.5 mb-1.5 border-b border-border/30 text-[10.5px] font-sans font-medium text-muted-foreground">
                    <span>{C.metric}</span>
                    <span className="text-right">{C.before}</span>
                    <span className="text-right">{C.after}</span>
                    <span className="text-right">{C.delta}</span>
                  </div>

                  {/* Shares Row */}
                  <div className="grid grid-cols-4 py-0.5 items-center">
                    <span className="font-sans font-medium text-foreground text-[11.5px]">
                      {C.shares}
                    </span>
                    <span className="text-right text-muted-foreground">{item.quantity}</span>
                    <span className="text-right text-foreground font-semibold">
                      {preview.quantity}
                    </span>
                    <span
                      className={`text-right font-bold ${deltaQuantity >= 0 ? "text-success" : "text-warning"}`}
                    >
                      {deltaQuantity >= 0 ? `+${deltaQuantity}` : `${deltaQuantity}`}
                    </span>
                  </div>

                  {/* Average Price Row */}
                  <div className="grid grid-cols-4 py-0.5 items-center">
                    <span className="font-sans font-medium text-foreground text-[11.5px]">
                      {C.avgPrice}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {formatCurrency(currentAvg)}
                    </span>
                    <span className="text-right text-foreground font-semibold">
                      {formatCurrency(preview.averagePrice)}
                    </span>
                    <span className="text-right text-muted-foreground text-[11px]">
                      {priceVariationPct > 0 ? `+${priceVariationPct.toFixed(1)}%` : `${priceVariationPct.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                {/* Card Action */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {isConfirmed ? (
                    <Button
                      size="sm"
                      onClick={() => setConfirmingEvent(pending)}
                      disabled={isApplying}
                      className="h-8 px-3.5 text-xs font-semibold bg-success hover:bg-success/90 text-success-foreground gap-1.5 shadow-xs"
                    >
                      {isApplying ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {C.applying}
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          {C.fastPathButton}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewItem({ item, event })}
                      className="h-8 px-3.5 text-xs font-semibold border-warning/40 text-warning hover:bg-warning/10 gap-1.5"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      {C.slowPathButton}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Fast-Path Quick Confirmation Dialog (1 click confirm) */}
      <Dialog open={!!confirmingEvent} onOpenChange={(open) => !open && setConfirmingEvent(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border/80">
          <DialogHeader>
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/15 ring-1 ring-success/30 mb-2">
              <ShieldCheck className="h-5 w-5 text-success" />
            </div>
            <DialogTitle className="text-center text-lg font-semibold">
              {C.fastConfirmTitle}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground leading-relaxed pt-1">
              {confirmingEvent &&
                C.fastConfirmDesc
                  .replace("{{ticker}}", confirmingEvent.item.ticker)
                  .replace("{{newQty}}", String(confirmingEvent.preview.quantity))
                  .replace(
                    "{{newAvg}}",
                    formatCurrencySSOT(
                      confirmingEvent.preview.averagePrice,
                      confirmingEvent.item.currency,
                      locale,
                    ),
                  )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex sm:justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmingEvent(null)}
              className="text-xs"
            >
              {C.dismiss}
            </Button>
            <Button
              size="sm"
              onClick={handleFastConfirm}
              className="bg-success hover:bg-success/90 text-success-foreground text-xs font-semibold gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              {C.confirmModalButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slow-Path Review Sheet */}
      <CorporateEventReviewSheet
        open={!!reviewItem}
        onOpenChange={(open) => !open && setReviewItem(null)}
        item={reviewItem?.item ?? null}
        event={reviewItem?.event ?? null}
      />
    </>
  );
}
