import { useState, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./tooltip";
import { HelpCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string | ReactNode;
  link?: string;
  className?: string;
  icon?: ReactNode;
}

export function InfoTooltip({ content, link, className, icon }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const iconElement = icon ?? <HelpCircle className="h-3.5 w-3.5 shrink-0 pointer-events-none" />;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          {link ? (
            <Link
              to={link as any} // Justification: link path is a dynamic string route passed to TanStack Router Link component
              className={cn(
                "inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                className,
              )}
              onClick={() => setOpen((prev) => !prev)}
            >
              {iconElement}
            </Link>
          ) : (
            <button
              type="button"
              aria-label="Informações adicionais"
              className={cn(
                "inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-0 bg-transparent",
                className,
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen((prev) => !prev);
              }}
            >
              {iconElement}
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] p-2.5 text-xs text-center border border-border bg-popover text-popover-foreground shadow-md font-normal leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
