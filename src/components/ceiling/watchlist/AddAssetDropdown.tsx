import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, FileType2, PlusCircle, Shield, TrendingUp, FileSpreadsheet, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useWatchlist } from "@/lib/watchlist";
import { useWatchlistCsvImport } from "./useWatchlistCsvImport";
import { buildTransactionTemplateCsv, downloadCsv } from "@/lib/csv";
import { toast } from "sonner";

interface AddAssetDropdownProps {
  onNavigateToScreener: () => void;
  onOpenFIWizard: () => void;
  onOpenBrokerUploader: () => void;
}

export function AddAssetDropdown({
  onNavigateToScreener,
  onOpenFIWizard,
  onOpenBrokerUploader,
}: AddAssetDropdownProps) {
  const { t } = useI18n();
  const { items, upsert } = useWatchlist();
  const { triggerImport, fileInputProps } = useWatchlistCsvImport(items, upsert);

  const handleDownloadTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const csv = buildTransactionTemplateCsv();
      downloadCsv("modelo-importacao-transacoes.csv", csv);
      toast.success(t.toasts?.exportSuccess?.replace("{{count}}", "1") || "Modelo CSV baixado com sucesso!");
    } catch (err) {
      console.error("[csv-template] download failed", err);
      toast.error(t.toasts?.exportFailed || "Falha ao baixar o modelo.");
    }
  };

  return (
    <DropdownMenu>
      <input {...fileInputProps} />
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <PlusCircle className="h-3.5 w-3.5" />
          {t.watchlist.addAssetDropdown || t.watchlist.addFirstAsset || "Add Asset"}
          <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56 bg-popover border-border">
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2.5 focus:bg-accent focus:text-primary"
          onClick={onNavigateToScreener}
        >
          <TrendingUp className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{t.watchlist.addEquity}</span>
            <span className="text-xs text-muted-foreground">{t.watchlist.addEquityDesc}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2.5 focus:bg-accent focus:text-primary"
          onClick={onOpenFIWizard}
        >
          <Shield className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{t.watchlist.addFixedIncome}</span>
            <span className="text-xs text-muted-foreground">{t.watchlist.addFixedIncomeDesc}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2.5 focus:bg-accent focus:text-primary"
          onClick={onOpenBrokerUploader}
        >
          <FileType2 className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{t.watchlist.importBrokerNote}</span>
            <span className="text-xs text-muted-foreground truncate w-[160px]">
              XP, Rico, Clear, BTG, Modal, Inter, NuInvest, Órama, Genial
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2.5 focus:bg-accent focus:text-primary"
          onClick={triggerImport}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{t.watchlist.addAssetDropdownImportFile}</span>
            <span className="text-xs text-muted-foreground">CSV/Excel</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2 focus:bg-accent focus:text-primary border-t border-border/40 mt-1"
          onClick={handleDownloadTemplate}
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium text-xs text-foreground">
              {t.watchlist.downloadTemplate}
            </span>
            <span className="text-[11px] text-muted-foreground">
              modelo-importacao-transacoes.csv
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
