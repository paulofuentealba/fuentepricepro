import type { Currency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar, Route } from "lucide-react";

interface Props {
  title: string;
  availableCurrencies: Currency[];
  activeCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
  mode: "calendar" | "journey";
  onModeChange: (m: "calendar" | "journey") => void;
}

export function CashFlowHeader({
  title,
  availableCurrencies,
  activeCurrency,
  onCurrencyChange,
  mode,
  onModeChange,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => {
            if (v) onModeChange(v as "calendar" | "journey");
          }}
          className="rounded-full border border-border/50 bg-background/50 p-1"
        >
          <ToggleGroupItem
            value="journey"
            aria-label={t.tabs.chart.myJourney}
            className="h-8 gap-1.5 rounded-full px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Route className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.tabs.chart.myJourney}</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="calendar"
            aria-label={t.tabs.chart.calendarYear}
            className="h-8 gap-1.5 rounded-full px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.tabs.chart.calendarYear}</span>
          </ToggleGroupItem>
        </ToggleGroup>
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
