import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MetricBoxProps {
  label: ReactNode;
  value: ReactNode;
  subValue?: ReactNode;
  sub?: ReactNode; // alias for subValue for backward compatibility
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "danger" | "warning" | "hero" | "condensed";
  size?: "sm" | "md" | "lg" | "hero";
  compact?: boolean;
  icon?: ReactNode;
  tooltip?: ReactNode;
  className?: string;
}

export function MetricBox({
  label,
  value,
  subValue,
  sub,
  trend,
  variant = "default",
  size = "md",
  compact = false,
  icon,
  tooltip,
  className,
}: MetricBoxProps) {
  const isSuccess = variant === "success" || trend === "up";
  const isDanger = variant === "danger" || trend === "down";
  const isWarning = variant === "warning";
  const isHero = variant === "hero" || size === "hero";
  const isSmall = size === "sm" || compact || variant === "condensed";

  const actualSubValue = subValue ?? sub;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[15px] border transition-colors",
        isSmall ? "px-3 py-2 rounded-xl" : "px-[17px] py-[15px]",
        {
          "border-border/40 bg-background/40 hover:bg-background/60":
            variant === "default" && !isSuccess && !isDanger && !isWarning && !isHero,
          "border-primary/30 bg-primary/5 hover:border-primary/50": isHero,
          "border-success/30 bg-success/10 hover:border-success/50": isSuccess,
          "border-danger/30 bg-danger/10 hover:border-danger/50": isDanger,
          "border-warning/30 bg-warning/10 hover:border-warning/50": isWarning,
        },
        className,
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
          <span
            className={cn("text-[10px] font-display font-semibold uppercase tracking-wider", {
              "text-muted-foreground": variant === "default" && !isSuccess && !isDanger && !isWarning && !isHero,
              "text-primary font-bold": isHero,
              "text-success/80": isSuccess,
              "text-danger/80": isDanger,
              "text-warning/80": isWarning,
            })}
          >
            {label}
          </span>
        </div>
        {tooltip}
      </div>

      <div
        className={cn("font-serif font-bold tabular-nums font-display", {
          "mt-0.5 text-xs sm:text-sm": isSmall,
          "mt-1 text-sm sm:text-base": !isSmall && !isHero,
          "mt-1 text-xl sm:text-2xl text-primary": isHero,
          "text-foreground": variant === "default" && !isSuccess && !isDanger && !isWarning && !isHero,
          "text-success": isSuccess,
          "text-danger": isDanger,
          "text-warning": isWarning,
        })}
      >
        {value}
      </div>

      {actualSubValue && (
        <div className={cn("leading-tight text-muted-foreground/80 font-mono", isSmall ? "text-[10px] mt-0.5" : "text-[11px] mt-0.5")}>
          {actualSubValue}
        </div>
      )}
    </div>
  );
}
