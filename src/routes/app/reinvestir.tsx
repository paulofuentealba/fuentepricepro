import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { useI18n } from "@/lib/i18n-provider";
import { downloadCsv } from "@/lib/csv";
import {
  accelerateSnowballStrategy,
  correctDriftStrategy,
  reinforcePayerStrategy,
  buildAskResultCsv,
  resolveReasonText,
  type AskEngineSettings,
} from "@/lib/askEngine";
import { AskScreen } from "@/components/ask/AskScreen";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/app/reinvestir")({
  head: () => ({
    meta: [
      { title: "Reinvestir Proventos | Fuente Price Pro" },
      {
        name: "description",
        content: "Motor de decisão pura para alocação inteligente de proventos recebidos na sua carteira.",
      },
    ],
  }),
  component: ReinvestirPage,
});

export function ReinvestirPage() {
  const { t } = useI18n();
  const isUnlocked = useFeatureGate("reinvestUnlocked");

  const { valuedItems, isAppLoading } = useValuedPortfolio();
  const { settings } = useUserSettings();
  const currency = settings?.displayCurrency || "BRL";
  const { summary, isLoading: isIncomeLoading } = useRealizedIncomeSummary(currency);

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
    () => [
      accelerateSnowballStrategy,
      correctDriftStrategy,
      reinforcePayerStrategy,
    ],
    [],
  );

  const strategyHints = useMemo(
    () => ({
      accelerateSnowball: t.askScreen?.reinvestHintSnowball,
      correctDrift: t.askScreen?.reinvestHintDrift,
      reinforcePayer: t.askScreen?.reinvestHintPayer,
    }),
    [t],
  );

  if (isUnlocked === false) {
    return (
      <div className="mx-auto max-w-xl p-6 mt-12">
        <Card className="border-border/60 text-center p-6">
          <CardHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle>
              {t.askScreen?.featureGateBlockedTitle || "Motor de Reinvestimento Bloqueado"}
            </CardTitle>
            <CardDescription>
              {t.askScreen?.featureGateBlockedDesc ||
                "O motor de reinvestimento está temporariamente em manutenção."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const initialAmount = summary?.currentMonth && summary.currentMonth > 0 ? summary.currentMonth : 1000;
  const helperText =
    summary?.currentMonth && summary.currentMonth > 0
      ? t.askScreen?.availableAmountHelper || "Sugestão baseada nos proventos líquidos recebidos este mês (editável)"
      : undefined;

  return (
    <AskScreen
      titleKey="askScreen.reinvestTitle"
      subtitleKey="askScreen.reinvestSubtitle"
      questionKey="askScreen.reinvestQuestion"
      questionLeadKey="askScreen.reinvestQuestionLead"
      questionEmphasisKey="askScreen.reinvestQuestionEmphasis"
      initialAmount={initialAmount}
      amountHelperText={helperText}
      strategies={strategies}
      strategyHints={strategyHints}
      defaultStrategyId="accelerateSnowball"
      positions={valuedItems}
      settings={askSettings}
      currency={currency}
      isLoading={isAppLoading || isIncomeLoading}
      onExport={(res, strat) => {
        const date = new Date().toISOString().split("T")[0];
        const csv = buildAskResultCsv(
          res,
          {
            questionLabel: t.askScreen?.reinvestQuestion || "Reinvestir Proventos",
            strategyLabel: resolveReasonText(t, strat.labelKey),
            generatedAt: date,
          },
          t,
        );
        downloadCsv(`reinvestir-${date}.csv`, csv);
      }}
    />
  );
}
