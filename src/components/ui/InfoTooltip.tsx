import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { HelpCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface InfoTooltipProps {
  content: string | ReactNode;
  link?: string;
  className?: string;
  icon?: ReactNode;
}

export function InfoTooltip({ content, link, className, icon }: InfoTooltipProps) {
  const trigger = (
    <span
      className={`inline-flex items-center text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer ${className || ""}`}
    >
      {icon ?? <HelpCircle className="h-3.5 w-3.5" />}
    </span>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {link ? (
            <Link
              to={link as any}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
            >
              {trigger}
            </Link>
          ) : (
            <span
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
              tabIndex={0}
            >
              {trigger}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-[250px] p-2.5 text-xs text-center border bg-popover text-popover-foreground shadow-md font-normal leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
