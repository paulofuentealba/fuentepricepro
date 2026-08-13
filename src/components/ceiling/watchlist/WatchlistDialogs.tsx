import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { AssetDetailSheet } from "./AssetDetailSheet";
import { PaywallDialog } from "../../ui/PaywallDialog";
import { AddFixedIncomeDialog } from "./AddFixedIncomeDialog";
import { BrokerNoteUploader } from "./BrokerNoteUploader";
import { CsvImportUploader } from "./CsvImportUploader";
import { useI18n } from "@/lib/i18n-provider";

interface WatchlistDialogsProps {
  detail: ValuedWatchlistItem | null;
  detailInitialTab?: "myPosition";
  showPaywall: boolean;
  showFIWizard: boolean;
  showBrokerNoteUploader: boolean;
  showCsvImporter: boolean;
  onCloseDetail: () => void;
  onPaywallOpenChange: (open: boolean) => void;
  onFIWizardOpenChange: (open: boolean) => void;
  onBrokerUploaderOpenChange: (open: boolean) => void;
  onCsvImporterOpenChange: (open: boolean) => void;
}

export function WatchlistDialogs({
  detail,
  detailInitialTab,
  showPaywall,
  showFIWizard,
  showBrokerNoteUploader,
  showCsvImporter,
  onCloseDetail,
  onPaywallOpenChange,
  onFIWizardOpenChange,
  onBrokerUploaderOpenChange,
  onCsvImporterOpenChange,
}: WatchlistDialogsProps) {
  const { t } = useI18n();

  return (
    <>
      <AssetDetailSheet item={detail} onClose={onCloseDetail} initialTab={detailInitialTab} />
      <PaywallDialog
        open={showPaywall}
        onOpenChange={onPaywallOpenChange}
        title={t.watchlist.limitReached}
        description={t.watchlist.limitReachedDesc}
      />
      <AddFixedIncomeDialog open={showFIWizard} onOpenChange={onFIWizardOpenChange} />
      <BrokerNoteUploader open={showBrokerNoteUploader} onOpenChange={onBrokerUploaderOpenChange} />
      <CsvImportUploader open={showCsvImporter} onOpenChange={onCsvImporterOpenChange} />
    </>
  );
}
