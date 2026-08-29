import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  children: ReactNode;
  icon?: React.ElementType;
  variant?: "success" | "warning" | "danger" | "default" | "gold";
  className?: string;
}

export function StatusBadge({
  children,
  icon: Icon,
  variant = "default",
  className,
}: StatusBadgeProps) {
  const variants = {
    success: "bg-success/10 text-success ring-success/20",
    warning: "bg-warning/10 text-warning ring-warning/20",
    danger: "bg-danger/10 text-danger ring-danger/20",
    default: "bg-primary/10 text-primary ring-primary/20",
    gold: "bg-accent/15 text-accent-text ring-accent/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-display font-medium ring-1",
        variants[variant],
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}
