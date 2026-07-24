import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricBoxProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}

export function MetricBox({ label, value, sub, className }: MetricBoxProps) {
  return (
    <div className={cn("rounded-lg border border-border/60 bg-background/40 p-3", className)}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
