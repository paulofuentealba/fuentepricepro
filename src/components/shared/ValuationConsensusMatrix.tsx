import { useState, useMemo, useCallback } from "react";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { Currency } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { Sliders, HelpCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MethodDetailSheet } from "@/components/ceiling/watchlist/MethodDetailSheet";

export type MethodType = "gordon" | "bazin" | "graham" | "lynch" | "consensus";

export interface ValuationData {
  bazin: number | null;
  graham: number | null;
  gordon: number | null;
  lynch?: number | null;
  consensus: number | null;
  margin?: number;
  methodDetails?: {
    gordon?: { formula: string; rate: number; growth: number; source: string; date: string; growthSource?: string };
    bazin?: { formula: string; yieldTarget: number; isNetJcp?: boolean; source: string; date: string };
    graham?: { formula: string; margin: number; source: string; date: string };
    lynch?: { formula: string; growth: number; dividendYield: number; source: string; date: string };
    consensus?: { methods: string[]; excluded: string[] };
  };
}

export interface ValuationConsensusMatrixProps {
  valuation: ValuationData;
  livePrice?: number;
  currency?: Currency;
  ticker?: string;
  showSensitivitySliders?: boolean;
  compact?: boolean;
  onApplyAssumptions?: (assumptions: { bazinYield: number; kDiscount: number; gGrowth: number }) => Promise<void> | void;
  className?: string;
}

