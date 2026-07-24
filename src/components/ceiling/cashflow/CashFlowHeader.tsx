import { BarChart3, Download, LineChart as LineChartIcon } from "lucide-react";
import type { Currency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";

export type ViewMode = "combo" | "bars" | "line"; // Keeping type just in case, but unused in header.

interface Props {
  title: string;
  onExportCsv: () => void;
  availableCurrencies: Currency[];
  activeCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
}

export function CashFlowHeader({
  title,
  onExportCsv,
  availableCurrencies,
  activeCurrency,
  onCurrencyChange,
}: Props) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-label={isEn ? "Export CSV" : "Exportar CSV"}
        >
          <Download className="h-3 w-3" />
          CSV
        </button>
        {availableCurrencies.length > 0 && (
          <div className="block">
            <CurrencyToggle
              value={activeCurrency === "USD" ? "US" : "BR"}
              onChange={(v) => onCurrencyChange(v === "US" ? "USD" : "BRL")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
