import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { useI18n } from "@/lib/i18n-provider";
import { toIntlLocale } from "@/lib/i18n";

interface CurrencyToggleProps {
  value: "BR" | "US";
  onChange: (val: "BR" | "US") => void;
  className?: string;
}

export function CurrencyToggle({ value, onChange, className }: CurrencyToggleProps) {
  const { data: fx, dataUpdatedAt } = useQuery(exchangeRateQueryOptions());
  const { t, locale } = useI18n();

  const formattedTime = dataUpdatedAt
    ? new Intl.DateTimeFormat(toIntlLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
      }).format(dataUpdatedAt)
    : "";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn(
          "inline-flex items-center rounded-full bg-slate-900/40 p-1 border border-border/40 shadow-inner",
        )}
      >
        <button
          type="button"
          onClick={() => onChange("BR")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all duration-200",
            value === "BR"
              ? "bg-slate-800/80 text-slate-100 shadow-sm ring-1 ring-white/10"
              : "text-slate-400 hover:text-slate-300",
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">BR</span>
          <span className="text-sm font-bold uppercase tracking-wide">BRL</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("US")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all duration-200",
            value === "US"
              ? "bg-slate-800/80 text-slate-100 shadow-sm ring-1 ring-white/10"
              : "text-slate-400 hover:text-slate-300",
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">US</span>
          <span className="text-sm font-bold uppercase tracking-wide">USD</span>
        </button>
      </div>
      {fx?.USDBRL && (
        <div className="text-[10px] text-muted-foreground mt-2 text-center opacity-70">
          USD/BRL{" "}
          {new Intl.NumberFormat(toIntlLocale(locale), {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(fx.USDBRL)}
          {formattedTime ? ` — ${t.common.quoteAsOf.replace("{{time}}", formattedTime)}` : ""}
        </div>
      )}
    </div>
  );
}
