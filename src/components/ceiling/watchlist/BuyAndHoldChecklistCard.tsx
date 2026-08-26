import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, Minus, ShieldCheck } from "lucide-react";
import type { Asset } from "@/lib/domain";
import type { ValuationResult } from "@/lib/calculations";
import { evaluateBuyAndHoldChecklist } from "@/lib/buyAndHoldChecklist";
import { useI18n } from "@/lib/i18n-provider";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { cn } from "@/lib/utils";
import { RegulatoryDisclaimerBanner } from "@/components/shared/RegulatoryDisclaimerBanner";

interface Props {
  asset: Asset;
  valuation?: ValuationResult | null;
}

export function BuyAndHoldChecklistCard({ asset, valuation }: Props) {
  const { t } = useI18n();

  const result = useMemo(() => {
    return evaluateBuyAndHoldChecklist(asset, valuation);
  }, [asset, valuation]);

  if (result.criteria.length === 0) {
    return null;
  }

  const { score, totalApplicable, criteria } = result;
  const scorePct = totalApplicable > 0 ? (score / totalApplicable) * 100 : 0;

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {t.buyAndHoldChecklist.title}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.buyAndHoldChecklist.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full text-xs font-semibold text-primary">
          <span>
            {t.buyAndHoldChecklist.score
              .replace("{{score}}", String(score))
              .replace("{{total}}", String(totalApplicable))}
          </span>
        </div>
      </div>

      <div className="divide-y divide-border/40 rounded-lg border border-border/40 overflow-hidden bg-background/30 text-xs">
        {criteria.map((item) => {
          const label = (t.buyAndHoldChecklist as any)[item.labelKey] || item.labelKey;
          const tooltip = (t.buyAndHoldChecklist as any)[item.tooltipKey];

          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 hover:bg-muted/20 transition-colors gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.passed === true ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : item.passed === false ? (
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                )}
                <span className="font-medium text-foreground truncate">{label}</span>
                {tooltip && <InfoTooltip content={tooltip} />}
              </div>

              <div className="shrink-0">
                {item.passed === true ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-success/10 text-success border border-success/20">
                    {t.buyAndHoldChecklist.statusPassed}
                  </span>
                ) : item.passed === false ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-warning/10 text-warning border border-warning/20">
                    {t.buyAndHoldChecklist.statusFailed}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] text-muted-foreground/70 bg-muted/60 border border-border/30">
                    {t.buyAndHoldChecklist.statusNotApplicable}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border/30">
        <RegulatoryDisclaimerBanner
          variant="calculation"
          forceShow
          className="border-t-0 bg-transparent p-0 text-left"
        />
      </div>
    </div>
  );
}
