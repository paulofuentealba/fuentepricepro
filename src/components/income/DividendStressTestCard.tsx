import React, { useState } from "react";
import { ShieldAlert, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { Currency } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface DividendStressTestCardProps {
  monthlyProjectedIncome: number;
  currency?: Currency;
  survivalTargetMonthly?: number;
  className?: string;
}

export function DividendStressTestCard({
  monthlyProjectedIncome,
  currency = "BRL",
  survivalTargetMonthly = 3000,
  className,
}: DividendStressTestCardProps) {
  const { t, locale } = useI18n();
  const s = t.incomeScreen.stressTest;

  const [stressCutPct, setStressCutPct] = useState<number>(30); // default 30% cut

  const presets = [
    { label: s.presets.normal, cut: 0, desc: s.presets.normalDesc },
    { label: s.presets.moderate, cut: 15, desc: s.presets.moderateDesc },
    { label: s.presets.severe, cut: 30, desc: s.presets.severeDesc },
    { label: s.presets.extreme, cut: 50, desc: s.presets.extremeDesc },
  ];

  const stressedMonthlyIncome = monthlyProjectedIncome * (1 - stressCutPct / 100);
  const monthlyLoss = monthlyProjectedIncome - stressedMonthlyIncome;
  const annualLoss = monthlyLoss * 12;

  const coverageRatioPct =
    survivalTargetMonthly > 0 ? (stressedMonthlyIncome / survivalTargetMonthly) * 100 : 100;
  const isSurviving = stressedMonthlyIncome >= survivalTargetMonthly;

  const diagnosisMessage =
    stressCutPct === 0
      ? s.diagnosis.normal
      : isSurviving
      ? s.diagnosis.surviving.replace("{{cut}}", String(stressCutPct))
      : s.diagnosis.deficit
          .replace("{{cut}}", String(stressCutPct))
          .replace("{{pct}}", coverageRatioPct.toFixed(0));

  return (
    <Card
      data-testid="dividend-stress-test-card"
      className={cn("border-border/75 bg-card shadow-xs", className)}
    >
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-accent-text inline-flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-accent-text" />
              {s.eyebrow}
            </span>
            <CardTitle className="mt-1 font-serif text-lg font-bold text-foreground">
              {s.title}
            </CardTitle>
            <CardDescription className="text-xs">
              {s.description}
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map((p) => (
              <Button
                key={p.cut}
                type="button"
                size="sm"
                variant={stressCutPct === p.cut ? "default" : "outline"}
                className="h-7 text-xs px-2.5"
                onClick={() => setStressCutPct(p.cut)}
                title={p.desc}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Slider */}
        <div className="rounded-xl border border-destructive/25 bg-card p-4 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground">{s.sliderLabel}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-destructive/10 text-destructive border border-destructive/30 select-none">
              -{stressCutPct}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="70"
            step="5"
            value={stressCutPct}
            onChange={(e) => setStressCutPct(parseInt(e.target.value, 10))}
            className="range-slider-danger my-1"
          />
          <div className="flex justify-between text-[11px] font-medium text-muted-foreground mt-1 select-none">
            <span className={cn(stressCutPct === 0 && "font-bold text-foreground")}>
              {s.sliderStops.base}
            </span>
            <span className={cn(stressCutPct === 25 && "font-bold text-destructive")}>
              {s.sliderStops.moderate}
            </span>
            <span className={cn(stressCutPct === 50 && "font-bold text-destructive")}>
              {s.sliderStops.crisis}
            </span>
            <span className={cn(stressCutPct === 70 && "font-bold text-destructive")}>
              {s.sliderStops.catastrophe}
            </span>
          </div>
        </div>

        {/* Output Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.metrics.stressedIncome}
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-1">
              {formatCurrency(stressedMonthlyIncome, currency, locale)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {s.metrics.vsProjected.replace(
                "{{amount}}",
                formatCurrency(monthlyProjectedIncome, currency, locale),
              )}
            </div>
          </div>

          <div className="rounded-xl border border-destructive/35 bg-destructive/10 p-3.5 shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
              {s.metrics.budgetImpact}
            </div>
            <div className="text-2xl font-bold font-mono text-destructive mt-1">
              {s.metrics.lossPerMonth.replace(
                "{{amount}}",
                formatCurrency(monthlyLoss, currency, locale),
              )}
            </div>
            <div className="text-xs text-destructive/90 mt-0.5">
              {s.metrics.lossPerYear.replace(
                "{{amount}}",
                formatCurrency(annualLoss, currency, locale),
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.metrics.livingCostCoverage}
            </div>
            <div
              className={cn(
                "text-2xl font-bold font-mono mt-1",
                isSurviving ? "text-success" : "text-warning",
              )}
            >
              {coverageRatioPct.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {s.metrics.targetCost.replace(
                "{{amount}}",
                formatCurrency(survivalTargetMonthly, currency, locale),
              )}
            </div>
          </div>
        </div>

        {/* Diagnosis & Defensive Action */}
        <div
          className={cn(
            "rounded-xl p-4 text-xs leading-relaxed border flex items-start gap-3",
            stressCutPct === 0
              ? "bg-primary/10 border-primary/20 text-foreground"
              : isSurviving
              ? "bg-success/10 border-success/30 text-foreground"
              : "bg-destructive/10 border-destructive/30 text-foreground",
          )}
        >
          <Sparkles className="h-5 w-5 text-accent-text shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold block">{diagnosisMessage}</strong>
            <p className="text-muted-foreground text-[11px]">{s.diagnosis.recommendation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
