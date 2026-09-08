import { useState, useMemo } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useI18n } from "@/lib/i18n-provider";
import { useUserSettings } from "@/lib/useUserSettings";
import type { AssetType } from "@/lib/domain";
import { CLASS_MARKET_REFERENCE_YIELDS } from "@/lib/calculations";
import { cn } from "@/lib/utils";

const DEFAULT_BR_ASSET_TYPES: AssetType[] = [
  "STOCK_BR",
  "FII",
  "STOCK_US",
  "REIT",
  "ETF",
  "FIXED_INCOME",
];

const DEFAULT_US_ASSET_TYPES: AssetType[] = [
  "STOCK_US",
  "REIT",
  "ETF",
  "FIXED_INCOME",
];

export interface GoalWizardProps {
  /** Called after the user clicks "Salvar critérios". Optional — the component also works as a
   * standalone settings editor when embedded without a completion callback. */
  onComplete?: () => void;
}

/**
 * Metas e Critérios (Item 3.6 / Módulo 6) — réplica da aba "Metas e critérios" de
 * Perfil/Configurações do protótipo v6 (não é um wizard multi-passo: os 2 cards — Metas por
 * classe e Critérios de exclusão — ficam juntos numa única página, com um botão "Salvar" no fim,
 * igual ao protótipo).
 *
 * Opera diretamente sobre UserSettings (smartAllocationTargets, classTargetYields,
 * excludeAboveCeiling, excludeYieldTraps, maxConcentrationPerAsset) — os mesmos campos já
 * consumidos pelo AskEngine em Reinvestir e Plano de Aporte.
 *
 * Adapta dinamicamente as classes de ativo com base na jurisdição fiscal:
 * Para US (taxJurisdiction === "US"), foca nativamente em STOCK_US, REIT, ETF, FIXED_INCOME,
 * com um botão para ativar classes B3 (STOCK_BR, FII) se desejado.
 */
