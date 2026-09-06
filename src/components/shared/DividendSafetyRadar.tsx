import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateDividendSafetyScore,
  type AssetSafetyInput,
  type DividendSafetyResult,
} from "@/lib/dividendSafety";

interface DividendSafetyRadarProps {
  input: AssetSafetyInput;
  ticker?: string;
  className?: string;
}

export function DividendSafetyRadar({
  input,
  ticker,
  className,
}: DividendSafetyRadarProps) {
  const result: DividendSafetyResult = calculateDividendSafetyScore(input);

  const getScoreColor = () => {
    switch (result.tier) {
      case "very_safe":
        return "text-success";
      case "safe":
        return "text-primary";
      case "caution":
        return "text-warning";
      case "cut_risk":
        return "text-danger";
    }
  };

  const getBarGradient = () => {
    switch (result.tier) {
      case "very_safe":
        return "from-emerald-500 to-green-400";
      case "safe":
        return "from-primary to-emerald-400";
      case "caution":
        return "from-amber-500 to-yellow-400";
      case "cut_risk":
        return "from-rose-500 to-red-600";
    }
  };

  return (
    <div
      data-testid="dividend-safety-radar"
      className={cn(
        "rounded-xl border border-border/80 bg-card p-5 shadow-xs transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-text inline-flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-accent-text" />
            DIVIDEND SAFETY SCORE • ANÁLISE DE RESILIÊNCIA
          </span>
          <h3 className="font-serif text-lg font-bold text-foreground mt-0.5">
            Radar de Sustentabilidade de Proventos {ticker ? `(${ticker})` : ""}
          </h3>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold font-mono tracking-tight flex items-baseline justify-end gap-1">
            <span className={getScoreColor()}>{result.score}</span>
            <span className="text-xs text-muted-foreground font-normal">/100</span>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 mt-0.5",
              result.tier === "very_safe" && "bg-success/15 text-success ring-success/30",
              result.tier === "safe" && "bg-primary/15 text-primary ring-primary/30",
              result.tier === "caution" && "bg-warning/15 text-warning ring-warning/30",
              result.tier === "cut_risk" && "bg-danger/15 text-danger ring-danger/30"
            )}
          >
            {result.label}
          </span>
        </div>
      </div>

      {/* Main Meter */}
      <div className="mb-5 space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Risco de Corte Elevado</span>
          <span>Sustentabilidade Moderada</span>
          <span>Blindagem Alta</span>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden relative">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", getBarGradient())}
            style={{ width: `${result.score}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{result.summary}</p>
      </div>

      {/* 4 Pillar Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {result.factors.map((factor, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">{factor.name}</span>
              <span
                className={cn(
                  "font-mono font-bold text-xs",
                  factor.status === "success" && "text-success",
                  factor.status === "warning" && "text-warning",
                  factor.status === "danger" && "text-danger",
                  factor.status === "neutral" && "text-foreground"
                )}
              >
                {factor.valueDescription}
              </span>
            </div>

            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  factor.status === "success" && "bg-success",
                  factor.status === "warning" && "bg-warning",
                  factor.status === "danger" && "bg-danger",
                  factor.status === "neutral" && "bg-muted-foreground"
                )}
                style={{ width: `${factor.score}%` }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              {factor.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
