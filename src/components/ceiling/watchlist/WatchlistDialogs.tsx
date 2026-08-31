import { lazy, Suspense } from "react";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { AssetDetailSheet } from "./AssetDetailSheet";
import { PaywallDialog } from "../../ui/PaywallDialog";
import { AddFixedIncomeDialog } from "./AddFixedIncomeDialog";
import { CsvImportUploader } from "./CsvImportUploader";
import type { ParseResult } from "@/lib/dynamicCsvParser";
import { useI18n } from "@/lib/i18n-provider";

const DynamicImportModal = lazy(() =>
  import("@/components/horizonte/DynamicImportModal").then((m) => ({
    default: m.DynamicImportModal,
  }))
);

interface WatchlistDialogsProps {
  detail: ValuedWatchlistItem | null;
  detailInitialTab?: "myPosition";
  showPaywall: boolean;
  showFIWizard: boolean;
  showCsvImporter: boolean;
  showDynamicImporter?: boolean;
  onCloseDetail: () => void;
  onPaywallOpenChange: (open: boolean) => void;
  onFIWizardOpenChange: (open: boolean) => void;
  onCsvImporterOpenChange: (open: boolean) => void;
  onDynamicImporterOpenChange?: (open: boolean) => void;
  onConfirmDynamicImport?: (result: ParseResult) => Promise<void> | void;
  onUpdateInvestingSince?: (id: string, timestamp: number) => Promise<void>;
}

export function WatchlistDialogs({
  detail,
  detailInitialTab,
  showPaywall,
  showFIWizard,
  showCsvImporter,
  showDynamicImporter = false,
  onCloseDetail,
  onPaywallOpenChange,
  onFIWizardOpenChange,
  onCsvImporterOpenChange,
  onDynamicImporterOpenChange,
  onConfirmDynamicImport,
  onUpdateInvestingSince,
}: WatchlistDialogsProps) {
  const { t } = useI18n();

  return (
    <>
      <AssetDetailSheet
        item={detail}
        onClose={onCloseDetail}
        initialTab={detailInitialTab}
        onUpdateInvestingSince={onUpdateInvestingSince}
      />
      <PaywallDialog
        open={showPaywall}
        onOpenChange={onPaywallOpenChange}
        title={t.watchlist.limitReached}
        description={t.watchlist.limitReachedDesc}
      />
      <AddFixedIncomeDialog open={showFIWizard} onOpenChange={onFIWizardOpenChange} />
      <CsvImportUploader open={showCsvImporter} onOpenChange={onCsvImporterOpenChange} />
      {onDynamicImporterOpenChange && showDynamicImporter && (
        <Suspense fallback={null}>
          <DynamicImportModal
            open={showDynamicImporter}
            onOpenChange={onDynamicImporterOpenChange}
            onConfirmImport={onConfirmDynamicImport}
          />
        </Suspense>
      )}
    </>
  );
}