export function ValuationConsensusMatrix({
  valuation,
  livePrice = 0,
  currency = "BRL",
  ticker,
  showSensitivitySliders = true,
  compact = false,
  onApplyAssumptions,
  className,
}: ValuationConsensusMatrixProps) {
  const { locale, t } = useI18n();
  const [mobileMethodOpen, setMobileMethodOpen] = useState<MethodType | null>(null);

  // Sliders state for interactive simulation
  const [bazinYield, setBazinYield] = useState<number>(
    valuation.methodDetails?.bazin?.yieldTarget ?? 6.0
  );
  const [kDiscount, setKDiscount] = useState<number>(
    valuation.methodDetails?.gordon?.rate ?? 11.0
  );
  const [gGrowth, setGGrowth] = useState<number>(
    valuation.methodDetails?.gordon?.growth ?? 5.0
  );
  const [isApplying, setIsApplying] = useState(false);

  // Recalculate dynamic values based on sliders
  const dynamicBazin = useMemo(() => {
    if (valuation.bazin == null || valuation.bazin <= 0) return null;
    const baseYield = valuation.methodDetails?.bazin?.yieldTarget ?? 6.0;
    if (baseYield <= 0 || bazinYield <= 0) return valuation.bazin;
    return (valuation.bazin * baseYield) / bazinYield;
  }, [valuation.bazin, valuation.methodDetails?.bazin?.yieldTarget, bazinYield]);

  const dynamicGordon = useMemo(() => {
    if (valuation.gordon == null || valuation.gordon <= 0) return null;
    const baseRate = valuation.methodDetails?.gordon?.rate ?? 11.0;
    const baseGrowth = valuation.methodDetails?.gordon?.growth ?? 5.0;
    const baseSpread = Math.max(0.5, baseRate - baseGrowth);
    const newSpread = Math.max(0.5, kDiscount - gGrowth);
    return (valuation.gordon * baseSpread) / newSpread;
  }, [valuation.gordon, valuation.methodDetails?.gordon?.rate, valuation.methodDetails?.gordon?.growth, kDiscount, gGrowth]);

  const dynamicGraham = valuation.graham;
  const dynamicLynch = valuation.lynch ?? null;

  // Consensus synthesis
  const activeMethods = useMemo(() => {
    const list: { name: string; val: number; key: MethodType }[] = [];
    if (dynamicBazin != null && Number.isFinite(dynamicBazin) && dynamicBazin > 0) {
      list.push({ name: "Décio Bazin", val: dynamicBazin, key: "bazin" });
    }
    if (dynamicGraham != null && Number.isFinite(dynamicGraham) && dynamicGraham > 0) {
      list.push({ name: "Benjamin Graham", val: dynamicGraham, key: "graham" });
    }
    if (dynamicGordon != null && Number.isFinite(dynamicGordon) && dynamicGordon > 0) {
      list.push({ name: "Gordon (DDM)", val: dynamicGordon, key: "gordon" });
    }
    if (dynamicLynch != null && Number.isFinite(dynamicLynch) && dynamicLynch > 0) {
      list.push({ name: "Peter Lynch (PEG)", val: dynamicLynch, key: "lynch" });
    }
    return list;
  }, [dynamicBazin, dynamicGraham, dynamicGordon, dynamicLynch]);

  const tetoConsensus = useMemo(() => {
    if (activeMethods.length === 0) return valuation.consensus ?? livePrice;
    const sum = activeMethods.reduce((acc, m) => acc + m.val, 0);
    return sum / activeMethods.length;
  }, [activeMethods, valuation.consensus, livePrice]);

  const marginConsensus = useMemo(() => {
    if (tetoConsensus == null || tetoConsensus <= 0 || livePrice <= 0) return 0;
    return ((tetoConsensus - livePrice) / tetoConsensus) * 100;
  }, [tetoConsensus, livePrice]);

  const minFloor = useMemo(() => {
    if (activeMethods.length === 0) return tetoConsensus * 0.85;
    return Math.min(...activeMethods.map((m) => m.val));
  }, [activeMethods, tetoConsensus]);

  const maxCeiling = useMemo(() => {
    if (activeMethods.length === 0) return tetoConsensus * 1.15;
    return Math.max(...activeMethods.map((m) => m.val));
  }, [activeMethods, tetoConsensus]);

  const approvalsCount = useMemo(() => {
    return activeMethods.filter((m) => m.val >= livePrice).length;
  }, [activeMethods, livePrice]);

  const handleApply = useCallback(async () => {
    if (!onApplyAssumptions) return;
    setIsApplying(true);
    try {
      await onApplyAssumptions({ bazinYield, kDiscount, gGrowth });
    } finally {
      setIsApplying(false);
    }
  }, [onApplyAssumptions, bazinYield, kDiscount, gGrowth]);

  return (
    <div
      data-testid="consensus-pyramid"
      className={cn(
        "rounded-xl border border-border/80 bg-card p-5 shadow-xs transition-colors",
        className
      )}
    >
      {/* HEADER */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-text inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-text" />
            {t.deepDive?.consensusBadge || "VALUATION MULTI-METODOLÓGICO • 4 MODELOS CLÁSSICOS"}
          </span>
          {ticker && (
            <span className="text-xs font-mono text-muted-foreground font-semibold">
              {ticker}
            </span>
          )}
        </div>
        <h3 className="font-serif text-lg font-bold text-foreground mt-1">
          {t.deepDive?.consensusTitle || "Matriz de Consenso de Preço Teto Fuente"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t.deepDive?.consensusDescription ||
            "Cruzamento de Bazin, Graham, Gordon e Peter Lynch para eliminar vieses de uma única fórmula."}
        </p>
      </div>

      {/* HERO BANNER CONSENSO */}
      <div className="rounded-xl border border-border/70 bg-card/80 dark:bg-[#0c1a15]/90 dark:border-[#1e382d] p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t.deepDive?.consensusCeiling || "Preço Teto de Consenso Fuente"}
            </div>
            <div className="font-serif text-3xl font-bold text-accent-text font-display">
              {formatCurrency(tetoConsensus, currency, locale)}
            </div>
            {livePrice > 0 && (
              <div
                className={cn(
                  "text-xs font-semibold mt-0.5",
                  marginConsensus >= 0 ? "text-success" : "text-danger"
                )}
              >
                {t.deepDive?.avgSafetyMargin || "Margem de Segurança Média"}:{" "}
                {marginConsensus >= 0 ? "+" : ""}
                {Number.isFinite(marginConsensus) ? marginConsensus.toFixed(1) : "0.0"}%
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t.deepDive?.methodConvergence || "Convergência"}
            </div>
            <span className="inline-flex items-center rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success ring-1 ring-success/30 mt-1">
              {approvalsCount} de {activeMethods.length || 4} Aprovam
            </span>
            <div className="text-[10px] text-muted-foreground mt-1">
              {approvalsCount >= 3 ? "Convergência Alta • Risco Baixo" : "Convergência Mista • Calibrar"}
            </div>
          </div>
        </div>

        {/* RANGE RULER */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>{t.deepDive?.conservativeFloor || "Piso Conservador"}</span>
            <span className="text-accent-text font-semibold">
              {t.deepDive?.weightedConsensus || "Consenso Ponderado"}
            </span>
            <span>{t.deepDive?.optimisticCeiling || "Teto Otimista"}</span>
          </div>
          <div className="h-2 rounded-full bg-muted border border-border/60 overflow-hidden relative">
            <div className="absolute left-[15%] right-[15%] h-full bg-gradient-to-r from-primary to-accent rounded-full" />
          </div>
          <div className="flex justify-between text-[11px] font-display font-medium text-foreground mt-1">
            <span>{formatCurrency(minFloor, currency, locale)}</span>
            <span className="text-accent-text font-bold">
              {formatCurrency(tetoConsensus, currency, locale)}
            </span>
            <span>{formatCurrency(maxCeiling, currency, locale)}</span>
          </div>
        </div>
      </div>

      {/* 4 METHOD CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
        {/* BAZIN */}
        <div className="rounded-lg border border-border/70 bg-card/90 dark:bg-[#0f1f1a] dark:border-[#1e382d] p-3.5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <button
              type="button"
              onClick={() => setMobileMethodOpen("bazin")}
              className="font-semibold text-foreground flex items-center gap-1 hover:text-primary transition-colors cursor-pointer text-left"
            >
              <span>1. Décio Bazin</span>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
            </button>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold",
                dynamicBazin != null && dynamicBazin >= livePrice
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              )}
            >
              {dynamicBazin != null && dynamicBazin >= livePrice
                ? t.deepDive?.belowCeiling || "Abaixo Teto"
                : t.deepDive?.aboveCeiling || "Acima Teto"}
            </span>
          </div>
          <div className="font-serif text-xl font-bold text-foreground font-display my-1">
            {dynamicBazin != null ? formatCurrency(dynamicBazin, currency, locale) : "N/A"}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight">
            Yield mín. calibrado em {bazinYield.toFixed(1)}% com DPA histórico
          </div>
        </div>

        {/* GRAHAM */}
        <div className="rounded-lg border border-border/70 bg-card/90 dark:bg-[#0f1f1a] dark:border-[#1e382d] p-3.5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <button
              type="button"
              onClick={() => setMobileMethodOpen("graham")}
              className="font-semibold text-foreground flex items-center gap-1 hover:text-primary transition-colors cursor-pointer text-left"
            >
              <span>2. Benjamin Graham</span>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
            </button>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold",
                dynamicGraham != null && dynamicGraham >= livePrice
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              )}
            >
              {dynamicGraham != null && dynamicGraham >= livePrice
                ? t.deepDive?.belowCeiling || "Abaixo Teto"
                : t.deepDive?.aboveCeiling || "Acima Teto"}
            </span>
          </div>
          <div className="font-serif text-xl font-bold text-foreground font-display my-1">
            {dynamicGraham != null ? formatCurrency(dynamicGraham, currency, locale) : "N/A"}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight">
            Fórmula clássica: √(22,5 × LPA × VPA) com margem de segurança
          </div>
        </div>

        {/* GORDON */}
        <div className="rounded-lg border border-border/70 bg-card/90 dark:bg-[#0f1f1a] dark:border-[#1e382d] p-3.5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <button
              type="button"
              onClick={() => setMobileMethodOpen("gordon")}
              className="font-semibold text-foreground flex items-center gap-1 hover:text-primary transition-colors cursor-pointer text-left"
            >
              <span>3. Gordon (DDM)</span>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
            </button>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold",
                dynamicGordon != null && dynamicGordon >= livePrice
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              )}
            >
              {dynamicGordon != null && dynamicGordon >= livePrice
                ? t.deepDive?.belowCeiling || "Abaixo Teto"
                : t.deepDive?.aboveCeiling || "Acima Teto"}
            </span>
          </div>
          <div className="font-serif text-xl font-bold text-foreground font-display my-1">
            {dynamicGordon != null ? formatCurrency(dynamicGordon, currency, locale) : "N/A"}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight">
            Modelo de Desconto: D1 / (k: {kDiscount.toFixed(1)}% - g: {gGrowth.toFixed(1)}%)
          </div>
        </div>

        {/* PETER LYNCH */}
        <div className="rounded-lg border border-border/70 bg-card/90 dark:bg-[#0f1f1a] dark:border-[#1e382d] p-3.5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <button
              type="button"
              onClick={() => setMobileMethodOpen("lynch")}
              className="font-semibold text-foreground flex items-center gap-1 hover:text-primary transition-colors cursor-pointer text-left"
            >
              <span>4. Peter Lynch (PEG)</span>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
            </button>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold",
                dynamicLynch != null && dynamicLynch >= livePrice
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              )}
            >
              {dynamicLynch != null && dynamicLynch >= livePrice
                ? t.deepDive?.belowCeiling || "Abaixo Teto"
                : t.deepDive?.aboveCeiling || "Acima Teto"}
            </span>
          </div>
          <div className="font-serif text-xl font-bold text-foreground font-display my-1">
            {dynamicLynch != null ? formatCurrency(dynamicLynch, currency, locale) : "N/A"}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight">
            Preço justo baseado na paridade PEG Ratio com crescimento e DY
          </div>
        </div>
      </div>

      {/* SENSITIVITY SLIDERS (IF ENABLED & NOT COMPACT) */}
      {showSensitivitySliders && !compact && (
        <div className="rounded-xl border border-border/70 bg-card/90 dark:bg-[#0c1a15] dark:border-[#1e382d] p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-primary" />
              {t.deepDive?.assumptionsTitle || "Ajuste de Premissas Globais (Tempo Real)"}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">Simulação instantânea</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* SLIDER 1: BAZIN YIELD */}
            <div className="flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 min-h-[32px] mb-1.5">
                <span
                  className="text-xs font-medium text-foreground/90 leading-tight line-clamp-2"
                  title={t.deepDive?.bazinYieldLabel || "Yield Mínimo Bazin"}
                >
                  {t.deepDive?.bazinYieldLabel || "Yield Bazin"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-success dark:border-primary/40 shrink-0 select-none">
                  {bazinYield.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="4.0"
                max="12.0"
                step="0.5"
                value={bazinYield}
                onChange={(e) => setBazinYield(parseFloat(e.target.value))}
                className="range-slider-emerald my-1"
              />
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground dark:text-foreground/80 mt-1 select-none">
                <span>4.0%</span>
                <span className="font-semibold text-foreground dark:text-success">6.0% (Padrão)</span>
                <span>12.0%</span>
              </div>
            </div>

            {/* SLIDER 2: GORDON DISCOUNT (k) */}
            <div className="flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 min-h-[32px] mb-1.5">
                <span
                  className="text-xs font-medium text-foreground/90 leading-tight line-clamp-2"
                  title={t.deepDive?.gordonDiscountLabel || "Taxa de Desconto Gordon (k)"}
                >
                  {t.deepDive?.gordonDiscountLabel || "Taxa Desconto (k)"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-success dark:border-primary/40 shrink-0 select-none">
                  {kDiscount.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="8.0"
                max="16.0"
                step="0.5"
                value={kDiscount}
                onChange={(e) => setKDiscount(parseFloat(e.target.value))}
                className="range-slider-emerald my-1"
              />
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground dark:text-foreground/80 mt-1 select-none">
                <span>8.0%</span>
                <span className="font-semibold text-foreground dark:text-success">11.0% (Selic)</span>
                <span>16.0%</span>
              </div>
            </div>

            {/* SLIDER 3: GORDON GROWTH (g) */}
            <div className="flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 min-h-[32px] mb-1.5">
                <span
                  className="text-xs font-medium text-foreground/90 leading-tight line-clamp-2"
                  title={t.deepDive?.perpetualGrowthLabel || "Crescimento Perpétuo Gordon / Lynch (g)"}
                >
                  {t.deepDive?.perpetualGrowthLabel || "Crescimento (g)"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-success dark:border-primary/40 shrink-0 select-none">
                  {gGrowth.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="2.0"
                max="8.0"
                step="0.5"
                value={gGrowth}
                onChange={(e) => setGGrowth(parseFloat(e.target.value))}
                className="range-slider-emerald my-1"
              />
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground dark:text-foreground/80 mt-1 select-none">
                <span>2.0%</span>
                <span className="font-semibold text-foreground dark:text-success">5.0% (IPCA)</span>
                <span>8.0%</span>
              </div>
            </div>
          </div>

          {onApplyAssumptions && (
            <div className="pt-2 border-t border-border/50 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                disabled={isApplying}
                className="text-xs h-9 px-4 font-semibold border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground dark:border-primary/50 dark:bg-primary/20 dark:text-success dark:hover:bg-primary dark:hover:text-primary-foreground shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {isApplying ? "Salvando premissas..." : (t.deepDive?.applyConsensusBtn || "Aplicar Consenso ao Motor de Aportes")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* METHOD DETAIL SHEET FOR CLICKABLE METHOD TILES */}
      {mobileMethodOpen && (
        <MethodDetailSheet
          isOpen={!!mobileMethodOpen}
          onClose={() => setMobileMethodOpen(null)}
          title={
            mobileMethodOpen === "bazin"
              ? t.valuationAssumptions.bazinTooltipTitle
              : mobileMethodOpen === "graham"
              ? t.valuationAssumptions.grahamTooltipTitle
              : mobileMethodOpen === "gordon"
              ? t.valuationAssumptions.gordonTooltipTitle
              : t.valuationAssumptions.lynchTooltipTitle
          }
          methodType={mobileMethodOpen}
        >
          <div className="space-y-2 text-sm p-4">
            <p className="font-medium">
              {mobileMethodOpen === "bazin"
                ? t.valuationAssumptions.bazinTooltipFormula
                : mobileMethodOpen === "graham"
                ? t.valuationAssumptions.grahamTooltipFormula
                : mobileMethodOpen === "gordon"
                ? t.valuationAssumptions.gordonTooltipFormula
                : t.valuationAssumptions.lynchTooltipFormula}
            </p>
            {mobileMethodOpen === "bazin" && valuation.methodDetails?.bazin && (
              <p>
                {t.valuationAssumptions.bazinTooltipYieldTarget.replace(
                  "{{yieldTarget}}",
                  valuation.methodDetails.bazin.yieldTarget.toFixed(2)
                )}
              </p>
            )}
            {mobileMethodOpen === "gordon" && valuation.methodDetails?.gordon && (
              <>
                <p>
                  {t.valuationAssumptions.gordonTooltipRate.replace(
                    "{{rate}}",
                    valuation.methodDetails.gordon.rate.toFixed(2)
                  )}
                </p>
                <p>
                  {t.valuationAssumptions.gordonTooltipGrowth.replace(
                    "{{growth}}",
                    valuation.methodDetails.gordon.growth.toFixed(2)
                  )}
                </p>
              </>
            )}
            {mobileMethodOpen === "graham" && valuation.methodDetails?.graham && (
              <p>
                {t.valuationAssumptions.grahamTooltipMargin.replace(
                  "{{margin}}",
                  valuation.methodDetails.graham.margin.toFixed(2)
                )}
              </p>
            )}
            {mobileMethodOpen === "lynch" && valuation.methodDetails?.lynch && (
              <>
                <p>
                  {t.valuationAssumptions.lynchTooltipGrowth.replace(
                    "{{growth}}",
                    valuation.methodDetails.lynch.growth.toFixed(2)
                  )}
                </p>
                <p>
                  {t.valuationAssumptions.lynchTooltipDividendYield.replace(
                    "{{dividendYield}}",
                    valuation.methodDetails.lynch.dividendYield.toFixed(2)
                  )}
                </p>
              </>
            )}
          </div>
        </MethodDetailSheet>
      )}
    </div>
  );
}
