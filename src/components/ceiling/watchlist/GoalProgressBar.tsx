import { memo, useMemo } from "react";
import { formatCurrency, toIntlLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";
import type { Currency } from "@/lib/domain";

interface GoalProgressBarProps {
  goal: number;
  quantity: number;
  annualDividend: number;
  currency: Currency;
}

const CONTAINER_BASE = "rounded-md border p-2.5";
const TONE_ACTIVE = "border-primary/25 bg-primary/5";
const TONE_REACHED = "border-warning/40 bg-warning/10";
const BAR_TRACK = "mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background/60";
const BAR_ACTIVE = "bg-primary";
const BAR_REACHED = "bg-warning";

function GoalProgressBarImpl({ goal, quantity, annualDividend, currency }: GoalProgressBarProps) {
  const { t, locale } = useI18n();

  const progress = useMemo(() => {
    if (!(goal > 0) || !(annualDividend > 0)) return null;
    const sharesNeeded = Math.ceil((goal * 12) / annualDividend);
    const progressPct = sharesNeeded > 0 ? Math.min(100, (quantity / sharesNeeded) * 100) : 0;
    return {
      sharesNeeded,
      progressPct,
      reached: progressPct >= 100,
    };
  }, [goal, quantity, annualDividend]);

  const fmt = useMemo(() => new Intl.NumberFormat(toIntlLocale(locale)), [locale]);

  if (!progress) return null;

  const { sharesNeeded, progressPct, reached } = progress;

  return (
    <div className={cn(CONTAINER_BASE, reached ? TONE_REACHED : TONE_ACTIVE)}>
      <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide">
        <span className={reached ? "text-warning" : "text-primary"}>
          {reached
            ? t.watchlist.goalReached
            : t.watchlist.goalProgress
                .replace("{{amount}}", formatCurrency(goal, currency, locale))
                .replace("{{pct}}", progressPct.toFixed(1))}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {fmt.format(quantity)}
          {" / "}
          {fmt.format(sharesNeeded)}
        </span>
      </div>
      <div className={BAR_TRACK}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            reached ? BAR_REACHED : BAR_ACTIVE,
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

export const GoalProgressBar = memo(GoalProgressBarImpl);
