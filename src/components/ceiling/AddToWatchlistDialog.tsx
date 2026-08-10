import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Asset } from "@/lib/domain";
import { getCanonicalAnnualDividend, getAssetValuation } from "@/lib/calculations";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, displayTicker } from "@/lib/i18n";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { useAuth } from "@/lib/auth-provider";
import { useAuthModal } from "@/lib/auth-modal";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { PaywallDialog } from "../ui/PaywallDialog";

interface Props {
  asset: Asset;
  targetYield: number;
  averagePrice: number | null;
  buttonVariant?: "default" | "secondary" | "outline" | "ghost";
  buttonClassName?: string;
}

export function AddToWatchlistDialog({
  asset,
  targetYield,
  averagePrice,
  buttonVariant = "default",
  buttonClassName,
}: Props) {
  const { t } = useI18n();
  const { items, upsert } = useWatchlist();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const freeAssetLimit = useFeatureGate("freeAssetLimit") as number;
  const id = `${asset.type.toLowerCase()}:${asset.ticker}`;
  const existing = items.find((i) => i.id === id);

  const [open, setOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [quantity, setQuantity] = useState<string>("");
  const [avg, setAvg] = useState<string>("");
  const [goal, setGoal] = useState<string>("");

  const handleOpenChange = (v: boolean) => {
    if (v) {
      if (items.length >= freeAssetLimit && !existing) {
        setShowPaywall(true);
        return;
      }
      setQuantity(existing ? String(existing.quantity) : "");
      setAvg(
        existing?.averagePrice != null
          ? String(existing.averagePrice)
          : averagePrice != null
            ? String(averagePrice)
            : "",
      );
      setGoal(existing?.targetMonthlyIncome != null ? String(existing.targetMonthlyIncome) : "");
    }
    setOpen(v);
  };

  function handleSave() {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error(t.watchlist.invalidQuantity);
      return;
    }
    const avgNum = avg.trim() === "" ? null : Number(avg);
    const goalNum = goal.trim() === "" ? null : Number(goal);
    const annual = getCanonicalAnnualDividend(asset, 3);
    const val = getAssetValuation({
      targetYield,
      currentPrice: asset.currentPrice,
      avgDividend: annual,
      eps: asset.epsCurrent ?? asset.metrics?.eps ?? null,
      bvps: asset.metrics?.bvps ?? null,
      dividendCagr: asset.metrics?.dividendCagr5y ?? null,
      currency: asset.currency,
      type: asset.type,
    });
    const ceiling = val.activeCeiling;
    const margin = val.margin;

    const item: WatchlistItem = {
      id,
      ticker: asset.ticker,
      name: asset.name,
      type: asset.type,
      currency: asset.currency,
      currentPrice: asset.currentPrice,
      annualDividend: annual,
      targetYield,
      ceilingPrice: ceiling,
      safetyMargin: margin,
      quantity: qty,
      averagePrice: avgNum != null && Number.isFinite(avgNum) ? avgNum : null,
      paymentMonths: Array.isArray(asset.paymentMonths) ? asset.paymentMonths : [],
      targetMonthlyIncome:
        goalNum != null && Number.isFinite(goalNum) && goalNum > 0 ? goalNum : null,
      payoutRatio: asset.metrics?.payoutRatio ?? null,
      addedAt: existing?.addedAt ?? Date.now(),
      investingSince: existing?.investingSince ?? Date.now(),
    };
    upsert(item);
    toast.success(existing ? t.toasts.assetUpdated : t.toasts.assetAdded);
    setOpen(false);
  }

  const paywallDescription = t.watchlist.limitReachedDesc.replace("{{limit}}", String(freeAssetLimit));

  if (!user) {
    return (
      <>
        <Button
          variant={buttonVariant}
          size="sm"
          className={cn("gap-2", buttonClassName)}
          onClick={() =>
            openAuthModal({
              message: "Sign in to save this asset to your watchlist. We'll add it right after.",
              onSuccess: () => {
                if (items.length >= freeAssetLimit && !existing) {
                  setShowPaywall(true);
                } else {
                  setOpen(true);
                }
              },
            })
          }
        >
          <Bookmark className="h-4 w-4" />
          {t.watchlist.addBtn}
        </Button>
        <PaywallDialog
          open={showPaywall}
          onOpenChange={setShowPaywall}
          title={t.watchlist.limitReached}
          description={paywallDescription}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant={buttonVariant} size="sm" className={cn("gap-2", buttonClassName)}>
            <Bookmark className="h-4 w-4" />
            {existing ? t.watchlist.updateBtn : t.watchlist.addBtn}
          </Button>
        </DialogTrigger>
        <DialogContent closeLabel={t.common.close} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {existing ? t.watchlist.updateTitle : t.watchlist.addTitle} —{" "}
              {displayTicker(asset.ticker)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wl-qty">{t.watchlist.quantity}</Label>
              <Input
                id="wl-qty"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wl-avg">{t.form.avgPrice}</Label>
              <Input
                id="wl-avg"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={avg}
                onChange={(e) => setAvg(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wl-goal">{t.watchlist.targetMonthlyIncome}</Label>
              <Input
                id="wl-goal"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground">{t.watchlist.targetMonthlyIncomeHint}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.watchlist.cancel}
            </Button>
            <Button onClick={handleSave}>{t.watchlist.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PaywallDialog
        open={showPaywall}
        onOpenChange={setShowPaywall}
        title={t.watchlist.limitReached}
        description={paywallDescription}
      />
    </>
  );
}
