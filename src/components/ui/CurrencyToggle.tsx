import { cn } from "@/lib/utils";
import { useExchangeRate } from "@/lib/useExchangeRate";
import { useI18n } from "@/lib/i18n-provider";
import { toIntlLocale } from "@/lib/i18n";

interface CurrencyToggleProps {
  value: "BR" | "US";
  onChange: (val: "BR" | "US") => void;
  className?: string;
}

export function CurrencyToggle({ value, onChange, className }: CurrencyToggleProps) {
  const { data: exchangeData } = useExchangeRate();
  const { locale } = useI18n();

  let formattedTime = "";
  if (exchangeData?.date) {
    try {
      // The API returns time in BRT (UTC-3), e.g., "2024-05-10 14:32:00"
      const dateInBrt = exchangeData.date.replace(" ", "T") + "-03:00";
      const dateObj = new Date(dateInBrt);
      formattedTime = new Intl.DateTimeFormat(toIntlLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj);
    } catch (e) {
      formattedTime = exchangeData.date.split(" ")[1].slice(0, 5); // fallback
    }
  }

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
      {exchangeData?.rate && (
        <div className="text-[10px] text-muted-foreground mt-2 text-center opacity-70">
          USD/BRL {exchangeData.rate.toFixed(2).replace(".", ",")} — cotação de {formattedTime}
        </div>
      )}
    </div>
  );
}
