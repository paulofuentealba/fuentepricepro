import { memo, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n-provider";
import type { WatchlistItem } from "@/lib/watchlist";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { MaskedInput } from "../shared/MaskedInput";
import { ceilingPrice, safetyMargin, netAfterTax } from "@/lib/calculations";
import { displayTicker, formatCurrency, formatPercent } from "@/lib/i18n";
import { TrendingUp, Target, Wallet } from "lucide-react";
import { PriceTag } from "../shared/AssetDataDisplay";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { InvestingSinceField } from "../shared/InvestingSinceField";
import { cn } from "@/lib/utils";
import { useTransactions } from "@/lib/transactions";

interface EditItemDialogProps {
  item: ValuedWatchlistItem | null;
  onClose: () => void;
  onSave: (patch: Partial<WatchlistItem>) => void;
}

function EditItemDialogImpl({ item, onClose, onSave }: EditItemDialogProps) {
  const { t, locale } = useI18n();
  const [qty, setQty] = useState("");
  const [avg, setAvg] = useState("");
  const [goal, setGoal] = useState("");
  const [dy, setDy] = useState("");
  const [investingSince, setInvestingSince] = useState<Date | undefined>(undefined);
  const open = item !== null;
  const { transactions } = useTransactions();
  
  const tickerTxs = useMemo(() => {
    if (!item) return [];
    return transactions.filter(t => t.ticker === item.ticker);
  }, [transactions, item]);
  const hasTransactions = tickerTxs.length > 0;
  const firstTransactionDate = useMemo(() => {
    return tickerTxs.length ? Math.min(...tickerTxs.map(tx => tx.date)) : null;
  }, [tickerTxs]);

  useEffect(() => {
    if (item) {
      setQty(String(item.quantity));
      setAvg(item.averagePrice != null ? String(item.averagePrice) : "");
      setGoal(item.targetMonthlyIncome != null ? String(item.targetMonthlyIncome) : "");
      setDy(String(item.targetYield));
      setInvestingSince(item.investingSince ? new Date(item.investingSince) : undefined);
    }
  }, [item]);

  // Live Calculations for Preview
  const preview = useMemo(() => {
    if (!item) return null;

    const parsedQty = parseFloat(qty);
    const parsedAvg = parseFloat(avg);
    const parsedDy = parseFloat(dy);

    const q = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 0;
    const a = Number.isFinite(parsedAvg) && parsedAvg > 0 ? parsedAvg : null;
    const y = Number.isFinite(parsedDy) && parsedDy > 0 ? parsedDy : item.targetYield;

    const newCeiling =
      y === item.targetYield && item?.valuation
        ? item.valuation.activeCeiling
        : ceilingPrice(item.annualDividend, y);
    const newTotalCost = a != null ? a * q : 0;
    const annualIncome = item.annualDividend * q;
    const newProjectedIncome = netAfterTax(
      annualIncome,
      item.type,
      item.currency,
      item.customTaxRate,
    );
    const newYieldOnCost = a != null && a > 0 ? (item.annualDividend / a) * 100 : null;

    // Goal Projections
    const g = Number.isFinite(parseFloat(goal)) && parseFloat(goal) > 0 ? parseFloat(goal) : null;
    let sharesNeeded = null;
    let extraCapitalNeeded = null;
    let goalProgressPct = null;

    if (g != null && item.annualDividend > 0) {
      // We calculate based on net dividend to be accurate, but let's use gross for simplicity like in GoalPlanner?
      // Actually, GoalPlanner uses net dividend if applicable.
      const netAnnualPerShare = netAfterTax(
        item.annualDividend,
        item.type,
        item.currency,
        item.customTaxRate,
      );
      const targetAnnual = g * 12;
      sharesNeeded = Math.ceil(targetAnnual / netAnnualPerShare);

      const currentShares = q;
      const extraShares = Math.max(0, sharesNeeded - currentShares);
      extraCapitalNeeded = extraShares * item.currentPrice;
      goalProgressPct = Math.min(100, (currentShares / sharesNeeded) * 100);
    }

    return {
      newCeiling,
      newTotalCost,
      newProjectedIncome,
      newYieldOnCost,
      sharesNeeded,
      extraCapitalNeeded,
      goalProgressPct,
    };
  }, [item, qty, avg, dy, goal]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        closeLabel={t.common.close}
        className="sm:max-w-[700px] gap-0 p-0 overflow-hidden bg-background"
      >
        <DialogHeader className="p-6 pb-4 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2">
            {t.watchlist.updateTitle}
            {item ? (
              <span className="text-muted-foreground font-normal">
                — {displayTicker(item.ticker)}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
          {/* Inputs Section */}
          <div className="p-6 space-y-6">
            {/* My Position */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                <Wallet className="h-4 w-4" />
                {t.watchlist.editPosition}
              </h3>

              <div className="space-y-2">
                <Label htmlFor="wl-edit-qty">{t.watchlist.quantity}</Label>
                <MaskedInput
                  id="wl-edit-qty"
                  formatMode="numeric"
                  value={qty ? parseFloat(qty) : null}
                  onChangeValue={(v) => setQty(v !== undefined ? String(v) : "")}
                  autoFocus={!hasTransactions}
                  disabled={hasTransactions}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="wl-edit-avg">{t.form.avgPrice}</Label>
                  {hasTransactions && (
                    <InfoTooltip
                      content={t.transactions.calculatedFromTransactions.replace(
                        "{n}",
                        String(tickerTxs.length),
                      )}
                    />
                  )}
                </div>
                <MaskedInput
                  id="wl-edit-avg"
                  formatMode="currency"
                  currencySymbol={item?.currency === "USD" ? "US$" : "R$"}
                  value={avg ? parseFloat(avg) : null}
                  onChangeValue={(v) => setAvg(v !== undefined ? String(v) : "")}
                  disabled={hasTransactions}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wl-edit-investing-since">{t.form.investingSince}</Label>
                <InvestingSinceField
                  value={investingSince?.getTime()}
                  onChange={setInvestingSince}
                  firstTransactionDate={firstTransactionDate}
                  className="w-full justify-start"
                />
              </div>
            </div>

            {/* My Goals */}
            <div className="space-y-4 pt-2">
              <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                <Target className="h-4 w-4" />
                {t.watchlist.editGoals}
              </h3>

              <div className="space-y-2">
                <Label htmlFor="wl-edit-dy">{t.form.targetYield} (%)</Label>
                <MaskedInput
                  id="wl-edit-dy"
                  formatMode="numeric"
                  suffix=" %"
                  value={dy ? parseFloat(dy) : null}
                  onChangeValue={(v) => setDy(v !== undefined ? String(v) : "")}
                  placeholder="6"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wl-edit-goal">{t.watchlist.targetMonthlyIncome}</Label>
                <MaskedInput
                  id="wl-edit-goal"
                  formatMode="currency"
                  currencySymbol={item?.currency === "USD" ? "US$" : "R$"}
                  value={goal ? parseFloat(goal) : null}
                  onChangeValue={(v) => setGoal(v !== undefined ? String(v) : "")}
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="p-6 bg-muted/10 flex flex-col">
            <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              {t.watchlist.editPreview}
            </h3>
            <p className="text-xs text-muted-foreground mb-6">{t.watchlist.editPreviewDesc}</p>

            {preview && item && (
              <div className="space-y-4 flex-1">
                {/* Ceiling Price Preview */}
                <div className="rounded-lg border border-border/60 bg-card p-4 space-y-1">
                  <div className="text-xs text-muted-foreground uppercase">
                    {t.radar.ceilingPrice}
                  </div>
                  <div className="text-xl font-bold tabular-nums">
                    <PriceTag value={preview.newCeiling} currency={item.currency} />
                  </div>
                </div>

                {/* Total Cost & Projected Income */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase leading-tight">
                      {t.watchlist.totalCost}
                    </div>
                    <div className="font-semibold tabular-nums text-sm truncate">
                      {preview.newTotalCost > 0 ? (
                        <PriceTag value={preview.newTotalCost} currency={item.currency} />
                      ) : (
                        "N/A"
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase leading-tight">
                      {t.watchlist.projectedIncome}
                    </div>
                    <div className="font-semibold tabular-nums text-sm truncate text-success">
                      {preview.newProjectedIncome > 0 ? (
                        <PriceTag value={preview.newProjectedIncome} currency={item.currency} />
                      ) : (
                        "N/A"
                      )}
                    </div>
                  </div>
                </div>

                {/* Yield on Cost */}
                <div className="rounded-lg border border-border/60 bg-card p-4 flex items-center justify-between">
                  <div className="text-sm font-medium">{t.watchlist.yieldOnCost}</div>
                  <div className="font-bold tabular-nums">
                    {preview.newYieldOnCost != null ? (
                      formatPercent(preview.newYieldOnCost, locale)
                    ) : (
                      <span className="text-muted-foreground text-sm font-normal">N/A</span>
                    )}
                  </div>
                </div>

                {/* Goal Projection */}
                {preview.sharesNeeded != null && (
                  <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3 mt-4">
                    <div className="text-xs text-muted-foreground uppercase">
                      {t.result.goalPlannerTitle}
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {t.result.sharesNeeded.replace("{{qty}}", String(preview.sharesNeeded))}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {preview.goalProgressPct?.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${preview.goalProgressPct}%` }}
                      />
                    </div>

                    {preview.extraCapitalNeeded != null && preview.extraCapitalNeeded > 0 && (
                      <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-border/40">
                        <span className="text-muted-foreground">{t.result.capitalRequired}</span>
                        <span className="font-semibold tabular-nums">
                          <PriceTag value={preview.extraCapitalNeeded} currency={item.currency} />
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border/40 bg-muted/20 sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t.watchlist.cancel}
          </Button>
          <Button
            onClick={() => {
              const q = Number(qty);
              if (!Number.isFinite(q) || q <= 0) {
                toast.error(t.watchlist.invalidQuantity);
                return;
              }
              const a = avg.trim() === "" ? null : Number(avg);
              const g = goal.trim() === "" ? null : Number(goal);
              const y = dy.trim() === "" ? null : Number(dy);
              const patch: Partial<WatchlistItem> = {
                quantity: q,
                averagePrice: a != null && Number.isFinite(a) ? a : null,
                targetMonthlyIncome: g != null && Number.isFinite(g) && g > 0 ? g : null,
                annualDividend: item?.annualDividend, // Heal the database with the canonical value passed via props
                investingSince: firstTransactionDate ?? investingSince?.getTime() ?? item?.addedAt,
              };
              if (y != null && Number.isFinite(y) && y > 0 && item) {
                patch.targetYield = y;
                const ceiling = ceilingPrice(item.annualDividend, y);
                patch.ceilingPrice = ceiling;
                patch.safetyMargin = safetyMargin(ceiling, item.currentPrice);
              }
              onSave(patch);
            }}
          >
            {t.watchlist.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const EditItemDialog = memo(EditItemDialogImpl);
