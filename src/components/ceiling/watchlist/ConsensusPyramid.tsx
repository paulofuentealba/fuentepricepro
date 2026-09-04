import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import type { Currency } from "@/lib/domain";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { MethodDetailSheet } from "./MethodDetailSheet";

type MethodType = "gordon" | "bazin" | "graham" | "lynch" | "consensus";

interface ValuationData {
  bazin: number | null;
  graham: number | null;
  gordon: number | null;
  lynch?: number | null;
  consensus: number | null;
  methodDetails?: {
    gordon?: { formula: string; rate: number; growth: number; source: string; date: string; growthSource: string };
    bazin?: { formula: string; yieldTarget: number; isNetJcp: boolean; source: string; date: string };
    graham?: { formula: string; margin: number; source: string; date: string };
    lynch?: { formula: string; growth: number; dividendYield: number; source: string; date: string };
    consensus?: { methods: string[]; excluded: string[] };
  };
}

interface ConsensusPyramidProps {
  valuation: ValuationData;
  currency: Currency;
}

type DiamondSlot = "top" | "left" | "right" | "bottom";

const SLOT_POSITION_CLASS: Record<DiamondSlot, string> = {
  top: "top-0 left-1/2 -translate-x-1/2",
  left: "bottom-0 left-4",
  right: "bottom-0 right-4",
  bottom: "bottom-0 left-1/2 -translate-x-1/2",
};

const SLOT_COORDS: Record<DiamondSlot, { x: number; y: number }> = {
  top: { x: 160, y: 40 },
  left: { x: 50, y: 220 },
  right: { x: 270, y: 220 },
  bottom: { x: 160, y: 240 },
};

interface VertexConfig {
  key: MethodType;
  label: string;
  value: number | null;
  slot: DiamondSlot;
  conceptTooltip?: string;
  notApplicableTooltip?: string;
}

