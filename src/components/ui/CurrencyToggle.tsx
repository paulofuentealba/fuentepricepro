import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { useI18n } from "@/lib/i18n-provider";
import { toIntlLocale, formatNumber } from "@/lib/i18n";

interface CurrencyToggleProps {
  value: "BR" | "US";
  onChange: (val: "BR" | "US") => void;
  className?: string;
  hideQuote?: boolean;
  compact?: boolean;
  variant?: "default" | "sidebar";
}

export function CurrencyToggle({
  value,
  onChange,
  className,
  hideQuote = false,
  compact = false,
  variant = "default",
}: CurrencyToggleProps) {
  const { data: fx, dataUpdatedAt } = useQuery(exchangeRateQueryOptions());
  const { t, locale } = useI18n();

  const formattedTime = dataUpdatedAt
    ? new Intl.DateTimeFormat(toIntlLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
      }).format(dataUpdatedAt)
    : "";

  const isSidebar = variant === "sidebar";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn(
          "inline-flex items-center rounded-full bg-muted/40 p-1 border border-border/40 shadow-inner",
          compact && "p-0.5 rounded-lg w-full justify-between",
          isSidebar && "bg-sidebar-foreground/[0.07] border-sidebar-border/30",
        )}
      >
        <button
          type="button"
          onClick={() => onChange("BR")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all duration-200",
            compact && "rounded-md px-2.5 py-1 text-xs flex-1 justify-center",
            !isSidebar &&
              (value === "BR"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"),
            isSidebar &&
              (value === "BR"
                ? "bg-sidebar-primary text-sidebar-accent shadow-sm border border-sidebar-accent/20"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/[0.05]"),
          )}
        >
          {!compact && <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">BR</span>}
          <span className={cn("font-bold uppercase tracking-wide", compact ? "text-xs" : "text-sm")}>BRL</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("US")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all duration-200",
            compact && "rounded-md px-2.5 py-1 text-xs flex-1 justify-center",
            !isSidebar &&
              (value === "US"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"),
            isSidebar &&
              (value === "US"
                ? "bg-sidebar-primary text-sidebar-accent shadow-sm border border-sidebar-accent/20"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/[0.05]"),
          )}
        >
          {!compact && <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">US</span>}
          <span className={cn("font-bold uppercase tracking-wide", compact ? "text-xs" : "text-sm")}>USD</span>
        </button>
      </div>
      {!hideQuote && fx?.USDBRL && (
        <div className="text-[10px] text-muted-foreground mt-2 text-center opacity-70">
          USD/BRL{" "}
          {formatNumber(fx.USDBRL, locale, 2)}
          {formattedTime ? ` — ${t.common.quoteAsOf.replace("{{time}}", formattedTime)}` : ""}
        </div>
      )}
    </div>
  );
}
