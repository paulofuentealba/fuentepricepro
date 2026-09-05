import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency, formatMonthsAsYearsMonths } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { Currency } from "@/lib/domain";

const COST_PRESETS = [5000, 8000, 12000, 15000];

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

  const gapAmount = Math.max(0, monthlyCostGoal - monthlyIncome);

  function commitCost() {
    const parsed = Number(draftCost.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= 0) {
      onSetMonthlyCostGoal(parsed);
    }
  }

  // Define 4 milestone targets adjusted for USD or BRL
  const baseT1 = currency === "USD" ? 300 : 1500;
  const baseT2 = currency === "USD" ? 900 : 4500;
  const targetP3 = monthlyCostGoal > 0 ? monthlyCostGoal : baseT2 * 1.8;
  const targetP4 = targetP3 * 1.875;

  const milestones = [
    {
      name: t.dashboard.fire.milestonePhase1,
      target: baseT1,
      desc: t.dashboard.fire.milestonePhase1Desc,
    },
    {
      name: t.dashboard.fire.milestonePhase2,
      target: baseT2,
      desc: t.dashboard.fire.milestonePhase2Desc,
    },
    {
      name: t.dashboard.fire.milestonePhase3,
      target: targetP3,
      desc: t.dashboard.fire.milestonePhase3Desc,
    },
    {
      name: t.dashboard.fire.milestonePhase4,
      target: targetP4,
      desc: t.dashboard.fire.milestonePhase4Desc,
    },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 mb-6 shadow-sm dark:border-[#234839] dark:bg-[radial-gradient(circle_at_top_right,#163228,#0E1A16_75%)]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-emerald-light">
            {t.dashboard.fire.eyebrow}
          </div>
          <h2 className="mt-1 font-serif text-xl font-semibold text-accent-gold">
            {t.dashboard.fire.title}
          </h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            {t.dashboard.fire.subtitle}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {t.dashboard.fire.crossoverLabel}
          </div>
          {isLoading ? (
            <Skeleton className="mt-1 h-6 w-28" />
          ) : (
            <div className="mt-1 font-serif text-lg font-bold text-accent-emerald-light">
              {crossoverLabel}
            </div>
          )}
        </div>
      </div>

      {/* Input & Big Progress Card */}
      <div className="rounded-xl border border-border/60 bg-surface-2/70 p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs sm:text-sm text-secondary-foreground">
              {t.dashboard.fire.monthlyCostLabel}
            </span>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 py-1.5">
              <span className="font-serif text-sm font-semibold text-accent-gold">
                {currency === "USD" ? "US$" : "R$"}
              </span>
              <Input
                type="number"
                step={500}
                value={draftCost}
                onChange={(e) => setDraftCost(e.target.value)}
                onBlur={commitCost}
                className="h-6 w-24 border-0 p-0 font-serif text-base font-semibold focus-visible:ring-0 text-foreground bg-transparent"
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
                  className="rounded-full border border-border bg-surface-3/60 px-2.5 py-1 text-xs font-semibold text-secondary-foreground transition hover:border-accent-emerald-light hover:bg-accent-emerald hover:text-white"
                >
                  {preset / 1000}k
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t.dashboard.fire.currentIncomeLabel}
              </div>
              <div className="font-serif text-base font-semibold text-foreground">
                {formatCurrency(monthlyIncome, currency, locale)}
              </div>
            </div>
            <div className="border-l border-border pl-5">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t.dashboard.fire.coverageLabel}
              </div>
              <div className="font-serif text-xl font-bold text-accent-emerald-light">
                {clampedCoverage.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="h-4 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-emerald to-accent-gold transition-all duration-500"
            style={{ width: `${clampedCoverage}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{t.dashboard.fire.startLabel}</span>
          <span className="font-medium text-accent-gold">
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

      {/* 4 Milestones Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {milestones.map((m, idx) => {
          const pct = Math.min(100, (monthlyIncome / m.target) * 100);
          const isPhaseReached = isSetup && monthlyIncome >= m.target;
          return (
            <div
              key={idx}
              className={cn(
                "rounded-xl border p-3 transition-colors",
                isPhaseReached
                  ? "border-accent-emerald/60 bg-surface-2"
                  : "border-border/60 bg-surface-2/60",
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {m.name}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold",
                    isPhaseReached
                      ? "bg-accent-emerald-subtle text-accent-emerald-light border border-accent-emerald/50"
                      : "bg-accent-gold/10 text-accent-gold border border-accent-gold/40",
                  )}
                >
                  {isPhaseReached ? t.dashboard.fire.milestoneAchieved : `${pct.toFixed(0)}%`}
                </span>
              </div>
              <div
                className={cn(
                  "font-serif text-base font-bold mb-1",
                  isPhaseReached ? "text-accent-emerald-light" : "text-foreground",
                )}
              >
                {formatCurrency(m.target, currency, locale)} / {t.common.month}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3 my-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isPhaseReached ? "bg-accent-emerald-light" : "bg-accent-gold",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-1">
                {m.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
