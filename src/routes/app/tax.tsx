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
import { useMarketScope } from "@/lib/useMarketScope";
import { TaxRealityScreen } from "@/components/tax/TaxRealityScreen";
import { IrpfMirrorReport } from "@/components/tax/IrpfMirrorReport";
import { UsTax1099Report } from "@/components/tax/UsTax1099Report";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Receipt, FileText, FileSpreadsheet } from "lucide-react";

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
  const { isUS, hasBrPositions, hasUsPositions, currency } = useMarketScope();
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

  const hasBrAssets = hasBrPositions;
  const hasUsAssets = hasUsPositions;

  const [showBrSection, setShowBrSection] = useState<boolean>(!isUS || hasBrAssets);

  const screenTitle = isUS
    ? t.taxRealityScreen?.tabs?.usTaxTitle || "US Tax Reporting & Form 1099"
    : t.taxRealityScreen?.title;
  const screenSubtitle = isUS
    ? t.taxRealityScreen?.tabs?.usTaxSubtitle ||
      "Consolidated view of dividend income (1099-DIV), capital gains (1099-B / Schedule D) and tax-advantaged accounts"
    : t.taxRealityScreen?.subtitle;

  const defaultTab = isUS ? "us1099" : "irpf";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>{t.nav.sections.track}</span>
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {screenTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {screenSubtitle}
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex h-auto w-full items-center justify-start gap-1 overflow-x-auto scrollbar-none flex-nowrap rounded-none border-b border-border bg-transparent p-0 pb-px">
          {/* US Form 1099 tab */}
          {(isUS || hasUsAssets) && (
            <TabsTrigger
              value="us1099"
              className="flex items-center gap-2 shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-sm"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              <span>{t.taxRealityScreen.tabs.us1099}</span>
            </TabsTrigger>
          )}

          {/* Brazilian Tax Tabs */}
          {(!isUS || showBrSection) && (
            <>
              <TabsTrigger
                value="irpf"
                className="flex items-center gap-2 shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-sm"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {isUS
                    ? `${t.taxRealityScreen.tabs.irpfMirror} (B3)`
                    : t.taxRealityScreen.tabs.irpfMirror}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="darf"
                className="flex items-center gap-2 shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-sm"
              >
                <Receipt className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {isUS
                    ? `${t.taxRealityScreen.tabs.darfSales} (B3)`
                    : t.taxRealityScreen.tabs.darfSales}
                </span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="us1099" className="mt-6">
          <UsTax1099Report
            valuedItems={valuedItems}
            context={context}
            transactions={transactions}
          />
        </TabsContent>

        {(!isUS || showBrSection) && (
          <>
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
          </>
        )}
      </Tabs>

      {/* Optional Brazilian Reporting toggle for pure US investors */}
      {isUS && !hasBrAssets && (
        <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {showBrSection
              ? t.taxRealityScreen?.tabs?.hideBrSectionToggle || "A declaração fiscal brasileira (B3) está visível."
              : t.taxRealityScreen?.tabs?.brSectionToggle || "Precisa de declaração brasileira (IRPF / DARF)?"}
          </span>
          <button
            type="button"
            onClick={() => setShowBrSection(!showBrSection)}
            className="text-xs text-primary hover:underline font-medium cursor-pointer"
          >
            {showBrSection
              ? t.taxRealityScreen?.tabs?.hideBrTabsBtn || "Ocultar abas B3"
              : t.taxRealityScreen?.tabs?.showBrTabsBtn || "Exibir abas B3"}
          </button>
        </div>
      )}
    </div>
  );
}