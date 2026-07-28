import { memo, useCallback, useMemo, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { useAuth } from "@/lib/auth-provider";
import { useAuthModal } from "@/lib/auth-modal";
import type { Currency } from "@/lib/domain";

interface GoalPlannerProps {
  annualDividend: number;
  currentPrice: number;
  currency: Currency;
}

const CARD_BASE =
  "relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background/40 to-background/60 p-4";
// Blur overlay: keep pointer-events on the CTA container so the sign-in button
// works, but let the inner blurred content ignore clicks so nothing underneath
// steals scroll/pointer events.
const BLUR_INNER = "mt-4 pointer-events-none select-none blur-sm";
const BLUR_OVERLAY =
  "absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[2px]";

function GoalPlannerImpl({ annualDividend, currentPrice, currency }: GoalPlannerProps) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [income, setIncome] = useState<number>(100);

  const { sharesNeeded, capitalRequired, hasData } = useMemo(() => {
    if (!annualDividend || annualDividend <= 0) {
      return { sharesNeeded: 0, capitalRequired: 0, hasData: false };
    }
    const shares = Math.ceil((income * 12) / annualDividend);
    return {
      sharesNeeded: shares,
      capitalRequired: shares * currentPrice,
      hasData: true,
    };
  }, [income, annualDividend, currentPrice]);

  const sharesLabel = useMemo(
    () => new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR").format(sharesNeeded),
    [sharesNeeded, locale],
  );

  const handleIncomeInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setIncome(Number.isFinite(v) && v >= 0 ? v : 0);
  }, []);

  const handleIncomeSlider = useCallback((v: number[]) => {
    setIncome(v[0] ?? 0);
  }, []);

  const handleUnlock = useCallback(() => {
    openAuthModal({ message: t.result.goalPlannerLocked });
  }, [openAuthModal, t.result.goalPlannerLocked]);

  return (
    <div className={CARD_BASE}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{t.result.goalPlannerTitle}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t.result.goalPlannerSubtitle}</p>

      <div className={user ? "mt-4" : BLUR_INNER} aria-hidden={!user}>
        {!hasData ? (
          <p className="text-xs text-muted-foreground">{t.result.noDividendData}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-income" className="text-xs text-muted-foreground">
                {t.result.desiredMonthlyIncome}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="goal-income"
                  type="number"
                  min={0}
                  step="any"
                  value={income}
                  onChange={handleIncomeInput}
                  className="w-32 tabular-nums"
                />
                <Slider aria-label="Ajustar aporte mensal"                   value={[income]}
                  min={0}
                  max={5000}
                  step={50}
                  onValueChange={handleIncomeSlider}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                <div className="text-[10px] uppercase tracking-wide text-primary/80">
                  {t.result.sharesNeeded.split("{{qty}}")[0].trim() || "Shares"}
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {sharesLabel}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t.result.capitalRequired}
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {formatCurrency(capitalRequired, currency, locale)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!user && (
        <div className={BLUR_OVERLAY}>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-2 shadow-lg"
            onClick={handleUnlock}
          >
            <Lock className="h-4 w-4" />
            {t.result.goalPlannerLocked}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Isolated so slider/input state changes never re-render the parent
 * ResultCard tree or re-trigger asset API fetches upstream.
 */
export const GoalPlanner = memo(GoalPlannerImpl);
