import { cn } from "@/lib/utils";

interface CurrencyToggleProps {
  value: "BR" | "US";
  onChange: (val: "BR" | "US") => void;
  className?: string;
}

export function CurrencyToggle({ value, onChange, className }: CurrencyToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-slate-900/40 p-1 border border-border/40 shadow-inner",
        className,
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
  );
}
