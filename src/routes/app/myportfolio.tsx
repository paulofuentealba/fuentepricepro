import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useValuedPortfolio, type ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { EXCHANGE_RATE_FALLBACK } from "@/lib/macroDefaults";
import { PortfolioSummaryHeader } from "@/components/portfolio/PortfolioSummaryHeader";
import { BrokerCustodyCards } from "@/components/portfolio/BrokerCustodyCards";
import { FxDecompositionPanel } from "@/components/portfolio/FxDecompositionPanel";
import { PortfolioPositionsTable } from "@/components/portfolio/PortfolioPositionsTable";
import { PortfolioEmptyState } from "@/components/portfolio/PortfolioEmptyState";
import { AssetDetailSheet } from "@/components/ceiling/watchlist/AssetDetailSheet";

export const Route = createFileRoute("/app/myportfolio")({
  component: MyPortfolio,
});

/**
 * Portfólio Global — alinhado à seção "VIEW 2: PORTFÓLIO GLOBAL" do protótipo
 * interativo: Resumo Global (Header), Custódia por Corretora com classes,
 * Painel de Decomposição Cambial de ativos US e Tabela de Posições com Status vs Teto.
 */
function MyPortfolio() {
  const { valuedItems, totals, isAppLoading, macroRates, fx } = useValuedPortfolio();
  const usdBrlRate = fx?.USDBRL ?? EXCHANGE_RATE_FALLBACK;
  const { settings } = useUserSettings();
  const [selectedItem, setSelectedItem] = useState<ValuedWatchlistItem | null>(null);

  const activePositions = valuedItems.filter((item) => !item.isClosedPosition);
  const hasPositions = activePositions.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PortfolioSummaryHeader
        valuedItems={valuedItems}
        totals={totals}
        currency={settings.displayCurrency}
        usdBrlRate={usdBrlRate}
        isLoading={isAppLoading}
      />

      {!isAppLoading && !hasPositions ? (
        <PortfolioEmptyState />
      ) : (
        <>
          <BrokerCustodyCards
            valuedItems={valuedItems}
            currency={settings.displayCurrency}
            usdBrlRate={usdBrlRate}
            macroRates={macroRates}
            isLoading={isAppLoading}
          />

          <FxDecompositionPanel
            valuedItems={valuedItems}
            usdBrlRate={usdBrlRate}
            isLoading={isAppLoading}
            onSelectItem={setSelectedItem}
          />

          <PortfolioPositionsTable
            valuedItems={valuedItems}
            onSelectItem={setSelectedItem}
            isLoading={isAppLoading}
          />
        </>
      )}

      <AssetDetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
