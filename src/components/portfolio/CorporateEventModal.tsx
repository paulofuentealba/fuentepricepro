import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useI18n } from "@/lib/i18n-provider";
import { toIntlLocale } from "@/lib/i18n";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import {
  applyCorporateEvent,
  type CorporateEventType,
  type PendingCorporateEvent,
} from "@/lib/corporateEvents";
import { toast } from "sonner";
import { ArrowDown, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect } from "react";

interface CorporateEventModalProps {
  item: WatchlistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingEvent?: PendingCorporateEvent | null;
}

export function CorporateEventModal({
  item,
  open,
  onOpenChange,
  pendingEvent,
}: CorporateEventModalProps) {
  const { t, locale } = useI18n();
  const { upsertAsync } = useWatchlist();
  const [eventType, setEventType] = useState<CorporateEventType>("split");
  const [ratio, setRatio] = useState<string>("4");

  useEffect(() => {
    if (open && pendingEvent) {
      setEventType(pendingEvent.type);
      setRatio(pendingEvent.ratio.toString());
    }
  }, [open, pendingEvent]);

  if (!item) return null;

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

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
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
      await upsertAsync(updatedItem);
      toast.success(`${item.ticker} ${t.corporateEvents.successMessage}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(toIntlLocale(locale), { style: "currency", currency: item.currency }).format(val);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t.common.close}
        className="sm:max-w-md border-border/60"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {t.corporateEvents.modalTitle} - {item.ticker}
          </DialogTitle>
          <DialogDescription className="sr-only">{t.corporateEvents.modalTitle}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {pendingEvent && (
            <Alert
              variant="default"
              className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
            >
              <AlertCircle className="h-4 w-4 stroke-indigo-500" />
              <AlertDescription className="ml-2 font-medium">
                {t.publicEvents.modalAlert}
              </AlertDescription>
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

          <div className="space-y-3">
            <Label>{t.corporateEvents.ratio}</Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
            />
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
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSubmit} className="w-full sm:w-auto">
            {t.corporateEvents.applyButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
