import React from "react";
import { Sparkles, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import type { PortfolioGapAnalysis } from "@/lib/dividendRadarLogic";

interface DividendRadarHeroProps {
  analysis: PortfolioGapAnalysis;
  totalCount: number;
  onSelectMonth: (month: number | "ALL") => void;
  formatCurrency: (val: number, currency?: string) => string;
}

export function DividendRadarHero({
  analysis,
  totalCount,
  onSelectMonth,
  formatCurrency,
}: DividendRadarHeroProps) {
  const { t } = useI18n();
  const d = t.dividendRadar;

  const amountStr = formatCurrency(analysis.threshold || 250);
  const weakMonthsStr =
    analysis.weakMonths.length > 0
      ? analysis.weakMonths.map((w) => w.name).join(", ")
      : "Maio e Novembro";

  const description = analysis.hasGaps
    ? d.gapFinder.descriptionWithGaps
        .replace("{{amount}}", amountStr)
        .replace("{{months}}", weakMonthsStr)
    : d.gapFinder.descriptionNoGaps;

  const ctaText = d.gapFinder.ctaFill.replace("{{month}}", analysis.suggestedMonthName);

  return (
    <div
      data-testid="dividend-radar-hero"
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6 shadow-sm transition-all"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-primary">
                {d.eyebrow}
              </span>
            </div>
            <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {d.gapFinder.title}
            </h2>
            <p className="max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
          <div className="text-left sm:text-right">
            <div className="font-mono text-base sm:text-lg font-bold text-foreground">
              {d.gapFinder.radarCount.replace("{{count}}", String(totalCount))}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {d.gapFinder.radarCountSub}
            </div>
          </div>

          <Button
            size="sm"
            variant="default"
            onClick={() => onSelectMonth(analysis.suggestedMonth)}
            className="gap-1.5 text-xs font-medium shadow-sm transition-transform active:scale-95"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>{ctaText}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
