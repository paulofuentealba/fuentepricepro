import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BlurredPreviewOverlay } from "@/components/ceiling/BlurredPreviewOverlay";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { useI18n } from "@/lib/i18n-provider";
import { downloadCsv } from "@/lib/csv";
import {
  correctDriftStrategy,
  accelerateSnowballStrategy,
  buyDiscountStrategy,
  buildAskResultCsv,
  resolveReasonText,
  type AskEngineSettings,
} from "@/lib/askEngine";
import { AskScreen } from "@/components/ask/AskScreen";

export const Route = createFileRoute("/app/smartallocation")({
  component: SmartAllocationRoute,
});

function SmartAllocationRoute() {
  const smartAllocationUnlocked = useFeatureGate("smartAllocationUnlocked") as boolean;
  const { t } = useI18n();
  const { valuedItems, isAppLoading } = useValuedPortfolio();
  const { settings } = useUserSettings();
  const currency = settings?.displayCurrency || "BRL";

  const askSettings: AskEngineSettings = useMemo(() => {
    return {
      smartAllocationTargets: settings?.smartAllocationTargets,
      excludeAboveCeiling: settings?.excludeAboveCeiling,
      excludeYieldTraps: settings?.excludeYieldTraps,
      maxConcentrationPerAsset: settings?.maxConcentrationPerAsset,
      maxConcentrationPerClass: settings?.maxConcentrationPerClass,
    };
  }, [settings]);

  const strategies = useMemo(
    () => [correctDriftStrategy, accelerateSnowballStrategy, buyDiscountStrategy],
    [],
  );

  const strategyHints = useMemo(
    () => ({
      correctDrift: t.askScreen?.contributionHintDrift,
      accelerateSnowball: t.askScreen?.contributionHintSnowball,
      buyDiscount: t.askScreen?.contributionHintDiscount,
    }),
    [t],
  );

  const allocationContent = (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 mx-auto max-w-5xl">
      <AskScreen
        titleKey="askScreen.contributionTitle"
        subtitleKey="askScreen.contributionSubtitle"
        questionKey="askScreen.contributionQuestion"
        questionLeadKey="askScreen.contributionQuestionLead"
        questionEmphasisKey="askScreen.contributionQuestionEmphasis"
        amountLabelKey="askScreen.availableAmountLabelContribution"
        strategies={strategies}
        strategyHints={strategyHints}
        defaultStrategyId="correctDrift"
        positions={valuedItems}
        settings={askSettings}
        currency={currency}
        isLoading={isAppLoading}
        onExport={(res, strat) => {
          const date = new Date().toISOString().split("T")[0];
          const csv = buildAskResultCsv(
            res,
            {
              questionLabel: t.askScreen?.contributionQuestion || "Plano de Aporte",
              strategyLabel: resolveReasonText(t, strat.labelKey),
              generatedAt: date,
            },
            t,
          );
          downloadCsv(`plano-de-aporte-${date}.csv`, csv);
        }}
      />
    </div>
  );

  if (!smartAllocationUnlocked) {
    return (
      <BlurredPreviewOverlay feature="smartallocation">
        {allocationContent}
      </BlurredPreviewOverlay>
    );
  }

  return allocationContent;
}
