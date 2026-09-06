import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, ShieldX } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  calculateDividendSafetyScore,
  type AssetSafetyInput,
  type DividendSafetyResult,
} from "@/lib/dividendSafety";

interface DividendSafetyBadgeProps {
  input: AssetSafetyInput;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  className?: string;
}

export function DividendSafetyBadge({
  input,
  size = "md",
  showScore = true,
  className,
}: DividendSafetyBadgeProps) {
  const result: DividendSafetyResult = calculateDividendSafetyScore(input);

  const getIcon = () => {
    switch (result.tier) {
      case "very_safe":
        return <ShieldCheck className="h-3.5 w-3.5 text-success" />;
      case "safe":
        return <ShieldCheck className="h-3.5 w-3.5 text-primary" />;
      case "caution":
        return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
      case "cut_risk":
        return <ShieldAlert className="h-3.5 w-3.5 text-danger" />;
    }
  };

  const getStyles = () => {
    switch (result.tier) {
      case "very_safe":
        return "bg-success/15 text-success border-success/30 hover:bg-success/20";
      case "safe":
        return "bg-primary/15 text-primary border-primary/30 hover:bg-primary/20";
      case "caution":
        return "bg-warning/15 text-warning border-warning/30 hover:bg-warning/20";
      case "cut_risk":
        return "bg-danger/15 text-danger border-danger/30 hover:bg-danger/20";
    }
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3.5 py-1.5 text-sm gap-2 font-semibold",
  }[size];

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            data-testid="dividend-safety-badge"
            className={cn(
              "inline-flex items-center rounded-full border font-medium cursor-help transition-colors",
              getStyles(),
              sizeClasses,
              className
            )}
          >
            {getIcon()}
            <span>
              {showScore ? `${result.score}/100 • ` : ""}
              {result.label}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3.5 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <strong className="font-semibold text-foreground flex items-center gap-1.5">
              {getIcon()}
              Radar de Segurança de Proventos
            </strong>
            <span className="font-mono font-bold text-foreground">{result.score}/100</span>
          </div>
          <p className="text-muted-foreground">{result.summary}</p>
          <div className="space-y-1.5 pt-1">
            {result.factors.map((factor, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{factor.name}:</span>
                <span
                  className={cn(
                    "font-medium",
                    factor.status === "success" && "text-success",
                    factor.status === "warning" && "text-warning",
                    factor.status === "danger" && "text-danger"
                  )}
                >
                  {factor.valueDescription}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border/50 pt-2 text-[10px] text-muted-foreground flex justify-between">
            <span>Risco estatístico de corte:</span>
            <span className={cn("font-bold", result.cutRiskProbabilityPct > 30 ? "text-danger" : "text-success")}>
              ~{result.cutRiskProbabilityPct}%
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
