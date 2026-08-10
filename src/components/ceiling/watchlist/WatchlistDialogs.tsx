import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { EditItemDialog } from "./EditItemDialog";
import { AssetDetailSheet } from "./AssetDetailSheet";
import { PaywallDialog } from "../../ui/PaywallDialog";
import { FixedIncomeWizardSheet } from "./FixedIncomeWizardSheet";
import { BrokerNoteUploader } from "./BrokerNoteUploader";
import { CsvImportUploader } from "./CsvImportUploader";
import { useI18n } from "@/lib/i18n-provider";
import type { WatchlistItem } from "@/lib/watchlist";

interface WatchlistDialogsProps {
  editing: ValuedWatchlistItem | null;
  detail: ValuedWatchlistItem | null;
  showPaywall: boolean;
  showFIWizard: boolean;
  showBrokerNoteUploader: boolean;
  showCsvImporter: boolean;
  onCloseDialog: () => void;
  onSave: (patch: Partial<WatchlistItem>) => void;
  onCloseDetail: () => void;
  onPaywallOpenChange: (open: boolean) => void;
  onFIWizardOpenChange: (open: boolean) => void;
  onBrokerUploaderOpenChange: (open: boolean) => void;
  onCsvImporterOpenChange: (open: boolean) => void;
}

export function WatchlistDialogs({
  editing,
  detail,
  showPaywall,
  showFIWizard,
  showBrokerNoteUploader,
  showCsvImporter,
  onCloseDialog,
  onSave,
  onCloseDetail,
  onPaywallOpenChange,
  onFIWizardOpenChange,
  onBrokerUploaderOpenChange,
  onCsvImporterOpenChange,
}: WatchlistDialogsProps) {
  const { t } = useI18n();

  return (
    <>
      <EditItemDialog item={editing} onClose={onCloseDialog} onSave={onSave} />
      <AssetDetailSheet item={detail} onClose={onCloseDetail} />
      <PaywallDialog
        open={showPaywall}
        onOpenChange={onPaywallOpenChange}
        title={t.watchlist.limitReached}
        description={t.watchlist.limitReachedDesc}
      />
      <FixedIncomeWizardSheet open={showFIWizard} onOpenChange={onFIWizardOpenChange} />
      <BrokerNoteUploader open={showBrokerNoteUploader} onOpenChange={onBrokerUploaderOpenChange} />
      <CsvImportUploader open={showCsvImporter} onOpenChange={onCsvImporterOpenChange} />
    </>
  );
}
