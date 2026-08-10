import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useWatchlistCsvImport } from "./useWatchlistCsvImport";
import { buildTransactionTemplateCsv, downloadCsv } from "@/lib/csv";
import { toast } from "sonner";

interface CsvImportUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CsvImportUploader({ open, onOpenChange }: CsvImportUploaderProps) {
  const { t } = useI18n();
  const { importing, handleFile } = useWatchlistCsvImport();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processFile = async (file: File) => {
    const success = await handleFile(file);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-popover/95 backdrop-blur-xl border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {t.watchlist.csvImportTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.watchlist.csvImportSub}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/50 border border-border/60 gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                {t.watchlist.csvImportTemplateNotice}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {t.watchlist.csvImportTemplateNoticeSub}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs shrink-0 border-border/60 hover:bg-muted font-medium"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-3.5 w-3.5" />
              {t.watchlist.downloadTemplate}
            </Button>
          </div>

          <div
            className={`group relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/5 shadow-inner"
                : "border-border/60 bg-background/40 hover:border-primary/50 hover:bg-background/80"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                void processFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => !importing && fileInputRef.current?.click()}
          >
            {importing ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-md bg-success/20 animate-pulse"></div>
                  <Loader2 className="h-10 w-10 text-success animate-spin relative z-10" />
                </div>
                <p className="text-sm font-medium text-foreground">{t.brokerNote.importing}</p>
              </div>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 mb-4 ring-1 ring-success/20 shadow-sm transition-transform group-hover:scale-110">
                  <UploadCloud className="h-7 w-7 text-success" />
                </div>
                <p className="text-base font-semibold text-foreground text-center mb-1 tracking-tight">
                  {t.brokerNote.dragDropText}
                </p>
                <p className="text-sm text-muted-foreground text-center">{t.brokerNote.orClick}</p>
              </>
            )}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void processFile(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
