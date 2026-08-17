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
    const rawPct = sharesNeeded > 0 ? (quantity / sharesNeeded) * 100 : 0;
    const progressPct = Math.min(100, rawPct);
    const excessShares = Math.max(0, quantity - sharesNeeded);
    return {
      sharesNeeded,
      progressPct,
      excessShares,
      reached: rawPct >= 100,
    };
  }, [goal, quantity, annualDividend]);

  const fmt = useMemo(() => new Intl.NumberFormat(toIntlLocale(locale)), [locale]);

  if (!progress) return null;

  const { sharesNeeded, progressPct, excessShares, reached } = progress;

  return (
    <div className={cn(CONTAINER_BASE, reached ? TONE_REACHED : TONE_ACTIVE)}>
      <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide">
        <span className={reached ? "text-warning" : "text-primary"}>
          {reached ? (
            <span className="flex items-center gap-1 flex-wrap">
              <span>{t.watchlist.goalReached}</span>
              {excessShares > 0 && (
                <span className="text-[9px] lowercase opacity-85 font-normal">
                  ({t.watchlist.targetOverAchieved?.replace("{{excess}}", fmt.format(excessShares)) ?? `+${excessShares} cotas`})
                </span>
              )}
            </span>
          ) : (
            t.watchlist.goalProgress
              .replace("{{amount}}", formatCurrency(goal, currency, locale))
              .replace("{{pct}}", progressPct.toFixed(1))
          )}
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
