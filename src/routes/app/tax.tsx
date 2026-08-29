import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { useTransactions } from "@/lib/transactions";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { useI18n } from "@/lib/i18n-provider";
import { buildTaxContext, type TaxRealityContext } from "@/lib/tax/buildTaxContext";
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
        // TODO: implement CSV export for tax reality
        const date = new Date().toISOString().split("T")[0];
        // Build CSV content
        const csvLines = [
          ["Seção", "Mês", "Vendas (R$)", "Ganho/Prejuízo (R$)", "Isento", "Ganho Tributável (R$)", "Imposto Devido (R$)", "Prejuízo a Compensar (R$)"],
        ];
        // This would be expanded with actual data from context
        const csv = csvLines.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `realidade-fiscal-${date}.csv`;
        link.click();
      }}
    />
  );
}