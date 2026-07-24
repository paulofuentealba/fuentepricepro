import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UploadCloud, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { parseB3BrokerNote } from "@/lib/dataIngestion/b3Parser";
import { useWatchlist, makeId, WatchlistItem } from "@/lib/watchlist";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

interface BrokerNoteUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrokerNoteUploader({ open, onOpenChange }: BrokerNoteUploaderProps) {
  const { t } = useI18n();
  const { upsertManyAsync } = useWatchlist();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let rawText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        rawText += pageText + "\n";
      }

      const result = parseB3BrokerNote(rawText);
      
      if (!result.success || !result.trades) {
        if (result.error === 'unknown_broker') {
          throw new Error(t.brokerNote.unknownBroker);
        }
        throw new Error(t.brokerNote.malformedPdf);
      }

      const itemsToImport: WatchlistItem[] = result.trades.map(trade => {
        let type: any = "STOCK_BR";
        if (trade.ticker.endsWith("11")) type = "FII";
        
        return {
          id: makeId(trade.ticker, type),
          ticker: trade.ticker,
          name: trade.ticker,
          type,
          currency: "BRL",
          currentPrice: trade.price,
          annualDividend: 0,
          targetYield: 6,
          ceilingPrice: 0,
          safetyMargin: 0,
          quantity: trade.quantity,
          averagePrice: trade.price,
          paymentMonths: [],
          payoutRatio: null,
          targetMonthlyIncome: null,
          customTaxRate: null,
          sector: null,
          addedAt: Date.now(),
        } as WatchlistItem;
      });

      await upsertManyAsync(itemsToImport);
      toast.success(`${itemsToImport.length} ${t.brokerNote.successImport}`);
      onOpenChange(false);

    } catch (err: any) {
      toast.error(t.brokerNote.errorImport + ": " + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl">{t.brokerNote.importTitle}</DialogTitle>
          <DialogDescription className="sr-only">{t.brokerNote.importTitle}</DialogDescription>
        </DialogHeader>
        
        <div 
          className={`mt-2 flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${isDragging ? 'border-success bg-success/5 scale-[1.02]' : 'border-border/60 bg-background/40 hover:bg-muted/50'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              processFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-md bg-success/20 animate-pulse"></div>
                <Loader2 className="h-10 w-10 text-success animate-spin relative z-10" />
              </div>
              <p className="text-sm font-medium text-foreground">{t.brokerNote.importing}</p>
            </div>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-5 ring-1 ring-success/20 shadow-sm transition-transform group-hover:scale-110">
                <UploadCloud className="h-8 w-8 text-success" />
              </div>
              <p className="text-base font-semibold text-foreground text-center mb-1.5 tracking-tight">
                {t.brokerNote.dragDropText}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                {t.brokerNote.orClick}
              </p>
            </>
          )}
          <input 
            type="file" 
            accept=".pdf" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processFile(e.target.files[0]);
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
