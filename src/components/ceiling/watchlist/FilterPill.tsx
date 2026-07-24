import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  tone?: "success" | "danger";
  count?: number;
  children: ReactNode;
}

const ACTIVE_CLASSES = {
  success: "border-success/40 bg-success/10 text-success",
  danger: "border-danger/40 bg-danger/10 text-danger",
  neutral: "border-foreground/30 bg-foreground/10 text-foreground",
} as const;

const BASE_CLASSES =
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors";
const INACTIVE_CLASSES =
  "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground";

function FilterPillImpl({ active, onClick, tone, count, children }: FilterPillProps) {
  const activeCls =
    tone === "success"
      ? ACTIVE_CLASSES.success
      : tone === "danger"
        ? ACTIVE_CLASSES.danger
        : ACTIVE_CLASSES.neutral;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(BASE_CLASSES, active ? activeCls : INACTIVE_CLASSES)}
    >
      <span className="flex items-center gap-1.5">{children}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums leading-none",
            active ? "bg-foreground text-background" : "bg-foreground/10 text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export const FilterPill = memo(FilterPillImpl);
