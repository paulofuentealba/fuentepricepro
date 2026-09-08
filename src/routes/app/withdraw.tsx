import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { useMarketScope } from "@/lib/useMarketScope";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { useTransactions } from "@/lib/transactions";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { useI18n } from "@/lib/i18n-provider";
import { buildTaxContext } from "@/lib/tax/buildTaxContext";
import { buildWithdrawResultCsv, resolveReasonText, type WithdrawTaxState } from "@/lib/withdrawEngine";
import { downloadCsv } from "@/lib/csv";
import { WithdrawScreen } from "@/components/withdraw/WithdrawScreen";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/app/withdraw")({
  head: () => ({
    meta: [
      { title: "Retirar | Fuente Price Pro" },
      {
        name: "description",
        content: "Simulação da ordem de venda com menor impacto tributário e de renda futura.",
      },
    ],
  }),
  component: WithdrawPage,
});

function WithdrawPage() {
  const { t } = useI18n();
  const isUnlocked = useFeatureGate("withdrawUnlocked");

  const { valuedItems, ownedItems, isAppLoading, fx } = useValuedPortfolio();
  const { settings } = useUserSettings();
  const { currency } = useMarketScope();
  const { events: realizedEvents, isLoading: isIncomeLoading } = useRealizedIncomeSummary(currency);
  const { transactions, isLoading: isTxLoading } = useTransactions();

  const isLoading = isAppLoading || isIncomeLoading || isTxLoading;

  const taxState: WithdrawTaxState = useMemo(() => {
    const ctx = buildTaxContext(transactions, valuedItems, realizedEvents, fx?.USDBRL ?? 1);
    return {
      realizedGainEvents: ctx.realizedGainEvents,
      assetTypeByTicker: ctx.assetTypeByTicker,
      currencyByTicker: ctx.currencyByTicker,
      fxRate: ctx.fxRate,
    };
  }, [transactions, valuedItems, realizedEvents, fx?.USDBRL]);

  if (isUnlocked === false) {
    return (
      <div className="mx-auto max-w-xl p-6 mt-12">
        <Card className="border-border/60 text-center p-6">
          <CardHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle>{t.askScreen?.withdrawFeatureGateBlockedTitle || "Motor de Retirada Bloqueado"}</CardTitle>
            <CardDescription>
              {t.askScreen?.withdrawFeatureGateBlockedDesc ||
                "O motor de retirada está temporariamente em manutenção."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <WithdrawScreen
      positions={ownedItems}
      taxState={taxState}
      currency={currency}
      usdRate={fx?.USDBRL ?? 1}
      isLoading={isLoading}
      onExport={(result, strategy) => {
        const date = new Date().toISOString().split("T")[0];
        const csv = buildWithdrawResultCsv(
          result,
          {
            questionLabel: t.askScreen?.withdrawTitle || "Retirar com menor impacto",
            strategyLabel: resolveReasonText(t, strategy.labelKey),
            generatedAt: date,
          },
          t,
        );
        downloadCsv(`retirar-${date}.csv`, csv);
      }}
    />
  );
}
