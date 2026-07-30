import type { Currency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";

export type ViewMode = "combo" | "bars" | "line"; // Keeping type just in case, but unused in header.

interface Props {
  title: string;
  availableCurrencies: Currency[];
  activeCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
}

export function CashFlowHeader({
  title,
  availableCurrencies,
  activeCurrency,
  onCurrencyChange,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex flex-wrap items-center gap-2">
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
