import { useState, useEffect } from "react";
import { PieChart, ChevronDown, ChevronUp, AlertTriangle, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n-provider";
import type { AssetType } from "@/lib/domain";
import { cn } from "@/lib/utils";
import {
  ALLOCATION_TOLERANCE_PCT,
  calculateAllocationDeviation,
  isOutOfTolerance,
} from "@/lib/allocation";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

const ASSET_TYPES: AssetType[] = [
  "STOCK_BR",
  "STOCK_US",
  "FII",
  "REIT",
  "ETF",
  "FIXED_INCOME",
];

interface Props {
  targets: Record<AssetType, number>;
  onChange: (newTargets: Record<AssetType, number>) => void;
  maxConcentration: number | null;
  onMaxConcentrationChange: (val: number | null) => void;
  currentAllocationPct?: Record<AssetType, number>;
}

export function TargetAllocationPanel({
  targets,
  onChange,
  maxConcentration,
  onMaxConcentrationChange,
  currentAllocationPct,
}: Props) {
  const { t } = useI18n();
  const [total, setTotal] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const sum = Object.values(targets).reduce((a, b) => a + (b || 0), 0);
    setTotal(sum);
  }, [targets]);

  const handleChange = (type: AssetType, val: string | number) => {
    const num = val === "" ? 0 : typeof val === "string" ? parseFloat(val) : val;
    onChange({ ...targets, [type]: num });
  };

  return (
    <div className="rounded-lg border border-border/60 bg-background/40">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            {t.smartAllocation.targetPanelTitle}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs font-medium",
              total === 100
                ? "text-success"
                : total > 100
                  ? "text-danger"
                  : "text-muted-foreground",
            )}
          >
            {t.smartAllocation.targetTotal.replace("{{total}}", String(total))}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/60 p-4">
          <div className="mb-4 flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p className="leading-snug">{t.smartAllocation.legalDisclaimer}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ASSET_TYPES.map((type) => {
              const targetVal = targets[type] || 0;
              const currentVal = currentAllocationPct?.[type] ?? null;
              const deviation = calculateAllocationDeviation(currentVal, targetVal);
              const isOut = isOutOfTolerance(currentVal, targetVal, ALLOCATION_TOLERANCE_PCT);
              const isOver = deviation !== null && deviation > 0;
              const absDevStr = deviation !== null ? Math.abs(deviation).toFixed(1) : "";

              const tooltipText = isOver
                ? t.smartAllocation.overAllocatedTooltip.replace("{{diff}}", absDevStr)
                : t.smartAllocation.underAllocatedTooltip.replace("{{diff}}", absDevStr);

              return (
                <div key={type} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">{t.types[type] || type}</Label>
                    {isOut && (
                      <InfoTooltip
                        icon={
                          <AlertTriangle
                            className={cn(
                              "h-3.5 w-3.5",
                              isOver ? "text-warning" : "text-comparison",
                            )}
                          />
                        }
                        content={tooltipText}
                      />
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={targets[type] === 0 ? "" : targets[type]}
                      onChange={(e) => handleChange(type, e.target.value)}
                      className="pr-6 h-8 text-sm"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
                  </div>
                  <Slider
                    aria-label={t.smartAllocation.adjustTargetAllocation}
                    min={0}
                    max={100}
                    step={1}
                    value={[targetVal]}
                    onValueChange={(val) => handleChange(type, val[0])}
                    className="mt-2"
                  />
                  {currentVal !== null && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">
                        {t.smartAllocation.currentAllocationPct.replace(
                          "{{pct}}",
                          currentVal.toFixed(1),
                        )}
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          isOut
                            ? isOver
                              ? "text-warning"
                              : "text-comparison"
                            : "text-muted-foreground",
                        )}
                      >
                        {t.smartAllocation.allocationDeviation.replace(
                          "{{pct}}",
                          (deviation! > 0 ? "+" : "") + deviation!.toFixed(1),
                        )}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {total !== 100 && (
            <div
              className={cn(
                "mt-4 text-xs font-medium",
                total > 100 ? "text-danger" : "text-muted-foreground",
              )}
            >
              {t.smartAllocation.targetTotalIdeal}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border/60">
            <div className="space-y-1.5 max-w-sm">
              <Label className="text-sm font-semibold text-foreground">
                {t.smartAllocation.maxConcentrationLabel}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t.smartAllocation.maxConcentrationHint}
              </p>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={maxConcentration === null ? "" : maxConcentration}
                  onChange={(e) => {
                    const val = e.target.value;
                    onMaxConcentrationChange(val === "" ? null : parseFloat(val));
                  }}
                  className="pr-6 h-9 text-sm"
                  placeholder={t.smartAllocation.maxConcentrationPlaceholder}
                />
                <span className="absolute right-3 top-2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
