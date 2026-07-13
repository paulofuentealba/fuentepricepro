import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Shield,
  TrendingUp,
} from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Asset } from "@/lib/domain";
import { formatCurrency, formatPercent } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { TIMEFRAMES, type Timeframe } from "@/lib/resultCard";
import { TargetYieldSlider } from "../../ui/TargetYieldSlider";
import { MaskedInput } from "../shared/MaskedInput";
import { Label } from "@/components/ui/label";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

interface Props {
  asset: Asset;
  timeframe: Timeframe;
  availableTimeframes: Timeframe[];
  onTimeframeChange: (n: Timeframe) => void;
  avg: number;
  netAvg: number;
  isUs: boolean;
  avgYieldPct: number;
  yocPct: number | null;
  exDateFormatted: string | null;
  ceiling: number;
  targetYield: number;
  margin: number;
  positive: boolean;
  averagePrice: number | null;
  customTaxRate: number | null;
  onTargetYieldChange: (y: number) => void;
  onAveragePriceChange: (a: number | null) => void;
  onCustomTaxRateChange: (r: number | null) => void;
  isPro: boolean;
  onShowPaywall: () => void;
}

export function ResultStats({
  asset,
  timeframe,
  availableTimeframes,
  onTimeframeChange,
  avg,
  netAvg,
  isUs,
  avgYieldPct,
  yocPct,
  exDateFormatted,
  ceiling,
  targetYield,
  margin,
  positive,
  averagePrice,
  customTaxRate,
  onTargetYieldChange,
  onAveragePriceChange,
  onCustomTaxRateChange,
  isPro,
  onShowPaywall,
}: Props) {
  const { t, locale } = useI18n();
  return (
    <>
      {(yocPct != null || exDateFormatted) && (
        <div className="flex flex-wrap items-center gap-2">
          {yocPct != null && (
            <TooltipProvider delayDuration={150}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success ring-1 ring-success/20">
                    <span className="text-[10px] uppercase tracking-wider text-success/80">
                      {t.result.yieldOnCost}
                    </span>
                    <span className="tabular-nums">{formatPercent(yocPct, locale, 2)}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {t.result.yieldOnCostTip}
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
          {exDateFormatted && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning-foreground ring-1 ring-warning/30">
              <CalendarClock className="h-3 w-3 text-warning" />
              <span className="text-[10px] uppercase tracking-wider text-warning/80">
                {t.result.nextExDate}
              </span>
              <span className="font-bold tabular-nums text-warning-foreground">
                {exDateFormatted}
              </span>
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-background/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.result.avgDividendLabel} ({timeframe}Y)
            </div>
            <div className="inline-flex overflow-hidden rounded-md border border-border/60 bg-background/60">
              {TIMEFRAMES.map((n) => {
                const enabled = availableTimeframes.includes(n);
                const active = timeframe === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!enabled}
                    onClick={() => enabled && onTimeframeChange(n)}
                    className={
                      "px-2 py-0.5 text-[10px] font-semibold tabular-nums transition-colors " +
                      (active
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground") +
                      (!enabled ? " opacity-40 cursor-not-allowed" : "")
                    }
                    aria-pressed={active}
                  >
                    {n}Y
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {formatCurrency(avg, asset.currency, locale)}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {isUs
              ? `${t.result.grossProjected} · ${t.result.netProjected}: ${formatCurrency(netAvg, asset.currency, locale)}`
              : formatPercent(avgYieldPct, locale, 2)}
          </div>
        </div>

        <Stat
          label={t.result.epsCurrent}
          value={
            asset.epsCurrent == null
              ? "N/A"
              : formatCurrency(asset.epsCurrent, asset.currency, locale)
          }
        />
        <Stat
          label={t.result.epsNext}
          value={
            asset.epsNext == null
              ? "N/A"
              : formatCurrency(asset.epsNext, asset.currency, locale)
          }
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-6 mt-2 shadow-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Playground</h3>
        </div>
        
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-4">
            <TargetYieldSlider 
              value={targetYield} 
              onChange={onTargetYieldChange} 
            />
            <p className="text-[11px] text-muted-foreground">{t.form.targetYieldHint}</p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="avgPrice"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              {t.form.avgPrice}
            </Label>
            <MaskedInput
              id="avgPrice"
              formatMode="currency"
              placeholder="—"
              value={averagePrice}
              onChangeValue={(v) => {
                const str = v === undefined ? "" : String(v);
                const num = str !== "" ? parseFloat(str) : null;
                onAveragePriceChange(num);
              }}
              className="h-10 bg-background/50"
            />
            <p className="text-[11px] text-muted-foreground">{t.form.avgPriceHint}</p>
          </div>
        </div>
        
        <details 
          className="group space-y-4 rounded-lg border border-border/50 bg-background/30 p-4 [&_summary::-webkit-details-marker]:hidden"
          onClick={(e) => {
            if (!isPro) {
              e.preventDefault();
              onShowPaywall();
            }
          }}
        >
          <summary className="flex cursor-pointer items-center justify-between font-medium">
            <span className="text-xs text-muted-foreground">{t.form.taxExceptions} {!isPro && <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500 uppercase tracking-wider">{t.form.taxExceptionsPro}</span>}</span>
            <span className="text-muted-foreground transition duration-300 group-open:-rotate-180">
              <svg fill="none" height="16" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="16"><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </summary>
          <div className="pt-2">
            <p className="mb-4 text-[11px] text-muted-foreground border-l-2 border-primary/50 pl-2" dangerouslySetInnerHTML={{ __html: t.form.taxExceptionsBody }} />
            <div className="space-y-2">
              <Label
                htmlFor="taxRate"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                {t.form.taxRateLabel}
              </Label>
              <div className="relative">
                <MaskedInput
                  id="taxRate"
                  formatMode="numeric"
                  min={0}
                  max={100}
                  placeholder={t.form.taxRatePlaceholder}
                  value={customTaxRate}
                  onChangeValue={(v) => {
                    const str = v === undefined ? "" : String(v);
                    const tx = str !== "" ? parseFloat(str) : null;
                    const tax = (isPro && tx !== null && tx >= 0 && tx <= 100) ? tx : null;
                    onCustomTaxRateChange(tax);
                  }}
                  className="h-10 pr-8 bg-background/50"
                  disabled={!isPro}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{t.form.taxRateHint}</p>
            </div>
          </div>
        </details>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-success/30 bg-success/10 p-4">
          <div className="flex items-center gap-2 text-success">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              {t.result.ceilingPrice}
            </span>
          </div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(ceiling, asset.currency, locale)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            @ {formatPercent(targetYield, locale, 2)} {t.form.targetYield.toLowerCase()}
          </div>
        </div>

        <div
          className={
            "rounded-xl border p-4 " +
            (positive
              ? "border-success/30 bg-success/10"
              : "border-danger/30 bg-danger/10")
          }
        >
          <div
            className={
              "flex items-center gap-2 " + (positive ? "text-success" : "text-danger")
            }
          >
            <Shield className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              {t.result.safetyMargin}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {formatPercent(margin, locale, 2)}
            </span>
            {positive ? (
              <ArrowUpRight className="h-5 w-5 text-success" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-danger" />
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {positive ? t.result.undervalued : t.result.overvalued}
          </div>
          <div className="mt-2 text-xs text-muted-foreground/80">
            {positive ? t.result.undervaluedTip : t.result.overvaluedTip}
          </div>
        </div>
      </div>
    </>
  );
}