export function ConsensusPyramid({ valuation, currency }: ConsensusPyramidProps) {
  const { locale, t } = useI18n();
  const [mobileMethodOpen, setMobileMethodOpen] = useState<MethodType | null>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 375;

  const gordonTooltip = valuation.methodDetails?.gordon
    ? `${t.valuationAssumptions.gordonTooltipFormula}. ${t.valuationAssumptions.gordonTooltipRate.replace("{{rate}}", valuation.methodDetails.gordon.rate.toFixed(2))}. ${t.valuationAssumptions.gordonTooltipGrowth.replace("{{growth}}", valuation.methodDetails.gordon.growth.toFixed(2))}. ${t.valuationAssumptions.gordonTooltipGrowthSource}. ${t.valuationAssumptions.gordonTooltipSource.replace("{{source}}", valuation.methodDetails.gordon.source).replace("{{date}}", valuation.methodDetails.gordon.date)}`
    : t.tooltips?.gordon;

  const bazinTooltip = valuation.methodDetails?.bazin
    ? `${t.valuationAssumptions.bazinTooltipFormula}. ${t.valuationAssumptions.bazinTooltipYieldTarget.replace("{{yieldTarget}}", valuation.methodDetails.bazin.yieldTarget.toFixed(2))}. ${valuation.methodDetails.bazin.isNetJcp ? t.valuationAssumptions.bazinTooltipNetJcp : t.valuationAssumptions.bazinTooltipDividend}. ${t.valuationAssumptions.bazinTooltipSource.replace("{{source}}", valuation.methodDetails.bazin.source).replace("{{date}}", valuation.methodDetails.bazin.date)}`
    : t.tooltips?.bazin;

  const grahamTooltip = valuation.methodDetails?.graham
    ? `${t.valuationAssumptions.grahamTooltipFormula}. ${t.valuationAssumptions.grahamTooltipMargin.replace("{{margin}}", valuation.methodDetails.graham.margin.toFixed(1))}. ${t.valuationAssumptions.grahamTooltipSource.replace("{{source}}", valuation.methodDetails.graham.source).replace("{{date}}", valuation.methodDetails.graham.date)}`
    : t.tooltips?.graham;

  const lynchTooltip = valuation.methodDetails?.lynch
    ? `${t.valuationAssumptions.lynchTooltipFormula}. ${t.valuationAssumptions.lynchTooltipGrowth.replace("{{growth}}", valuation.methodDetails.lynch.growth.toFixed(2))}. ${t.valuationAssumptions.lynchTooltipDividendYield.replace("{{dividendYield}}", valuation.methodDetails.lynch.dividendYield.toFixed(2))}. ${t.valuationAssumptions.lynchTooltipSource.replace("{{source}}", valuation.methodDetails.lynch.source).replace("{{date}}", valuation.methodDetails.lynch.date)}`
    : t.tooltips?.lynch;

  const consensusTooltip = valuation.methodDetails?.consensus
    ? `${t.valuationAssumptions.consensusTooltipMethods.replace("{{methods}}", valuation.methodDetails.consensus.methods.join(", "))}. ${valuation.methodDetails.consensus.excluded.length > 0 ? t.valuationAssumptions.consensusTooltipExcluded.replace("{{excluded}}", valuation.methodDetails.consensus.excluded.join(", ")) : ""}`
    : t.tooltips?.consensus;

  // Lynch only occupies a slot when the caller passes it explicitly (a number, or
  // null for "applicable but no data"). FII/REIT/ETF callers omit the key entirely
  // (or pass undefined) because Lynch is structurally not computed for those classes.
  const hasLynchSlot = valuation.lynch !== undefined;

  const vertices: VertexConfig[] = [
    { key: "gordon", label: "Gordon", value: valuation.gordon, slot: "top", conceptTooltip: gordonTooltip, notApplicableTooltip: t.tooltips?.gordonNotApplicable },
    { key: "bazin", label: "Bazin", value: valuation.bazin, slot: "left", conceptTooltip: bazinTooltip, notApplicableTooltip: t.tooltips?.bazinNotApplicable },
    { key: "graham", label: "Graham", value: valuation.graham, slot: "right", conceptTooltip: grahamTooltip, notApplicableTooltip: t.tooltips?.grahamNotApplicable },
  ];

  if (hasLynchSlot) {
    vertices.push({
      key: "lynch",
      label: "Lynch",
      value: valuation.lynch ?? null,
      slot: "bottom",
      conceptTooltip: lynchTooltip,
      notApplicableTooltip: t.tooltips?.lynchNotApplicable,
    });
  }

  const renderVertex = (vertex: VertexConfig) => {
    const { key, label, value, slot, conceptTooltip, notApplicableTooltip } = vertex;
    const isNull = value === null || value <= 0;
    const tooltipContent = isNull ? notApplicableTooltip : conceptTooltip;
    const positionClass = SLOT_POSITION_CLASS[slot];

    const renderTooltipTrigger = () => {
      if (!tooltipContent) {
        return <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</span>;
      }

      if (isMobile) {
        return (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                  onClick={() => setMobileMethodOpen(key)}
                >
                  {label}
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] p-2.5 text-xs text-center border bg-popover text-popover-foreground shadow-md font-normal leading-relaxed" side="top">
                {t.valuationAssumptions.whyThisNumber}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      const side = slot === "top" ? "bottom" : slot === "bottom" ? "top" : "top";

      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
                {label}
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent
              side={side as any}
              align="start"
              className="max-w-[280px] p-2.5 text-xs text-center border bg-popover text-popover-foreground shadow-md font-normal leading-relaxed"
            >
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    };

    return (
      <div
        key={key}
        className={`absolute flex flex-col items-center justify-center ${positionClass} ${isNull ? "opacity-60" : ""}`}
      >
        <div className="rounded-md border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md shadow-lg flex flex-col items-center">
          {renderTooltipTrigger()}
          <span className="text-sm font-bold text-white">
            {isNull ? "N/A" : formatCurrency(value, currency, locale)}
          </span>
        </div>
      </div>
    );
  };

  const activeSlots = vertices.map((v) => v.slot);
  const points = activeSlots.map((slot) => `${SLOT_COORDS[slot].x},${SLOT_COORDS[slot].y}`).join(" ");
  const center = { x: 160, y: 150 };

  return (
    <>
      <div className="mb-6 rounded-xl border border-white/5 bg-[#0a0a0c] p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-primary/5 pointer-events-none" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />

        <h3 className="mb-8 text-center text-xs font-semibold text-white/80 uppercase tracking-widest">
          {t.valuation.pyramidTitle}
        </h3>

        <div className="relative w-full max-w-[320px] mx-auto h-[260px]">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 320 260"
          >
            <polygon
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="text-primary/30"
            />
            {activeSlots.map((slot) => (
              <line
                key={slot}
                x1={SLOT_COORDS[slot].x}
                y1={SLOT_COORDS[slot].y}
                x2={center.x}
                y2={center.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-primary/30"
              />
            ))}
          </svg>

          {vertices.map(renderVertex)}

          <div className="absolute top-[150px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-10">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative rounded-full border border-primary/50 bg-black px-5 py-2.5 shadow-primary/20 backdrop-blur-xl">
              <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest text-center mb-0.5 drop-shadow-md">
                {t.valuation.consensusBadge}
                {consensusTooltip && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {isMobile ? (
                          <button
                            type="button"
                            className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                            onClick={() => setMobileMethodOpen("consensus")}
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        align="center"
                        className="max-w-[280px] p-2.5 text-xs text-center border bg-popover text-popover-foreground shadow-md font-normal leading-relaxed"
                      >
                        {consensusTooltip}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </span>
              <span className="block text-xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {valuation.consensus !== null && valuation.consensus > 0
                  ? formatCurrency(valuation.consensus, currency, locale)
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isMobile && (
        <>
          <MethodDetailSheet
            isOpen={mobileMethodOpen === "gordon"}
            onClose={() => setMobileMethodOpen(null)}
            title={t.valuationAssumptions.gordonTooltipTitle}
            methodType="gordon"
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t.valuationAssumptions.gordonTooltipFormula}</p>
              {valuation.methodDetails?.gordon && (
                <>
                  <p>{t.valuationAssumptions.gordonTooltipRate.replace("{{rate}}", valuation.methodDetails.gordon.rate.toFixed(2))}</p>
                  <p>{t.valuationAssumptions.gordonTooltipGrowth.replace("{{growth}}", valuation.methodDetails.gordon.growth.toFixed(2))}</p>
                  <p className="text-muted-foreground">{t.valuationAssumptions.gordonTooltipGrowthSource}</p>
                  <p className="text-muted-foreground">{t.valuationAssumptions.gordonTooltipSource.replace("{{source}}", valuation.methodDetails.gordon.source).replace("{{date}}", valuation.methodDetails.gordon.date)}</p>
                </>
              )}
            </div>
          </MethodDetailSheet>

          <MethodDetailSheet
            isOpen={mobileMethodOpen === "bazin"}
            onClose={() => setMobileMethodOpen(null)}
            title={t.valuationAssumptions.bazinTooltipTitle}
            methodType="bazin"
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t.valuationAssumptions.bazinTooltipFormula}</p>
              {valuation.methodDetails?.bazin && (
                <>
                  <p>{t.valuationAssumptions.bazinTooltipYieldTarget.replace("{{yieldTarget}}", valuation.methodDetails.bazin.yieldTarget.toFixed(2))}</p>
                  <p className="text-muted-foreground">{valuation.methodDetails.bazin.isNetJcp ? t.valuationAssumptions.bazinTooltipNetJcp : t.valuationAssumptions.bazinTooltipDividend}</p>
                  <p className="text-muted-foreground">{t.valuationAssumptions.bazinTooltipSource.replace("{{source}}", valuation.methodDetails.bazin.source).replace("{{date}}", valuation.methodDetails.bazin.date)}</p>
                </>
              )}
            </div>
          </MethodDetailSheet>

          <MethodDetailSheet
            isOpen={mobileMethodOpen === "graham"}
            onClose={() => setMobileMethodOpen(null)}
            title={t.valuationAssumptions.grahamTooltipTitle}
            methodType="graham"
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t.valuationAssumptions.grahamTooltipFormula}</p>
              {valuation.methodDetails?.graham && (
                <>
                  <p>{t.valuationAssumptions.grahamTooltipMargin.replace("{{margin}}", valuation.methodDetails.graham.margin.toFixed(1))}</p>
                  <p className="text-muted-foreground">{t.valuationAssumptions.grahamTooltipSource.replace("{{source}}", valuation.methodDetails.graham.source).replace("{{date}}", valuation.methodDetails.graham.date)}</p>
                </>
              )}
            </div>
          </MethodDetailSheet>

          <MethodDetailSheet
            isOpen={mobileMethodOpen === "lynch"}
            onClose={() => setMobileMethodOpen(null)}
            title={t.valuationAssumptions.lynchTooltipTitle}
            methodType="lynch"
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t.valuationAssumptions.lynchTooltipFormula}</p>
              {valuation.methodDetails?.lynch && (
                <>
                  <p>{t.valuationAssumptions.lynchTooltipGrowth.replace("{{growth}}", valuation.methodDetails.lynch.growth.toFixed(2))}</p>
                  <p>{t.valuationAssumptions.lynchTooltipDividendYield.replace("{{dividendYield}}", valuation.methodDetails.lynch.dividendYield.toFixed(2))}</p>
                  <p className="text-muted-foreground">{t.valuationAssumptions.lynchTooltipSource.replace("{{source}}", valuation.methodDetails.lynch.source).replace("{{date}}", valuation.methodDetails.lynch.date)}</p>
                </>
              )}
            </div>
          </MethodDetailSheet>

          <MethodDetailSheet
            isOpen={mobileMethodOpen === "consensus"}
            onClose={() => setMobileMethodOpen(null)}
            title={t.valuationAssumptions.consensusTooltipTitle}
            methodType="consensus"
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t.valuationAssumptions.consensusTooltipTitle}</p>
              {valuation.methodDetails?.consensus && (
                <>
                  <p>{t.valuationAssumptions.consensusTooltipMethods.replace("{{methods}}", valuation.methodDetails.consensus.methods.join(", "))}</p>
                  {valuation.methodDetails.consensus.excluded.length > 0 && (
                    <p className="text-muted-foreground">{t.valuationAssumptions.consensusTooltipExcluded.replace("{{excluded}}", valuation.methodDetails.consensus.excluded.join(", "))}</p>
                  )}
                </>
              )}
            </div>
          </MethodDetailSheet>
        </>
      )}
    </>
  );
}
