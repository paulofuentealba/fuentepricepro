import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n-provider";
import type { WatchlistItem } from "@/lib/watchlist";
import { useWatchlist } from "@/lib/watchlist";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { MaskedInput } from "../shared/MaskedInput";
import { ceilingPrice, getAssetValuation, netAfterTax, yieldOnCost, GORDON_TERMINAL_GROWTH_RATE } from "@/lib/calculations";
import { ipcaFiveYearAverageQueryOptions } from "@/lib/queryOptions";
import { formatPercent } from "@/lib/i18n";
import { TrendingUp, Target, Wallet } from "lucide-react";
import { PriceTag } from "../shared/AssetDataDisplay";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { InvestingSinceField } from "../shared/InvestingSinceField";
import { useTransactions, recalculateHoldingFromTransactions, type Transaction } from "@/lib/transactions";

interface EditPositionFieldsProps {
  item: ValuedWatchlistItem;
}

/**
 * Presentational + self-contained "Update Holdings" form. Renders the same
 * fields/preview/persistence logic that used to live in EditItemDialog's
 * modal, but as inline content usable inside a collapsible section (no
 * Dialog chrome). Mirrors CorporateEventFields' pattern of owning its own
 * data hooks instead of relying on a parent-supplied onSave callback.
 */
