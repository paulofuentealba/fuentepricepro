import { ArrowUpRight, CalendarClock, Sparkles, Target, TrendingUp, Wallet } from "lucide-react";
import { cleanTicker } from "./cards";

import { useI18n } from "@/lib/i18n-provider";

function ProBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success">
      <Sparkles className="h-2.5 w-2.5" />
      {t.showcase.proFeature}
    </span>
  );
}

export function ProAllocationCard() {
  const { t } = useI18n();
  const top3 = ["BBSE3", "VALE", "O"].map(cleanTicker);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-success/50 bg-card/80 p-4 shadow-xl shadow-primary/10 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-success/40 bg-success/10 text-success">
          <Target className="h-5 w-5" />
        </div>
        <ProBadge />
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">
        {t.showcase.smartContribution}
      </h3>
      <p className="text-xs text-muted-foreground">{t.showcase.optimalAllocation}</p>

      <div className="mt-4 rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t.showcase.topAssetsYield}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {top3.map((assetId) => (
            <span
              key={assetId}
              className="inline-flex items-center rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success"
            >
              {assetId}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3">
        <ArrowUpRight className="h-3.5 w-3.5 text-success" />
        <span className="text-[11px] font-medium text-success">{t.showcase.targetingYield}</span>
      </div>
    </div>
  );
}

export function ProForecastCard() {
  const { t } = useI18n();
  // Tiny inline sparkline (YoY growth)
  const points = [8, 12, 10, 16, 18, 22, 26, 30];
  const max = Math.max(...points);
  const w = 120;
  const h = 32;
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="flex h-full flex-col rounded-2xl border border-success/50 bg-card/80 p-4 shadow-xl shadow-primary/10 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-success/40 bg-success/10 text-success">
          <Wallet className="h-5 w-5" />
        </div>
        <ProBadge />
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">
        {t.showcase.passiveIncomeForecast}
      </h3>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums text-success">$ 500.00</span>
        <span className="text-xs text-muted-foreground">/ mo</span>
      </div>

      <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 text-success" />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {t.showcase.yoyGrowth}
            </span>
          </div>
          <span className="text-xs font-semibold text-success">+12.5%</span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-8 w-full">
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-success"
          />
        </svg>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3">
        <TrendingUp className="h-3.5 w-3.5 text-success" />
        <span className="text-[11px] font-medium text-success">{t.showcase.compoundingIncome}</span>
      </div>
    </div>
  );
}
