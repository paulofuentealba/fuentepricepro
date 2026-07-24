import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricBoxProps {
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "danger" | "warning";
  tooltip?: ReactNode;
  className?: string;
}

export function MetricBox({
  label,
  value,
  subValue,
  trend,
  variant = "default",
  tooltip,
  className,
}: MetricBoxProps) {
  const isSuccess = variant === "success" || trend === "up";
  const isDanger = variant === "danger" || trend === "down";
  const isWarning = variant === "warning";

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-3 transition-colors",
        {
          "border-border/40 bg-background/40 hover:bg-background/60":
            variant === "default" && !isSuccess && !isDanger && !isWarning,
          "border-success/30 bg-success/10 hover:border-success/50": isSuccess,
          "border-danger/30 bg-danger/10 hover:border-danger/50": isDanger,
          "border-warning/30 bg-warning/10 hover:border-warning/50": isWarning,
        },
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn("text-[10px] font-semibold uppercase tracking-wider", {
            "text-muted-foreground": variant === "default" && !isSuccess && !isDanger && !isWarning,
            "text-success/80": isSuccess,
            "text-danger/80": isDanger,
            "text-warning/80": isWarning,
          })}
        >
          {label}
        </span>
        {tooltip}
      </div>

      <div
        className={cn("mt-1 text-sm font-bold tabular-nums", {
          "text-foreground": variant === "default" && !isSuccess && !isDanger && !isWarning,
          "text-success": isSuccess,
          "text-danger": isDanger,
          "text-warning": isWarning,
        })}
      >
        {value}
      </div>

      {subValue && (
        <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground/80">{subValue}</div>
      )}
    </div>
  );
}
