import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuationAssumption, ValuationResult } from "@/lib/calculations";
import { ShieldCheck, Info, Sparkles, Sliders, CheckCircle2 } from "lucide-react";

export interface ValuationAssumptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  valuation?: ValuationResult | null;
  onUpdateAssumption?: (key: string, value: number) => void;
}

export function ValuationAssumptionsModal({
  isOpen,
  onClose,
  ticker,
  valuation,
  onUpdateAssumption,
}: ValuationAssumptionsModalProps) {
  const { t } = useI18n();
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

  if (!valuation) return null;

  const assumptions = valuation.assumptions || [];

  const handleSliderChange = (key: string, val: number) => {
    setCustomValues((prev) => ({ ...prev, [key]: val }));
    onUpdateAssumption?.(key, val);
  };

  const handleReset = () => {
    setCustomValues({});
  };

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
      <span className={`font-mono text-xs tracking-widest ${colorClass}`} title={getConfidenceText(badge)}>
        {dots}
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-6 sm:rounded-xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              {t.valuationAssumptions.title} — {ticker}
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              {valuation.investorProfile}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t.valuationAssumptions.subtitle}
          </DialogDescription>
        </DialogHeader>

        {/* Simple / Advanced Toggle */}
        <div className="my-2 flex items-center justify-center rounded-lg bg-muted/40 p-1">
          <Button
            type="button"
            variant={!isAdvanced ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setIsAdvanced(false)}
          >
            {t.valuationAssumptions.simpleMode}
          </Button>
          <Button
            type="button"
            variant={isAdvanced ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setIsAdvanced(true)}
          >
            <Sliders className="mr-1.5 h-3.5 w-3.5" />
            {t.valuationAssumptions.advancedMode}
          </Button>
        </div>

        {/* Content Area */}
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {!isAdvanced ? (
            /* Simple Mode: Executive Consensus Summary */
            <div className="space-y-3 rounded-lg border border-border/50 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.valuationAssumptions.consensusLabel}
                </span>
                <span className="text-base font-bold text-foreground">
                  {valuation.fuenteConsensus != null ? `R$ ${valuation.fuenteConsensus.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.valuationAssumptions.activeCeilingLabel}
                </span>
                <span className="text-sm font-semibold text-primary">
                  {valuation.activeCeiling != null ? `R$ ${valuation.activeCeiling.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.valuationAssumptions.safetyMarginLabel}
                </span>
                <span className={`text-sm font-bold ${valuation.positive ? "text-success" : "text-danger"}`}>
                  {valuation.margin != null ? `${valuation.margin > 0 ? "+" : ""}${valuation.margin.toFixed(1)}%` : "—"}
                </span>
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
              {assumptions.map((item) => {
                const effectiveValue = customValues[item.key] ?? item.value;
                const min = item.suggestedRange?.min ?? 0;
                const max = item.suggestedRange?.max ?? 20;

                return (
                  <div key={item.key} className="space-y-2 rounded-lg border border-border/50 bg-card p-3.5">
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
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          {isAdvanced ? (
            <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleReset}>
              {t.valuationAssumptions.resetDefaults}
            </Button>
          ) : (
            <div />
          )}
          <Button type="button" size="sm" className="text-xs" onClick={onClose}>
            {t.valuationAssumptions.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
