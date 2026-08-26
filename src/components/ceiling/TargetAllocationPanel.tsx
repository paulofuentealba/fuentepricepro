import { useState, useEffect } from "react";
import {
  PieChart,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  Percent,
  Sliders,
  Filter,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-provider";
import type { AssetType } from "@/lib/domain";
import { cn } from "@/lib/utils";
import {
  ALLOCATION_TOLERANCE_PCT,
  calculateAllocationDeviation,
  isOutOfTolerance,
} from "@/lib/allocation";
import { CLASS_MARKET_REFERENCE_YIELDS } from "@/lib/calculations";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

const ASSET_TYPES: AssetType[] = [
  "STOCK_BR",
  "FII",
  "FII_INFRA",
  "FIAGRO",
  "STOCK_US",
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
  classTargetYields?: Partial<Record<AssetType, number>>;
  onClassTargetYieldsChange?: (yields: Partial<Record<AssetType, number>>) => void;
  excludeAboveCeiling?: boolean;
  onExcludeAboveCeilingChange?: (val: boolean) => void;
  excludeYieldTraps?: boolean;
  onExcludeYieldTrapsChange?: (val: boolean) => void;
}

export function TargetAllocationPanel({
  targets,
  onChange,
  maxConcentration,
  onMaxConcentrationChange,
  currentAllocationPct,
  classTargetYields,
  onClassTargetYieldsChange,
  excludeAboveCeiling = false,
  onExcludeAboveCeilingChange,
  excludeYieldTraps = false,
  onExcludeYieldTrapsChange,
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

  const handleClassYieldChange = (type: AssetType, val: string) => {
    if (!onClassTargetYieldsChange) return;
    const current = { ...(classTargetYields || {}) };
    if (val === "" || val === null || val === undefined) {
      delete current[type];
    } else {
      const num = parseFloat(val);
      if (Number.isFinite(num) && num >= 0) {
        current[type] = num;
      }
    }
    onClassTargetYieldsChange(current);
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
        <div className="border-t border-border/60 p-4 space-y-6">
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/80" />
            <p className="leading-snug">{t.smartAllocation.legalDisclaimer}</p>
          </div>

          {/* 1. Metas de Alocação por Classe */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {t.smartAllocation.targetPanelTitle}
              </h4>
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
          </div>

          {/* 2. Yield-Alvo por Classe (Hierarquia Nível 2) */}
          {onClassTargetYieldsChange && (
            <div className="pt-4 border-t border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <Percent className="h-4 w-4 text-accent" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {t.smartAllocation.classTargetYieldsTitle}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {t.smartAllocation.classTargetYieldsDesc}
              </p>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {ASSET_TYPES.map((type) => {
                  const refYield = CLASS_MARKET_REFERENCE_YIELDS[type] ?? 6.0;
                  const customVal = classTargetYields?.[type];
                  const hasCustom = customVal !== undefined && customVal !== null;

                  return (
                    <div key={type} className="space-y-1.5 bg-card/30 p-2.5 rounded-lg border border-border/40">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground truncate">
                          {t.types[type] || type}
                        </Label>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 border-muted-foreground/30 text-muted-foreground shrink-0"
                          title={`${t.smartAllocation.marketRef}: ${refYield.toFixed(1)}%`}
                        >
                          {refYield.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={hasCustom ? customVal : ""}
                          onChange={(e) => handleClassYieldChange(type, e.target.value)}
                          className={cn(
                            "pr-6 h-8 text-sm",
                            hasCustom ? "font-semibold text-primary border-primary/50" : "",
                          )}
                          placeholder={`${refYield.toFixed(1)}`}
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 flex items-center justify-between">
                        <span>{t.smartAllocation.marketRef}</span>
                        <span>{refYield.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Limites de Concentração e Critérios de Exclusão */}
          <div className="pt-4 border-t border-border/60 space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {t.smartAllocation.exclusionCriteriaTitle}
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Teto de Concentração por Ativo */}
              <div className="space-y-1.5 bg-card/30 p-3 rounded-lg border border-border/40">
                <Label className="text-xs font-semibold text-foreground">
                  {t.smartAllocation.maxConcentrationLabel}
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t.smartAllocation.maxConcentrationHint}
                </p>
                <div className="relative max-w-xs">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={maxConcentration === null ? "" : maxConcentration}
                    onChange={(e) => {
                      const val = e.target.value;
                      onMaxConcentrationChange(val === "" ? null : parseFloat(val));
                    }}
                    className="pr-6 h-8 text-sm"
                    placeholder={t.smartAllocation.maxConcentrationPlaceholder}
                  />
                  <span className="absolute right-3 top-1.5 text-xs text-muted-foreground">%</span>
                </div>
              </div>

              {/* Toggles de Exclusão Regulatórios */}
              <div className="space-y-3 bg-card/30 p-3 rounded-lg border border-border/40">
                {onExcludeAboveCeilingChange && (
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={excludeAboveCeiling}
                      onChange={(e) => onExcludeAboveCeilingChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-medium text-foreground block">
                        {t.smartAllocation.excludeAboveCeilingLabel}
                      </span>
                      <span className="text-[11px] text-muted-foreground block leading-tight">
                        {t.smartAllocation.excludeAboveCeilingDesc}
                      </span>
                    </div>
                  </label>
                )}

                {onExcludeYieldTrapsChange && (
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={excludeYieldTraps}
                      onChange={(e) => onExcludeYieldTrapsChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-medium text-foreground block">
                        {t.smartAllocation.excludeYieldTrapsLabel}
                      </span>
                      <span className="text-[11px] text-muted-foreground block leading-tight">
                        {t.smartAllocation.excludeYieldTrapsDesc}
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
