import { useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency, formatMonthsAsYearsMonths } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { Currency } from "@/lib/domain";

const COST_PRESETS = [5000, 8000, 12000, 15000];
const MILESTONE_PCTS = [25, 50, 75, 100] as const;

interface FireEngineCardProps {
  coveragePercent: number;
  monthlyIncome: number;
  monthlyCostGoal: number;
  monthsToFI: number | null;
  isReached: boolean;
  isSetup: boolean;
  currency: Currency;
  deltaSinceLastVisit: number | null;
  onSetMonthlyCostGoal: (value: number) => void;
  isLoading: boolean;
}

export function FireEngineCard({
  coveragePercent,
  monthlyIncome,
  monthlyCostGoal,
  monthsToFI,
  isReached,
  isSetup,
  currency,
  deltaSinceLastVisit,
  onSetMonthlyCostGoal,
  isLoading,
}: FireEngineCardProps) {
  const { locale, t } = useI18n();
  const [draftCost, setDraftCost] = useState(monthlyCostGoal > 0 ? String(monthlyCostGoal) : "");

  const clampedCoverage = Math.min(100, Math.max(0, coveragePercent));

  const crossoverLabel = isReached
    ? t.dashboard.fire.crossoverReached
    : isSetup && monthsToFI != null
      ? formatMonthsAsYearsMonths(monthsToFI, {
          year: t.common.year,
          years: t.common.years,
          month: t.common.month,
          months: t.common.months,
          separator: t.common.durationSeparator,
          lessThanOneMonth: t.common.lessThanOneMonth,
        })
      : t.dashboard.fire.crossoverUnknown;

  const milestones = MILESTONE_PCTS.map((pct) => ({
    pct,
    achieved: isSetup && clampedCoverage >= pct,
    label:
      pct === 25
        ? t.dashboard.fire.milestone25
        : pct === 50
          ? t.dashboard.fire.milestone50
          : pct === 75
            ? t.dashboard.fire.milestone75
            : t.dashboard.fire.milestone100,
  }));

  const gapAmount = Math.max(0, monthlyCostGoal - monthlyIncome);

  function commitCost() {
    const parsed = Number(draftCost.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= 0) {
      onSetMonthlyCostGoal(parsed);
    }
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t.dashboard.fire.eyebrow}
          </div>
          <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">{t.dashboard.fire.title}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t.dashboard.fire.subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {t.dashboard.fire.crossoverLabel}
          </div>
          {isLoading ? (
            <Skeleton className="mt-1 h-6 w-28" />
          ) : (
            <div className="mt-1 font-serif text-lg font-semibold text-success">{crossoverLabel}</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">{t.dashboard.fire.monthlyCostLabel}</span>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5">
              <span className="text-sm text-muted-foreground">{currency === "USD" ? "US$" : "R$"}</span>
              <Input
                type="number"
                step={500}
                value={draftCost}
                onChange={(e) => setDraftCost(e.target.value)}
                onBlur={commitCost}
                className="h-6 w-24 border-0 p-0 text-base font-semibold focus-visible:ring-0"
              />
            </div>
            <div className="flex gap-1.5">
              {COST_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setDraftCost(String(preset));
                    onSetMonthlyCostGoal(preset);
                  }}
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  {preset / 1000}k
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.dashboard.fire.currentIncomeLabel}
              </div>
              <div className="text-base font-semibold text-foreground">
                {formatCurrency(monthlyIncome, currency, locale)}
              </div>
            </div>
            <div className="border-l border-border pl-5">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.dashboard.fire.coverageLabel}
              </div>
              <div className="text-lg font-semibold text-success">
                {clampedCoverage.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${clampedCoverage}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{t.dashboard.fire.startLabel}</span>
          <span className="font-medium text-foreground">
            {isSetup
              ? isReached
                ? t.dashboard.fire.goalReachedText
                : t.dashboard.fire.gapText.replace(
                    "{{amount}}",
                    formatCurrency(gapAmount, currency, locale),
                  )
              : ""}
          </span>
          <span>{t.dashboard.fire.targetLabel}</span>
        </div>
        {deltaSinceLastVisit != null && deltaSinceLastVisit !== 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t.home.ppSinceLastVisit.replace(
              "{{delta}}",
              `${deltaSinceLastVisit > 0 ? "+" : ""}${deltaSinceLastVisit.toFixed(1)}`,
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {milestones.map((m) => (
          <div
            key={m.pct}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
              m.achieved
                ? "border-success/40 bg-success/10 text-success"
                : "border-border text-muted-foreground",
            )}
          >
            {m.achieved && <Check className="h-3.5 w-3.5 shrink-0" />}
            <span>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
