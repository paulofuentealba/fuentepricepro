import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { useTransactions } from "@/lib/transactions";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { useI18n } from "@/lib/i18n-provider";
import { buildTaxContext, type TaxRealityContext } from "@/lib/tax/buildTaxContext";
import { computeTaxRealityRows, buildTaxRealityCsv } from "@/lib/tax/taxRealityRows";
import { downloadCsv } from "@/lib/csv";
import { TaxRealityScreen } from "@/components/tax/TaxRealityScreen";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/app/tax")({
  head: () => ({
    meta: [
      { title: "Realidade Fiscal | Fuente Price Pro" },
      {
        name: "description",
        content: "Visão consolidada de dividendos líquidos e ganhos de capital (ações e FIIs) no ano corrente.",
      },
    ],
  }),
  component: RealidadeFiscalPage,
});

export function RealidadeFiscalPage() {
  const { t } = useI18n();
  const isUnlocked = useFeatureGate("taxRealityUnlocked");

  const { valuedItems, isAppLoading, fx } = useValuedPortfolio();
  const { settings } = useUserSettings();
  const currency = settings?.displayCurrency || "BRL";
  const { events: realizedEvents, isLoading: isIncomeLoading } = useRealizedIncomeSummary(currency);
  const { transactions, isLoading: isTxLoading } = useTransactions();

  const isLoading = isAppLoading || isIncomeLoading || isTxLoading;

  // Build tax context from transactions + valuedItems + realizedEvents + fx
  const context = useMemo((): TaxRealityContext => {
    return buildTaxContext(transactions, valuedItems, realizedEvents, fx?.USDBRL ?? 1);
  }, [transactions, valuedItems, realizedEvents, fx?.USDBRL]);

  if (isUnlocked === false) {
    return (
      <div className="mx-auto max-w-xl p-6 mt-12">
        <Card className="border-border/60 text-center p-6">
          <CardHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle>{t.taxRealityScreen?.featureGateBlockedTitle || "Tela de Realidade Fiscal Bloqueada"}</CardTitle>
            <CardDescription>
              {t.taxRealityScreen?.featureGateBlockedDesc || "A tela de Realidade Fiscal está temporariamente indisponível."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <TaxRealityScreen
      context={context}
      isLoading={isLoading}
      onExport={() => {
        const date = new Date().toISOString().split("T")[0];
        const rows = computeTaxRealityRows(context);
        const csv = buildTaxRealityCsv(context, rows);
        downloadCsv(`realidade-fiscal-${date}.csv`, csv);
      }}
    />
  );
}