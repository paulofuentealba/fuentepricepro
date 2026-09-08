import React from "react";
import { Crown, Award } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDgiStatus } from "@/lib/dgi";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";

interface DgiBadgeProps {
  ticker: string;
  className?: string;
  size?: "sm" | "md";
  showTooltip?: boolean;
}

export function DgiBadge({
  ticker,
  className,
  size = "md",
  showTooltip = true,
}: DgiBadgeProps) {
  const { t } = useI18n();
  const dgi = getDgiStatus(ticker);

  if (!dgi) return null;

  const isKing = dgi.tier === "king";
  const label = isKing ? t.dgi.kingBadge : t.dgi.aristocratBadge;
  const tooltipText = isKing ? t.dgi.kingTooltip : t.dgi.aristocratTooltip;

  const badgeElement = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-display font-medium ring-1 transition-colors cursor-default",
        isKing
          ? "bg-accent/15 text-accent-text ring-accent/30 hover:bg-accent/25"
          : "bg-primary/10 text-primary ring-primary/20 hover:bg-primary/15",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
        className,
      )}
    >
      {isKing ? (
        <Crown className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      ) : (
        <Award className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      )}
      <span>{label}</span>
    </span>
  );

  if (!showTooltip) return badgeElement;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badgeElement}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs font-normal leading-relaxed">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
