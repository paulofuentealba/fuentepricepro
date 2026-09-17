import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency as formatCurrencySSOT, cleanTicker } from "@/lib/formatters";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { useTransactions } from "@/lib/transactions";
import {
  calculateCorporateEventImpact,
  type CorporateEventType,
} from "@/lib/corporateEvents";
import type { ReconciledCorporateEvent } from "@/lib/api/corporateEventsReconciler.server";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface CorporateEventReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: WatchlistItem | null;
  event: ReconciledCorporateEvent | null;
  onApplied?: () => void;
}

export function CorporateEventReviewSheet({
  open,
  onOpenChange,
  item,
  event,
  onApplied,
}: CorporateEventReviewSheetProps) {
  const { t, locale } = useI18n();
  const C = t.corporateEvents;
  const { upsertAsync } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const queryClient = useQueryClient();

  const [eventType, setEventType] = useState<CorporateEventType>("split");
  const [ratioStr, setRatioStr] = useState<string>("4");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setEventType(event.type);
      if (event.type === "split") {
        setRatioStr(String(event.ratio));
      } else {
        // For grouping, show the human-readable denominator (e.g. 10 for 10:1 instead of 0.1)
        const denominator = Math.round(1 / event.ratio);
        setRatioStr(String(denominator || 10));
      }
    } else {
      setEventType("split");
      setRatioStr("4");
    }
  }, [event]);

  if (!item) return null;

  const numericInput = parseFloat(ratioStr) || 1;
  const factor = eventType === "split" ? numericInput : 1 / numericInput;
  const currentAvg = item.averagePrice ?? item.currentPrice;

  const eventDate = event?.date ?? Date.now();
  const impact = calculateCorporateEventImpact(
    item,
    { date: eventDate, type: eventType, factor },
    transactions,
    item.currentPrice,
  );
  const preview = impact.preview;
  const deltaQty = impact.deltaQuantity;
  const priceVariationPct = impact.priceVariationPct;

  const formatCurrency = (val: number) => formatCurrencySSOT(val, item.currency, locale);

  const handleConfirm = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const eventId = event?.eventId ?? `manual-${Date.now()}`;

      const newAppliedEvents = [...(item.appliedEvents || [])];
      newAppliedEvents.push({
        eventId,
        date: eventDate,
        type: eventType,
        ratio: factor,
      });

      const updatedItem: WatchlistItem = {
        ...item,
        quantity: impact.newQuantity,
        averagePrice: impact.newAveragePrice,
        appliedEvents: newAppliedEvents,
      };

      const cleanT = cleanTicker(item.ticker);
      const hasLedger = transactions.some((tx) => cleanTicker(tx.ticker) === cleanT);
      if (hasLedger) {
        await upsertTransaction({
          id: `corp-${eventId}`,
          ticker: cleanT,
          type: "corporate_action",
          date: eventDate,
          quantity: 0,
          pricePerShare: 0,
          factor,
          notes: t.transactions.corporateAction,
          fees: null,
          broker: null,
          thesisSnapshot: null,
          accountType: item.accountType ?? null,
        });
      }

      await upsertAsync(updatedItem);
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["corporateEvents"] });

      toast.success(`${item.ticker} — ${C.successMessage}`);
      onOpenChange(false);
      onApplied?.();
    } catch (e: any) {
      console.error("[CorporateEventReviewSheet] Error saving:", e);
      toast.error(e?.message || t.authModal.error);
    } finally {
      setIsSaving(false);
    }
  };

  const isConfirmed = event?.confidence === "confirmed";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl sm:rounded-t-2xl mx-auto border-t border-border/80 bg-background/95 backdrop-blur-md shadow-2xl p-6"
      >
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mb-4" />

        <SheetHeader className="text-left space-y-1 pb-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-foreground tracking-tight">
                {item.ticker}
              </span>
              {isConfirmed ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {C.confirmedBadge}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {C.singleSourceBadge}
                </span>
              )}
            </div>
            {event?.effectiveDate && (
              <span className="text-xs text-muted-foreground font-mono">
                {event.effectiveDate}
              </span>
            )}
          </div>
          <SheetTitle className="text-xl font-semibold tracking-tight">
            {C.reviewSheetTitle}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {C.reviewSheetSubtitle}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pt-4">
          {/* Radio Group for Event Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {C.eventType}
            </Label>
            <RadioGroup
              value={eventType}
              onValueChange={(val) => setEventType(val as CorporateEventType)}
              className="grid grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2 border border-border/60 rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer">
                <RadioGroupItem value="split" id="sheet-r-split" />
                <Label htmlFor="sheet-r-split" className="text-xs font-medium cursor-pointer">
                  {C.split}
                </Label>
              </div>
              <div className="flex items-center space-x-2 border border-border/60 rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer">
                <RadioGroupItem value="grouping" id="sheet-r-grouping" />
                <Label htmlFor="sheet-r-grouping" className="text-xs font-medium cursor-pointer">
                  {C.grouping}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Ratio input */}
          <div className="space-y-2">
            <Label htmlFor="sheet-ratio-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {C.ratio}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="sheet-ratio-input"
                type="number"
                step="any"
                min="1"
                value={ratioStr}
                onChange={(e) => setRatioStr(e.target.value)}
                className="font-mono tabular-nums text-base h-11"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                {eventType === "split"
                  ? C.splitHelper.replace("{{ratio}}", ratioStr)
                  : C.groupingHelper.replace("{{ratio}}", ratioStr)}
              </span>
            </div>
          </div>

          {/* Impact preview table */}
          <div className="border border-border/60 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm">
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Simulação de Impacto na Posição
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground">
                  <th className="py-2.5 px-4 text-left font-medium">{C.metric}</th>
                  <th className="py-2.5 px-4 text-right font-medium">{C.before}</th>
                  <th className="py-2.5 px-4 text-right font-medium">{C.after}</th>
                  <th className="py-2.5 px-4 text-right font-medium">{C.delta}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-mono tabular-nums">
                <tr>
                  <td className="py-2.5 px-4 text-left font-sans text-foreground font-medium">
                    {C.shares}
                  </td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">{item.quantity}</td>
                  <td className="py-2.5 px-4 text-right text-foreground font-semibold">
                    {preview.quantity}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-bold ${deltaQty >= 0 ? "text-success" : "text-warning"}`}>
                    {deltaQty >= 0 ? `+${deltaQty}` : `${deltaQty}`}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-left font-sans text-foreground font-medium">
                    {C.avgPrice}
                  </td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">
                    {formatCurrency(currentAvg)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-foreground font-semibold">
                    {formatCurrency(preview.averagePrice)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">
                    {priceVariationPct.toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-left font-sans text-foreground font-medium">
                    {C.totalInvested}
                  </td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">
                    {formatCurrency(item.quantity * currentAvg)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-foreground font-semibold">
                    {formatCurrency(preview.quantity * preview.averagePrice)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-success font-medium">
                    {C.preserved}
                  </td>
                </tr>
              </tbody>
            </table>

            {impact.eligibleQuantity < item.quantity && (
              <div className="p-3 bg-muted/30 border-t border-border/40 text-[11.5px] text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  {t.corporateEvents.eligibleSharesNote
                    ? t.corporateEvents.eligibleSharesNote
                        .replace("{{eligible}}", String(impact.eligibleQuantity))
                        .replace("{{date}}", event?.effectiveDate || "")
                    : `Aplicado apenas às ${impact.eligibleQuantity} cotas existentes na data do evento. Cotas adquiridas após o evento não sofrem alteração.`}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-11 px-4 text-xs font-medium"
            >
              {C.dismiss}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || numericInput <= 0}
              className="h-11 px-6 text-xs font-semibold bg-success hover:bg-success/90 text-success-foreground gap-2 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {C.applying}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {C.confirmModalButton}
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