export function EditPositionFields({ item }: EditPositionFieldsProps) {
  const { t, locale } = useI18n();
  const { updateAsync } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const { data: ipcaAvg } = useQuery(ipcaFiveYearAverageQueryOptions());

  const [qty, setQty] = useState("");
  const [avg, setAvg] = useState("");
  const [goal, setGoal] = useState("");
  const [dy, setDy] = useState("");
  const [investingSince, setInvestingSince] = useState<Date | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const tickerTxs = useMemo(() => {
    return transactions.filter((tx) => tx.ticker === item.ticker);
  }, [transactions, item.ticker]);
  const hasTransactions = tickerTxs.length > 0;
  const firstTransactionDate = useMemo(() => {
    return tickerTxs.length ? Math.min(...tickerTxs.map((tx) => tx.date)) : null;
  }, [tickerTxs]);

  useEffect(() => {
    setQty(String(item.quantity));
    setAvg(item.averagePrice != null ? String(item.averagePrice) : "");
    setGoal(item.targetMonthlyIncome != null ? String(item.targetMonthlyIncome) : "");
    setDy(String(item.targetYield));
    setInvestingSince(item.investingSince ? new Date(item.investingSince) : undefined);
    // Reset the "saving" guard whenever the underlying item changes so a
    // stale disabled state can't linger across items.
    setIsSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  // Live Calculations for Preview
  const preview = useMemo(() => {
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
    const newYieldOnCost = yieldOnCost(item.annualDividend, a);

    // Goal Projections
    const g = Number.isFinite(parseFloat(goal)) && parseFloat(goal) > 0 ? parseFloat(goal) : null;
    let sharesNeeded = null;
    let extraCapitalNeeded = null;
    let goalProgressPct = null;

    if (g != null && item.annualDividend > 0) {
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

  const handleSave = async () => {
    if (isSaving) return;
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error(t.watchlist.invalidQuantity);
      return;
    }
    setIsSaving(true);
    try {
      const a = avg.trim() === "" ? null : Number(avg);
      const g = goal.trim() === "" ? null : Number(goal);
      const y = dy.trim() === "" ? null : Number(dy);
      const patch: Partial<WatchlistItem> = {
        quantity: q,
        averagePrice: a != null && Number.isFinite(a) ? a : null,
        targetMonthlyIncome: g != null && Number.isFinite(g) && g > 0 ? g : null,
        annualDividend: item.annualDividend, // Heal the database with the canonical value passed via props
        investingSince: firstTransactionDate ?? investingSince?.getTime() ?? item.addedAt,
      };
      if (y != null && Number.isFinite(y) && y > 0) {
        patch.targetYield = y;
        if (y === item.targetYield && item.valuation) {
          patch.ceilingPrice = item.valuation.activeCeiling;
          patch.safetyMargin = item.valuation.margin;
        } else {
          const val = getAssetValuation({
            targetYield: y,
            currentPrice: item.currentPrice,
            avgDividend: item.annualDividend,
            terminalGrowthRate: ipcaAvg ?? GORDON_TERMINAL_GROWTH_RATE,
            currency: item.currency,
            type: item.type,
          });
          patch.ceilingPrice = val.activeCeiling;
          patch.safetyMargin = val.margin;
        }
      }

      // Maintain fallback document patch on WatchlistItem
      await updateAsync(item.id, patch);

      const targetQty = patch.quantity ?? item.quantity;
      const targetAvgPrice = patch.averagePrice ?? item.averagePrice;

      if (targetQty != null && targetQty >= 0) {
        const existingAssetTxs = transactions.filter((tx) => tx.ticker === item.ticker);
        const currentHolding = recalculateHoldingFromTransactions(existingAssetTxs);
        const currentQty = currentHolding.quantity;
        const currentAvgPrice = currentHolding.averagePrice;

        const delta = targetQty - currentQty;
        const txTimestamp = Date.now();
        const noteText = t.transactions.manualAdjustment;

        if (existingAssetTxs.length === 0 && targetQty > 0) {
          const txDate = patch.investingSince ?? item.investingSince ?? txTimestamp;
          const firstTx: Transaction = {
            id: `tx-manual-${item.ticker}-${txTimestamp}`,
            ticker: item.ticker,
            type: "buy",
            date: txDate,
            quantity: targetQty,
            pricePerShare: targetAvgPrice && targetAvgPrice > 0 ? targetAvgPrice : item.currentPrice,
            fees: null,
            notes: noteText,
          };
          await upsertTransaction(firstTx);
        } else if (delta > 0) {
          const targetTotalCost = targetQty * (targetAvgPrice && targetAvgPrice > 0 ? targetAvgPrice : currentAvgPrice);
          const currentTotalCost = currentQty * currentAvgPrice;
          const requiredCostForDelta = targetTotalCost - currentTotalCost;
          const pricePerShare = requiredCostForDelta > 0 ? requiredCostForDelta / delta : (targetAvgPrice || currentAvgPrice);
          const buyPrice = pricePerShare > 0 ? pricePerShare : (targetAvgPrice || currentAvgPrice);

          const buyTx: Transaction = {
            id: `tx-manual-${item.ticker}-${txTimestamp}`,
            ticker: item.ticker,
            type: "buy",
            date: txTimestamp,
            quantity: delta,
            pricePerShare: buyPrice,
            fees: null,
            notes: noteText,
          };
          await upsertTransaction(buyTx);
        } else if (delta < 0) {
          const absDelta = Math.abs(delta);
          const sellPrice = targetAvgPrice && targetAvgPrice > 0 ? targetAvgPrice : currentAvgPrice;
          const sellTx: Transaction = {
            id: `tx-manual-${item.ticker}-${txTimestamp}`,
            ticker: item.ticker,
            type: "sell",
            date: txTimestamp,
            quantity: absDelta,
            pricePerShare: sellPrice,
            fees: null,
            notes: noteText,
          };
          await upsertTransaction(sellTx);
        } else if (delta === 0 && targetAvgPrice != null && targetAvgPrice !== currentAvgPrice) {
          if (existingAssetTxs.length === 1 && existingAssetTxs[0].type === "buy") {
            const updatedTx: Transaction = {
              ...existingAssetTxs[0],
              pricePerShare: targetAvgPrice,
              notes: noteText,
            };
            await upsertTransaction(updatedTx);
          }
        }
      }

      toast.success(t.toasts.assetUpdated);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Inputs Section */}
        <div className="space-y-6">
          {/* My Position */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-4 w-4" />
              {t.watchlist.editPosition}
            </h4>

            <div className="space-y-2">
              <Label htmlFor="wl-edit-qty">{t.watchlist.quantity}</Label>
              <MaskedInput
                id="wl-edit-qty"
                formatMode="numeric"
                value={qty ? parseFloat(qty) : null}
                onChangeValue={(v) => setQty(v !== undefined ? String(v) : "")}
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
                currencySymbol={item.currency === "USD" ? "US$" : "R$"}
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
            <h4 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Target className="h-4 w-4" />
              {t.watchlist.editGoals}
            </h4>

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
                currencySymbol={item.currency === "USD" ? "US$" : "R$"}
                value={goal ? parseFloat(goal) : null}
                onChangeValue={(v) => setGoal(v !== undefined ? String(v) : "")}
                placeholder="100"
              />
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="rounded-lg bg-muted/10 border border-border/40 p-4 flex flex-col">
          <h4 className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            {t.watchlist.editPreview}
          </h4>
          <p className="text-xs text-muted-foreground mb-4">{t.watchlist.editPreviewDesc}</p>

          <div className="space-y-4 flex-1">
            {/* Ceiling Price Preview */}
            <div className="rounded-lg border border-border/60 bg-card p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase">{t.radar.ceilingPrice}</div>
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
                <div className="text-xs text-muted-foreground uppercase">{t.result.goalPlannerTitle}</div>

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
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {t.watchlist.save}
        </Button>
      </div>
    </div>
  );
}
