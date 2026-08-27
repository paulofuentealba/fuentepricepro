import { useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
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
        <div className="space-y-5">
          <div>
            <h2 className="font-serif text-2xl font-medium leading-tight text-foreground">
              {t.goalWizard.step1Question}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {t.goalWizard.step1Helper}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            {ASSET_TYPES.map((type) => (
              <div key={type} className="mb-3 flex items-center gap-3.5 last:mb-0">
                <span className="w-[110px] shrink-0 text-[12.5px] font-display font-medium text-foreground sm:w-[130px]">
                  {t.types[type] || type}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={targets[type] || 0}
                  onChange={(e) => handleTargetChange(type, e.target.value)}
                  aria-label={t.smartAllocation.adjustTargetAllocation}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />
                <span className="w-[52px] shrink-0 text-right font-mono text-sm font-semibold text-foreground">
                  {targets[type] || 0}%
                </span>
              </div>
            ))}

            <div
              className={cn(
                "mt-3 flex items-center justify-between rounded-xl px-4 py-3 text-[12.5px] font-display font-semibold",
                isTotalOk ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
              )}
            >
              <span>
                {t.smartAllocation.targetTotal.replace("{{total}}", String(total))} {isTotalOk ? "✓" : ""}
              </span>
              {!isTotalOk && <span>{t.smartAllocation.targetTotalIdeal}</span>}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)}>{t.goalWizard.continueBtn}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h2 className="font-serif text-2xl font-medium leading-tight text-foreground">
              {t.goalWizard.step2Question}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {t.goalWizard.step2Helper}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            {/* Yield-alvo por classe */}
            <div className="mb-3.5">
              <span className="text-[12.5px] font-display font-semibold text-foreground">
                {t.smartAllocation.classTargetYieldsTitle}
              </span>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {t.smartAllocation.classTargetYieldsDesc}
              </p>
            </div>
            {ASSET_TYPES.map((type) => {
              const refYield = CLASS_MARKET_REFERENCE_YIELDS[type] ?? 6.0;
              const customVal = classTargetYields[type];
              const hasCustom = customVal !== undefined && customVal !== null;
              return (
                <div key={type} className="mb-2.5 flex items-center gap-3 last:mb-0">
                  <span className="w-[90px] shrink-0 text-[12.5px] font-display font-semibold text-foreground sm:w-[100px]">
                    {t.types[type] || type}
                  </span>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={hasCustom ? customVal : ""}
                    onChange={(e) => handleClassYieldChange(type, e.target.value)}
                    className={cn(
                      "h-7 max-w-[90px] text-center font-mono text-sm font-semibold",
                      hasCustom && "border-primary/50 text-primary",
                    )}
                    placeholder={refYield.toFixed(1)}
                  />
                  <span className="text-[10.5px] text-muted-foreground">
                    {t.smartAllocation.marketRef}: {refYield.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Critérios de exclusão — toggles no estilo .opt do protótipo */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => updateSettings({ excludeAboveCeiling: !settings.excludeAboveCeiling })}
              className={cn(
                "w-full rounded-2xl border p-3.5 text-left transition-colors",
                settings.excludeAboveCeiling
                  ? "border-accent bg-accent/10"
                  : "border-border/60 bg-card hover:border-border",
              )}
            >
              <div className="text-[13.5px] font-display font-semibold text-foreground">
                {t.smartAllocation.excludeAboveCeilingLabel}
              </div>
              <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                {t.smartAllocation.excludeAboveCeilingDesc}
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ excludeYieldTraps: !settings.excludeYieldTraps })}
              className={cn(
                "w-full rounded-2xl border p-3.5 text-left transition-colors",
                settings.excludeYieldTraps
                  ? "border-accent bg-accent/10"
                  : "border-border/60 bg-card hover:border-border",
              )}
            >
              <div className="text-[13.5px] font-display font-semibold text-foreground">
                {t.smartAllocation.excludeYieldTrapsLabel}
              </div>
              <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                {t.smartAllocation.excludeYieldTrapsDesc}
              </div>
            </button>

            <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5">
              <div className="flex-1">
                <div className="text-[13.5px] font-display font-semibold text-foreground">
                  {t.smartAllocation.maxConcentrationLabel}
                </div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  {t.smartAllocation.maxConcentrationHint}
                </div>
              </div>
              <div className="relative w-16 shrink-0">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.maxConcentrationPerAsset ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateSettings({ maxConcentrationPerAsset: val === "" ? null : parseFloat(val) });
                  }}
                  className="h-8 pr-5 text-center font-mono text-sm"
                  placeholder={t.smartAllocation.maxConcentrationPlaceholder}
                />
                <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
            {t.smartAllocation.legalDisclaimer}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
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
