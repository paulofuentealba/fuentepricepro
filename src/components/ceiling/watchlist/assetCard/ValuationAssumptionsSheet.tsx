import React, { useState, useCallback, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuationAssumption, ValuationResult } from "@/lib/calculations";
import type { Currency } from "@/lib/domain";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { ShieldCheck, Sliders, CheckCircle2, X } from "lucide-react";
import { useUserSettings } from "@/lib/useUserSettings";
import { cn } from "@/lib/utils";

export interface ValuationAssumptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  currency?: Currency;
  valuation?: ValuationResult | null;
  onUpdateAssumption?: (key: string, value: number) => void;
  /** When true, shows skeleton during server round-trip */
  isUpdating?: boolean;
}

export function ValuationAssumptionsSheet({
  isOpen,
  onClose,
  ticker,
  currency = "BRL",
  valuation,
  onUpdateAssumption,
  isUpdating = false,
}: ValuationAssumptionsSheetProps) {
  const { t, locale } = useI18n();
  const { settings, updateSettings } = useUserSettings();
  const [isAdvanced, setIsAdvanced] = useState(settings.valuationAssumptionsMode === "advanced");
  const [customValues, setCustomValues] = useState<Record<string, number>>({});
  const [debounceTimers, setDebounceTimers] = useState<Record<string, NodeJS.Timeout>>({});

  // Persist mode preference to backend
  const handleModeChange = useCallback(
    (advanced: boolean) => {
      setIsAdvanced(advanced);
      updateSettings({ valuationAssumptionsMode: advanced ? "advanced" : "simple" });
    },
    [updateSettings],
  );

  // Handle slider change with debounce (300ms) - sends to backend
  const handleSliderChange = useCallback(
    (key: string, val: number) => {
      setCustomValues((prev) => ({ ...prev, [key]: val }));

      // Clear existing debounce timer for this key
      if (debounceTimers[key]) {
        clearTimeout(debounceTimers[key]);
      }

      const timer = setTimeout(() => {
        onUpdateAssumption?.(key, val);
      }, 300);

      setDebounceTimers((prev) => ({ ...prev, [key]: timer }));
    },
    [debounceTimers, onUpdateAssumption],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers).forEach((timer) => clearTimeout(timer));
    };
  }, [debounceTimers]);

  const handleReset = useCallback(() => {
    setCustomValues({});
    // Also clear any pending debounced updates
    Object.values(debounceTimers).forEach((timer) => clearTimeout(timer));
    setDebounceTimers({});
  }, [debounceTimers]);

  if (!valuation) return null;

  const assumptions = valuation.assumptions || [];

  const getConfidenceText = (badge: 1 | 2 | 3 | 4) => {
    switch (badge) {
      case 4:
        return t.valuationAssumptions.confidenceLevel4;
      case 3:
        return t.valuationAssumptions.confidenceLevel3;
      case 2:
        return t.valuationAssumptions.confidenceLevel2;
      default:
        return t.valuationAssumptions.confidenceLevel1;
    }
  };

  const renderConfidenceDots = (badge: 1 | 2 | 3 | 4) => {
    const dots = "●".repeat(badge) + "○".repeat(4 - badge);
    const colorClass =
      badge === 4
        ? "text-success"
        : badge === 3
          ? "text-primary"
          : badge === 2
            ? "text-warning"
            : "text-muted-foreground";

    return (
      <span
        className={`font-mono text-xs tracking-widest ${colorClass}`}
        title={getConfidenceText(badge)}
      >
        {dots}
      </span>
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh] sm:max-h-[70vh]">
        <DrawerHeader className="px-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2 text-lg font-bold">
              <Sliders className="h-5 w-5 text-primary" />
              {t.valuationAssumptions.title} — {ticker}
            </DrawerTitle>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DrawerDescription className="text-xs text-muted-foreground mt-1">
            {t.valuationAssumptions.subtitle}
          </DrawerDescription>
        </DrawerHeader>

        {/* Simple / Advanced Toggle */}
        <div className="mx-4 my-2 flex items-center justify-center rounded-lg bg-muted/40 p-1">
          <Button
            type="button"
            variant={!isAdvanced ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => handleModeChange(false)}
          >
            {t.valuationAssumptions.simpleMode}
          </Button>
          <Button
            type="button"
            variant={isAdvanced ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => handleModeChange(true)}
          >
            <Sliders className="mr-1.5 h-3.5 w-3.5" />
            {t.valuationAssumptions.advancedMode}
          </Button>
        </div>

        {/* Content Area */}
        <div className="mx-4 mb-4 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {!isAdvanced ? (
            /* Simple Mode: Executive Consensus Summary */
            <div className="space-y-3 rounded-lg border border-border/50 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.valuationAssumptions.consensusLabel}
                </span>
                <span className="text-base font-bold text-foreground">
                  {valuation.fuenteConsensus != null
                    ? formatCurrency(valuation.fuenteConsensus, currency, locale)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.valuationAssumptions.activeCeilingLabel}
                </span>
                <span className="text-sm font-semibold text-primary">
                  {valuation.activeCeiling != null
                    ? formatCurrency(valuation.activeCeiling, currency, locale)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.valuationAssumptions.safetyMarginLabel}
                </span>
                <span
                  className={`text-sm font-bold ${valuation.positive ? "text-success" : "text-danger"}`}
                >
                  {valuation.margin != null
                    ? `${valuation.margin > 0 ? "+" : ""}${formatNumber(valuation.margin, locale, 1)}%`
                    : "—"}
                </span>
              </div>

              {/* Active Preset Badge */}
              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.valuationAssumptions.modePreference}
                </span>
                <Badge variant="outline" className="text-xs">
                  {t.valuationAssumptions.simpleModeDesc}
                </Badge>
              </div>

              {/* Data Reliability Overview */}
              <div className="mt-4 rounded-md bg-muted/30 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  {t.valuationAssumptions.confidence}
                </div>
                <p className="mt-1 text-muted-foreground">
                  {t.valuationAssumptions.auditDisclaimer}
                </p>
              </div>
            </div>
          ) : (
            /* Advanced Mode: DTO-Driven Assumptions Map */
            <div className="space-y-4">
              {isUpdating && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center text-xs text-primary">
                  {t.valuationAssumptions.updating}
                </div>
              )}
              {assumptions.map((item) => {
                const effectiveValue = customValues[item.key] ?? item.value;
                const min = item.suggestedRange?.min ?? 0;
                const max = item.suggestedRange?.max ?? 20;

                return (
                  <div
                    key={item.key}
                    className="space-y-2 rounded-lg border border-border/50 bg-card p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                          {item.label}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {item.helperText}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        {renderConfidenceDots(item.confidenceBadge)}
                        <span className="mt-1 font-mono text-xs font-bold text-primary">
                          {effectiveValue.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Interactive Slider */}
                    <div className="pt-2">
                      <Slider
                        value={[effectiveValue]}
                        min={min}
                        max={max}
                        step={0.25}
                        onValueChange={(vals) => handleSliderChange(item.key, vals[0])}
                        className="py-1"
                        disabled={isUpdating}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground/70">
                        <span>{min}%</span>
                        <span>{max}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mx-4 mb-4 flex items-center justify-between pt-2 border-t border-border/40">
          {isAdvanced ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={handleReset}
            >
              {t.valuationAssumptions.resetDefaults}
            </Button>
          ) : (
            <div />
          )}
          <Button type="button" size="sm" className="text-xs" onClick={onClose}>
            {t.valuationAssumptions.close}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