export function GoalWizard({ onComplete }: GoalWizardProps) {
  const { t } = useI18n();
  const { settings, updateSettings } = useUserSettings();
  const isUS = settings.taxJurisdiction === "US";

  const [showBrAssets, setShowBrAssets] = useState<boolean>(() => {
    return Boolean(
      (settings.smartAllocationTargets?.STOCK_BR || 0) > 0 ||
      (settings.smartAllocationTargets?.FII || 0) > 0,
    );
  });

  const activeAssetTypes = useMemo(() => {
    if (!isUS || showBrAssets) {
      return DEFAULT_BR_ASSET_TYPES;
    }
    return DEFAULT_US_ASSET_TYPES;
  }, [isUS, showBrAssets]);

  const targets = settings.smartAllocationTargets;
  const total = activeAssetTypes.reduce((sum, type) => sum + (targets[type] || 0), 0);
  const isTotalOk = total === 100;

  const handleTargetChange = (type: AssetType, val: string | number) => {
    const num = val === "" ? 0 : typeof val === "string" ? parseFloat(val) : val;
    updateSettings({ smartAllocationTargets: { ...targets, [type]: Number.isFinite(num) ? num : 0 } });
  };

  const applyUsBenchmark = () => {
    updateSettings({
      smartAllocationTargets: {
        ...targets,
        STOCK_US: 45,
        REIT: 25,
        ETF: 30,
        FIXED_INCOME: 0,
        STOCK_BR: 0,
        FII: 0,
      },
    });
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
    <div className="space-y-4">
      {/* Card 1: Metas por classe de ativo */}
      <div className="rounded-[18px] border border-border/60 bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h3 className="font-serif text-lg font-semibold text-foreground">
              {t.goalWizard.step1Question}
            </h3>
            {t.goalWizard.step1Helper && (
              <InfoTooltip content={t.goalWizard.step1Helper} />
            )}
          </div>
          <Badge
            className={cn(
              "font-mono font-semibold",
              isTotalOk
                ? "border-transparent bg-success/15 text-success"
                : "border-transparent bg-muted text-muted-foreground",
            )}
          >
            {t.smartAllocation.targetTotal.replace("{{total}}", String(total))}
          </Badge>
        </div>

        {isUS && !showBrAssets && total === 0 && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3.5">
            <p className="text-xs leading-relaxed text-foreground">
              {t.goalWizard.usBenchmarkPrompt}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 shrink-0 text-xs font-semibold self-start sm:self-auto"
              onClick={applyUsBenchmark}
            >
              {t.goalWizard.applyUsBenchmark}
            </Button>
          </div>
        )}

        {activeAssetTypes.map((type) => (
          <div key={type} className="mb-3 flex items-center gap-3.5 last:mb-0">
            <span className="flex w-[110px] shrink-0 items-center gap-1 text-[12.5px] font-display font-medium text-foreground sm:w-[130px]">
              {t.types[type] || type}
              {t.smartAllocation.assetClassExplainers[type] && (
                <InfoTooltip content={t.smartAllocation.assetClassExplainers[type]} />
              )}
            </span>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[targets[type] || 0]}
              onValueChange={(val) => handleTargetChange(type, val[0])}
              aria-label={t.smartAllocation.adjustTargetAllocation}
              className="flex-1"
            />
            <span className="w-[52px] shrink-0 text-right font-mono text-sm font-semibold text-foreground">
              {targets[type] || 0}%
            </span>
          </div>
        ))}

        {isUS && (
          <div className="mt-3.5 flex items-center justify-between border-t border-border/40 pt-3">
            <span className="text-xs text-muted-foreground">
              {showBrAssets ? t.goalWizard.brAssetsNote : t.goalWizard.includeBrAssets}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowBrAssets(!showBrAssets)}
            >
              {showBrAssets ? t.goalWizard.hideBrAssets : t.goalWizard.includeBrAssets}
            </Button>
          </div>
        )}

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

        {isUS && !showBrAssets && (
          <div className="mt-2.5 flex justify-end">
            <button
              type="button"
              onClick={applyUsBenchmark}
              className="text-[11px] font-medium text-accent-text hover:underline"
            >
              {t.goalWizard.applyUsBenchmark}
            </button>
          </div>
        )}
      </div>

      {/* Card 2: Critérios de exclusão */}
      <div className="rounded-[18px] border border-border/60 bg-card p-4 sm:p-5">
        <h3 className="mb-3.5 font-serif text-lg font-semibold text-foreground">
          {t.smartAllocation.exclusionCriteriaTitle}
        </h3>

        {/* Yield-alvo por classe */}
        <div className="mb-3 flex items-center gap-1.5">
          <span className="text-[12.5px] font-display font-semibold text-foreground">
            {t.smartAllocation.classTargetYieldsTitle}
          </span>
          {t.smartAllocation.classTargetYieldsDesc && (
            <InfoTooltip content={t.smartAllocation.classTargetYieldsDesc} />
          )}
        </div>
        {activeAssetTypes.map((type) => {
          const refYield =
            isUS && type === "FIXED_INCOME"
              ? 5.0
              : CLASS_MARKET_REFERENCE_YIELDS[type] ?? 6.0;
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

        {/* Toggles de exclusão + concentração máxima com InfoTooltips */}
        <div className="mt-4 space-y-2.5">
          <div
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 transition-colors",
              settings.excludeAboveCeiling
                ? "border-accent/60 bg-accent/10"
                : "border-border bg-card",
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-display font-semibold text-foreground">
                {t.smartAllocation.excludeAboveCeilingLabel}
              </span>
              {t.smartAllocation.excludeAboveCeilingDesc && (
                <InfoTooltip content={t.smartAllocation.excludeAboveCeilingDesc} />
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.excludeAboveCeiling}
              onClick={() => updateSettings({ excludeAboveCeiling: !settings.excludeAboveCeiling })}
              className={cn(
                "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                settings.excludeAboveCeiling ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                  settings.excludeAboveCeiling ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          <div
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 transition-colors",
              settings.excludeYieldTraps
                ? "border-accent/60 bg-accent/10"
                : "border-border bg-card",
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-display font-semibold text-foreground">
                {t.smartAllocation.excludeYieldTrapsLabel}
              </span>
              {t.smartAllocation.excludeYieldTrapsDesc && (
                <InfoTooltip content={t.smartAllocation.excludeYieldTrapsDesc} />
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.excludeYieldTraps}
              onClick={() => updateSettings({ excludeYieldTraps: !settings.excludeYieldTraps })}
              className={cn(
                "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                settings.excludeYieldTraps ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                  settings.excludeYieldTraps ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Limite de concentração: input numérico compacto com InfoTooltip */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-display font-semibold text-foreground">
                {t.smartAllocation.maxConcentrationLabel}
              </span>
              {t.smartAllocation.maxConcentrationHint && (
                <InfoTooltip content={t.smartAllocation.maxConcentrationHint} />
              )}
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

        <div className="mt-4 rounded-xl bg-muted/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
          {t.smartAllocation.legalDisclaimer}
        </div>

        <Button className="mt-4 gap-1.5" onClick={() => onComplete?.()}>
          <Check className="h-4 w-4" />
          {t.goalWizard.finishBtn}
        </Button>
      </div>
    </div>
  );
}
