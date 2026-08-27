import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
 * consumidos pelo AskEngine em Reinvestir e Plano de Aporte. Nenhum campo novo, nenhuma fórmula
 * nova: substitui o antigo TargetAllocationPanel (accordion) reutilizando os mesmos textos i18n
 * de t.smartAllocation.*.
 *
 * Mantém as 8 classes reais de AssetType (STOCK_BR, FII, FII_INFRA, FIAGRO, STOCK_US, REIT, ETF,
 * FIXED_INCOME) em vez dos 4 buckets agrupados do protótipo ("Exterior" = STOCK_US+REIT+ETF) —
 * decisão deliberada para não inventar uma regra de distribuição interna sem validação de
 * produto; consistente com a granularidade já usada em Watchlist e Realidade Fiscal.
 */
export function GoalWizard({ onComplete }: GoalWizardProps) {
  const { t } = useI18n();
  const { settings, updateSettings } = useUserSettings();

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
    <div className="space-y-4">
      {/* Card 1: Metas por classe de ativo */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {t.goalWizard.step1Question}
          </h3>
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
        <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
          {t.goalWizard.step1Helper}
        </p>

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

      {/* Card 2: Critérios de exclusão */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="mb-3.5 font-serif text-lg font-semibold text-foreground">
          {t.smartAllocation.exclusionCriteriaTitle}
        </h3>

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

        {/* Toggles de exclusão + concentração máxima, no estilo .opt do protótipo */}
        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={() => updateSettings({ excludeAboveCeiling: !settings.excludeAboveCeiling })}
            className={cn(
              "w-full rounded-2xl border p-3.5 text-left transition-colors",
              settings.excludeAboveCeiling
                ? "border-accent bg-accent/10"
                : "border-border/60 bg-background/40 hover:border-border",
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
                : "border-border/60 bg-background/40 hover:border-border",
            )}
          >
            <div className="text-[13.5px] font-display font-semibold text-foreground">
              {t.smartAllocation.excludeYieldTrapsLabel}
            </div>
            <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
              {t.smartAllocation.excludeYieldTrapsDesc}
            </div>
          </button>

          {/* Limite de concentração: input numérico (não um preset fixo em 40% como no
              protótipo) porque maxConcentrationPerAsset é configurável pelo usuário no modelo
              real de dados — ver nota de escopo no cabeçalho do componente. */}
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-3.5">
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
