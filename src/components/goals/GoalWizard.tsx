import { useState } from "react";
import { CheckCircle2, Sliders, Filter, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { useUserSettings } from "@/lib/useUserSettings";
import type { AssetType } from "@/lib/domain";
import { CLASS_MARKET_REFERENCE_YIELDS } from "@/lib/calculations";
import { cn } from "@/lib/utils";

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

export interface GoalWizardProps {
  /** Called after the user finishes step 2 ("Concluir"). Optional — the wizard also works as a
   * standalone settings editor when embedded without a completion callback. */
  onComplete?: () => void;
}

/**
 * Wizard de Metas (Item 3.6 / Módulo 6) — versão em duas etapas do fluxo `.wiz` do protótipo v6:
 * "Suas metas por classe de ativo" (sliders somando 100%) e "Seus critérios de exclusão"
 * (yield-alvo por classe + toggles + limite de concentração + disclaimer).
 *
 * Opera diretamente sobre UserSettings (smartAllocationTargets, classTargetYields,
 * excludeAboveCeiling, excludeYieldTraps, maxConcentrationPerAsset) — os mesmos campos já
 * consumidos pelo AskEngine em Reinvestir e Plano de Aporte. Nenhum campo novo, nenhuma fórmula
 * nova: substitui o antigo TargetAllocationPanel (accordion) por uma UI sequencial reutilizando
 * os mesmos textos i18n de t.smartAllocation.*.
 */
export function GoalWizard({ onComplete }: GoalWizardProps) {
  const { t } = useI18n();
  const { settings, updateSettings } = useUserSettings();
  const [step, setStep] = useState<1 | 2>(1);

  const targets = settings.smartAllocationTargets;
  const total = ASSET_TYPES.reduce((sum, type) => sum + (targets[type] || 0), 0);
  const isTotalOk = total === 100;

  const handleTargetChange = (type: AssetType, val: string | number) => {
    const num = val === "" ? 0 : typeof val === "string" ? parseFloat(val) : val;
    updateSettings({ smartAllocationTargets: { ...targets, [type]: Number.isFinite(num) ? num : 0 } });
  };

  const classTargetYields = settings.classTargetYields || {};
  const handleClassYieldChange = (type: AssetType, val: string) => {
    const next = { ...classTargetYields };
    if (val === "") {
      delete next[type];
    } else {
      const num = parseFloat(val);
      if (Number.isFinite(num) && num >= 0) next[type] = num;
    }
    updateSettings({ classTargetYields: next });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress dots */}
      <div className="flex items-center gap-2" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={2}>
        {[1, 2].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              s <= step ? "bg-accent" : "bg-muted",
            )}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
              <Sliders className="h-3.5 w-3.5" />
              {t.goalWizard.step1Eyebrow}
            </div>
            <h2 className="font-serif text-xl font-semibold text-foreground sm:text-2xl">
              {t.goalWizard.step1Question}
            </h2>
            <p className="text-sm text-muted-foreground">{t.goalWizard.step1Helper}</p>
          </div>

          <div className="space-y-5 rounded-xl border border-border/60 bg-card/50 p-4">
            {ASSET_TYPES.map((type) => (
              <div key={type} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-display font-medium text-foreground">
                    {t.types[type] || type}
                  </span>
                  <div className="relative w-20">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={targets[type] === 0 ? "" : targets[type]}
                      onChange={(e) => handleTargetChange(type, e.target.value)}
                      className="h-8 pr-6 text-right font-mono text-sm"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <Slider
                  aria-label={t.smartAllocation.adjustTargetAllocation}
                  min={0}
                  max={100}
                  step={1}
                  value={[targets[type] || 0]}
                  onValueChange={(val) => handleTargetChange(type, val[0])}
                />
              </div>
            ))}

            <div
              className={cn(
                "flex items-center justify-between rounded-lg px-4 py-3 text-sm font-display font-semibold",
                isTotalOk ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              <span>
                {t.smartAllocation.targetTotal.replace("{{total}}", String(total))} {isTotalOk ? "✓" : "✗"}
              </span>
              {!isTotalOk && <span className="font-mono text-xs">{t.smartAllocation.targetTotalIdeal}</span>}
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="gap-1.5" onClick={() => setStep(2)}>
              {t.goalWizard.continueBtn}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              {t.smartAllocation.exclusionCriteriaTitle}
            </div>
            <h2 className="font-serif text-xl font-semibold text-foreground sm:text-2xl">
              {t.goalWizard.step2Question}
            </h2>
            <p className="text-sm text-muted-foreground">{t.goalWizard.step2Helper}</p>
          </div>

          {/* Yield-alvo por classe */}
          <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
            <div>
              <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-foreground">
                {t.smartAllocation.classTargetYieldsTitle}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{t.smartAllocation.classTargetYieldsDesc}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ASSET_TYPES.map((type) => {
                const refYield = CLASS_MARKET_REFERENCE_YIELDS[type] ?? 6.0;
                const customVal = classTargetYields[type];
                const hasCustom = customVal !== undefined && customVal !== null;
                return (
                  <div key={type} className="space-y-1 rounded-lg border border-border/40 bg-background/40 p-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[11px] font-display font-medium text-foreground">
                        {t.types[type] || type}
                      </span>
                      <Badge variant="outline" className="shrink-0 px-1 py-0 font-mono text-[9px] text-muted-foreground">
                        {refYield.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={hasCustom ? customVal : ""}
                        onChange={(e) => handleClassYieldChange(type, e.target.value)}
                        className={cn(
                          "h-8 pr-6 font-mono text-sm",
                          hasCustom && "border-primary/50 font-semibold text-primary",
                        )}
                        placeholder={refYield.toFixed(1)}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toggles + concentração máxima */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer select-none items-start gap-2.5 rounded-xl border border-border/60 bg-card/50 p-3">
              <input
                type="checkbox"
                checked={settings.excludeAboveCeiling ?? false}
                onChange={(e) => updateSettings({ excludeAboveCeiling: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="block text-xs font-display font-semibold text-foreground">
                  {t.smartAllocation.excludeAboveCeilingLabel}
                </span>
                <span className="block text-[11px] leading-tight text-muted-foreground">
                  {t.smartAllocation.excludeAboveCeilingDesc}
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer select-none items-start gap-2.5 rounded-xl border border-border/60 bg-card/50 p-3">
              <input
                type="checkbox"
                checked={settings.excludeYieldTraps ?? false}
                onChange={(e) => updateSettings({ excludeYieldTraps: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="block text-xs font-display font-semibold text-foreground">
                  {t.smartAllocation.excludeYieldTrapsLabel}
                </span>
                <span className="block text-[11px] leading-tight text-muted-foreground">
                  {t.smartAllocation.excludeYieldTrapsDesc}
                </span>
              </div>
            </label>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-3">
            <span className="block text-xs font-display font-semibold text-foreground">
              {t.smartAllocation.maxConcentrationLabel}
            </span>
            <span className="block text-[11px] text-muted-foreground mb-2">
              {t.smartAllocation.maxConcentrationHint}
            </span>
            <div className="relative max-w-[140px]">
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.maxConcentrationPerAsset ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateSettings({ maxConcentrationPerAsset: val === "" ? null : parseFloat(val) });
                }}
                className="h-8 pr-6 font-mono text-sm"
                placeholder={t.smartAllocation.maxConcentrationPlaceholder}
              />
              <span className="absolute right-3 top-1.5 text-xs text-muted-foreground">%</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground/80" />
            <p className="leading-snug">{t.smartAllocation.legalDisclaimer}</p>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" className="gap-1.5" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" />
              {t.goalWizard.backBtn}
            </Button>
            <Button className="gap-1.5" onClick={() => onComplete?.()}>
              <Check className="h-4 w-4" />
              {t.goalWizard.finishBtn}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
