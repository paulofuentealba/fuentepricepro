import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { IrpfMirrorReport } from "@/components/tax/IrpfMirrorReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Receipt, FileText } from "lucide-react";

export const Route = createFileRoute("/app/tax")({
  head: () => ({
    meta: [
      { title: "Realidade Fiscal & Espelho IRPF | Fuente Price Pro" },
      {
        name: "description",
        content: "Visão consolidada de dividendos líquidos, apuração de DARF e Espelho do IRPF pronto para copiar e colar na declaração anual.",
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
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>{t.nav.sections.track}</span>
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.taxRealityScreen.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.taxRealityScreen.subtitle}
        </p>
      </div>

      <Tabs defaultValue="irpf" className="w-full">
        <TabsList className="flex h-auto w-full items-center justify-start gap-1 overflow-x-auto scrollbar-none flex-nowrap rounded-none border-b border-border bg-transparent p-0 pb-px">
          <TabsTrigger
            value="irpf"
            className="flex items-center gap-2 shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-sm"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>{t.taxRealityScreen.tabs.irpfMirror}</span>
          </TabsTrigger>
          <TabsTrigger
            value="darf"
            className="flex items-center gap-2 shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-sm"
          >
            <Receipt className="h-3.5 w-3.5 shrink-0" />
            <span>{t.taxRealityScreen.tabs.darfSales}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="irpf" className="mt-6">
          <IrpfMirrorReport valuedItems={valuedItems} context={context} />
        </TabsContent>

        <TabsContent value="darf" className="mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}