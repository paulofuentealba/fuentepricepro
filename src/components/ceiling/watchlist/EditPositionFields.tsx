import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n-provider";
import type { WatchlistItem } from "@/lib/watchlist";
import { useWatchlist } from "@/lib/watchlist";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { KNOWN_BROKER_LABELS } from "@/lib/brokers";
import { MaskedInput } from "../shared/MaskedInput";
import { Target, TrendingUp } from "lucide-react";

interface EditPositionFieldsProps {
  item: ValuedWatchlistItem | WatchlistItem;
}

/**
 * Presentational + self-contained "Metas & Premissas" form.
 * Permite calibrar o Yield Alvo desejado e a Meta de Renda Mensal do ativo.
 * Não persiste snapshots estáticos de preço-teto ou margem (calculados ao vivo pelo SSOT),
 * e não altera quantidade/preço médio (gerenciados canonicamente pelo ledger de transações).
 */
export function EditPositionFields({ item }: EditPositionFieldsProps) {
  const { t } = useI18n();
  const { updateAsync } = useWatchlist();

  const [dy, setDy] = useState("");
  const [goal, setGoal] = useState("");
  const [broker, setBroker] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDy(item.targetYield != null ? String(item.targetYield) : "6");
    setGoal(item.targetMonthlyIncome != null ? String(item.targetMonthlyIncome) : "");
    setBroker((item as WatchlistItem).broker ?? "");
    setIsSaving(false);
  }, [item.id, item.targetYield, item.targetMonthlyIncome, (item as WatchlistItem).broker]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const y = dy.trim() === "" ? null : Number(dy);
      const g = goal.trim() === "" ? null : Number(goal);

      const patch: Partial<WatchlistItem> = {};
      if (y != null && Number.isFinite(y) && y > 0) {
        patch.targetYield = y;
      }
      if (g != null && Number.isFinite(g) && g > 0) {
        patch.targetMonthlyIncome = g;
      } else if (goal.trim() === "") {
        patch.targetMonthlyIncome = null;
      }
      patch.broker = broker.trim() || null;

      await updateAsync(item.id, patch);
      toast.success(t.toasts.assetUpdated);
    } catch (err: any) {
      toast.error(err?.message || t.errors.updateAssetFailedPrefix);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wl-edit-dy" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            {t.form.targetYield} (%)
          </Label>
          <MaskedInput
            id="wl-edit-dy"
            formatMode="numeric"
            suffix=" %"
            value={dy ? parseFloat(dy) : null}
            onChangeValue={(v) => setDy(v !== undefined ? String(v) : "")}
            placeholder="6"
            className="h-11 sm:h-9 text-xs font-semibold"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wl-edit-goal" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Target className="h-3.5 w-3.5 text-primary" />
            {t.watchlist.targetMonthlyIncome}
          </Label>
          <MaskedInput
            id="wl-edit-goal"
            formatMode="currency"
            currencySymbol={item.currency === "USD" ? "US$" : "R$"}
            value={goal ? parseFloat(goal) : null}
            onChangeValue={(v) => setGoal(v !== undefined ? String(v) : "")}
            placeholder="0,00"
            className="h-11 sm:h-9 text-xs font-semibold"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wl-edit-broker" className="text-xs font-semibold text-foreground">
            {t.portfolio.brokerLabel}
          </Label>
          <input
            id="wl-edit-broker"
            list="wl-edit-known-brokers"
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            placeholder={t.portfolio.brokerPlaceholder}
            className="h-11 sm:h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold"
          />
          <datalist id="wl-edit-known-brokers">
            {Object.values(KNOWN_BROKER_LABELS).map((label) => (
              <option key={label} value={label} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold px-5"
        >
          {t.watchlist.saveGoals}
        </Button>
      </div>
    </div>
  );
}
