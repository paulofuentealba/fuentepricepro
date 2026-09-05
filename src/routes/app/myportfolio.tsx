import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useValuedPortfolio, type ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { PortfolioSummaryHeader } from "@/components/portfolio/PortfolioSummaryHeader";
import { BrokerCustodyCards } from "@/components/portfolio/BrokerCustodyCards";
import { PortfolioPositionsTable } from "@/components/portfolio/PortfolioPositionsTable";
import { PortfolioEmptyState } from "@/components/portfolio/PortfolioEmptyState";
import { AssetDetailSheet } from "@/components/ceiling/watchlist/AssetDetailSheet";

export const Route = createFileRoute("/app/myportfolio")({
  component: MyPortfolio,
});

/**
 * Portfólio Global — reescrita baseada na seção "VIEW 2: PORTFÓLIO GLOBAL" do protótipo
 * aprovado (ver docs/superpowers/specs/2026-09-04-portfolio-global-redesign-design.md).
 * Substitui o antigo Watchlist.tsx (grid/tabela + dialogs inline de add/edit/CSV) por uma
 * página read-only; editar uma posição existente continua possível via clique na linha,
 * que abre o mesmo AssetDetailSheet de sempre.
 */
function MyPortfolio() {
  const { valuedItems, totals, isAppLoading, macroRates } = useValuedPortfolio();
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
        isLoading={isAppLoading}
      />

      {!isAppLoading && !hasPositions ? (
        <PortfolioEmptyState />
      ) : (
        <>
          <BrokerCustodyCards
            valuedItems={valuedItems}
            currency={settings.displayCurrency}
            macroRates={macroRates}
            isLoading={isAppLoading}
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
