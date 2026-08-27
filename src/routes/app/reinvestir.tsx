import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { useTransactions } from "@/lib/transactions";
import { useFIProgress } from "@/lib/useFIProgress";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { useI18n } from "@/lib/i18n-provider";
import { downloadCsv } from "@/lib/csv";
import { computeRecentPaymentInsight, sumReceivedInWindow } from "@/lib/realizedIncome";
import { getNetContributionInWindow } from "@/lib/selectors/monthlyContribution";
import { convertCurrency } from "@/lib/currency";
import { formatCurrency } from "@/lib/formatters";
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
  const { t, locale } = useI18n();
  const isUnlocked = useFeatureGate("reinvestUnlocked");

  const { valuedItems, isAppLoading, fx } = useValuedPortfolio();
  const { settings } = useUserSettings();
  const currency = settings?.displayCurrency || "BRL";
  const { summary, events, isLoading: isIncomeLoading } = useRealizedIncomeSummary(currency);
  const { transactions = [] } = useTransactions();
  const { totalCapitalBRL, monthlyIncomeBRL } = useFIProgress();

  // Dynamic eyebrow: "TAEE11 pagou hoje · N pagamentos esta semana" — only shown when the most
  // recently paid dividend actually landed today (otherwise falls back to the static subtitle).
  const eyebrowOverride = useMemo(() => {
    const recent = computeRecentPaymentInsight(events);
    if (!recent || !recent.isToday) return undefined;
    const key =
      recent.paymentsThisWeek <= 1
        ? "reinvestEyebrowTodaySingle"
        : "reinvestEyebrowTodayPlural";
    return resolveReasonText(t, `askScreen.${key}`, {
      ticker: recent.ticker,
      count: recent.paymentsThisWeek,
    });
  }, [events, t]);

  // "Dinheiro parado custa caro" — compares proventos recebidos vs. novas compras nos últimos
  // 12 meses (aproximação agregada, não rastreia a origem exata de cada compra — ver JSDoc de
  // sumReceivedInWindow/getNetContributionInWindow).
  const idleDividendsInsight = useMemo(() => {
    const windowEnd = Date.now();
    const windowStart = windowEnd - 365 * 24 * 60 * 60 * 1000;
    const windowStartISO = new Date(windowStart).toISOString().split("T")[0];
    const windowEndISO = new Date(windowEnd).toISOString().split("T")[0];

    const received = sumReceivedInWindow(events, windowStartISO, windowEndISO, "BRL", fx?.USDBRL);
    if (received <= 0) return null;

    const currencyByTicker: Record<string, "BRL" | "USD"> = {};
    for (const item of valuedItems) currencyByTicker[item.ticker] = item.currency;
    const convertToBRL = (value: number, curr: "USD" | "BRL") =>
      convertCurrency(value, curr, "BRL", fx?.USDBRL);
    const invested = getNetContributionInWindow(
      transactions,
      windowStart,
      windowEnd,
      convertToBRL,
      currencyByTicker,
    );

    const idle = Math.max(0, received - invested);
    if (idle <= 0) return null;

    const avgYieldPct = totalCapitalBRL > 0 ? (monthlyIncomeBRL * 12) / totalCapitalBRL : 0;
    const extraMonthly = (idle * avgYieldPct) / 12;

    return {
      title: t.askScreen?.idleDividendsTitle || "Dinheiro parado custa caro",
      description: resolveReasonText(t, "askScreen.idleDividendsDesc", {
        received: formatCurrency(received, "BRL", locale),
        invested: formatCurrency(invested, "BRL", locale),
        extra: formatCurrency(extraMonthly, "BRL", locale),
      }),
      value: formatCurrency(idle, "BRL", locale),
    };
  }, [events, transactions, valuedItems, fx?.USDBRL, totalCapitalBRL, monthlyIncomeBRL, t, locale]);

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
      eyebrowOverride={eyebrowOverride}
      insight={idleDividendsInsight ?? undefined}
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
