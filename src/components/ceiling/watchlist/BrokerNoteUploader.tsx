import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UploadCloud, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { parseB3BrokerNote, ALL_SINACOR_BROKERS, type BrokerType } from "@/lib/dataIngestion/b3Parser";
import { useTransactions, recalculateHoldingFromTransactions, type Transaction } from "@/lib/transactions";
import { useWatchlist, makeId, WatchlistItem } from "@/lib/watchlist";
import { useQueryClient } from "@tanstack/react-query";
import { assetQueryOptions } from "@/lib/queryOptions";
import { getCanonicalAnnualDividend, ceilingPrice, safetyMargin } from "@/lib/calculations";
import { classifyBr } from "@/lib/classify";
import { toast } from "sonner";
// pdfjs-dist is loaded dynamically in processFile to avoid breaking SSR
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export function parseDdMmYyyyToTimestamp(dateStr: string): number {
  if (!dateStr) return Date.now();
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const fallback = new Date(dateStr).getTime();
  return isNaN(fallback) ? Date.now() : fallback;
}

export function consolidateTradesToWatchlistItems(
  trades: { ticker: string; quantity: number; price: number; date: string }[],
  existingTransactions: Transaction[],
  newlyCreatedTransactions: Transaction[],
  assetDataMap: Record<string, any> = {}
): WatchlistItem[] {
  const tradesByTicker = new Map<string, typeof trades>();
  for (const trade of trades) {
    const ticker = trade.ticker.toUpperCase();
    const list = tradesByTicker.get(ticker) || [];
    list.push(trade);
    tradesByTicker.set(ticker, list);
  }

  const itemsToImport: WatchlistItem[] = [];

  for (const [ticker, tickerTrades] of tradesByTicker.entries()) {
    const lastTrade = tickerTrades[tickerTrades.length - 1];
    const assetData = assetDataMap[ticker] || null;

    const type = assetData?.type || classifyBr(ticker);
    const annualDiv = assetData ? getCanonicalAnnualDividend(assetData, 3) : 0;
    const target = 6;
    const ceil = ceilingPrice(annualDiv, target);
    const margin = safetyMargin(ceil, lastTrade.price);

    const newlyCreatedIds = new Set(newlyCreatedTransactions.map((n) => n.id));
    const existingForTicker = existingTransactions.filter(
      (tx) => tx.ticker.toUpperCase() === ticker && !newlyCreatedIds.has(tx.id)
    );
    const newlyCreatedForTicker = newlyCreatedTransactions.filter(
      (tx) => tx.ticker.toUpperCase() === ticker
    );

    const allTickerTransactions = [...existingForTicker, ...newlyCreatedForTicker];
    const { quantity, averagePrice } = recalculateHoldingFromTransactions(allTickerTransactions);

    itemsToImport.push({
      id: makeId(ticker, type),
      ticker: ticker,
      name: assetData?.name || ticker,
      type,
      currency: "BRL",
      currentPrice: lastTrade.price,
      annualDividend: annualDiv,
      targetYield: target,
      ceilingPrice: ceil,
      safetyMargin: margin,
      quantity,
      averagePrice,
      paymentMonths: Array.isArray(assetData?.paymentMonths) ? assetData.paymentMonths : [],
      payoutRatio: null,
      targetMonthlyIncome: null,
      customTaxRate: null,
      sector: assetData?.sector || null,
      addedAt: Date.now(),
    } as WatchlistItem);
  }

  return itemsToImport;
}

interface BrokerNoteUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LAST_BROKER_KEY = "ceilingPricePro.lastUsedBroker.v1";

const BROKER_LABELS: Record<BrokerType, string> = {
  XP: "XP Investimentos",
  CLEAR: "Clear Corretora",
  RICO: "Rico Investimentos",
  MODAL: "ModalMais",
  BTG: "BTG Pactual",
  INTER: "Banco Inter",
  NUINVEST: "NuInvest",
  ORAMA: "Órama",
  GENIAL: "Genial Investimentos",
  ITAU: "Itaú Corretora",
  BRADESCO: "Bradesco / Ágora",
  SANTANDER: "Santander / Toro",
  BB: "Banco do Brasil",
  CAIXA: "Caixa Econômica Federal",
};

export function BrokerNoteUploader({ open, onOpenChange }: BrokerNoteUploaderProps) {
  const { t } = useI18n();
  const { upsertManyAsync } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<string>("AUTO");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(LAST_BROKER_KEY);
      if (saved && (saved === "AUTO" || ALL_SINACOR_BROKERS.includes(saved as BrokerType))) {
        setSelectedBroker(saved);
      } else {
        setSelectedBroker("AUTO");
      }
    }
  }, [open]);

  const handleBrokerChange = (val: string) => {
    setSelectedBroker(val);
    localStorage.setItem(LAST_BROKER_KEY, val);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let rawText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        rawText += pageText + "\n";
      }

      const result = parseB3BrokerNote(rawText, selectedBroker as BrokerType | "AUTO");

      if (result.brokerDivergence) {
        const detectedName = BROKER_LABELS[result.brokerDivergence.detected] || result.brokerDivergence.detected;
        const selectedName = BROKER_LABELS[result.brokerDivergence.selected] || result.brokerDivergence.selected;
        const notice = t.brokerNote.divergenceNotice
          .replace("{detected}", detectedName)
          .replace("{selected}", selectedName);
        toast.info(notice);
      }

      if (!result.success || !result.trades) {
        if (result.error === "broker_layout_unsupported") {
          const bName = result.broker ? (BROKER_LABELS[result.broker] || result.broker) : "";
          throw new Error(t.brokerNote.brokerLayoutUnsupported.replace("{broker}", bName));
        }
        if (result.error === "unknown_broker") {
          throw new Error(t.brokerNote.unknownBroker);
        }
        throw new Error(t.brokerNote.malformedPdf);
      }

      const newlyCreatedTransactions: Transaction[] = [];

      for (const trade of result.trades) {
        const txTimestamp = parseDdMmYyyyToTimestamp(trade.date);
        const transaction: Transaction = {
          id: `tx-pdf-${trade.ticker.toUpperCase()}-${txTimestamp}-${trade.quantity}-${trade.price}`,
          ticker: trade.ticker.toUpperCase(),
          type: "buy",
          date: txTimestamp,
          quantity: trade.quantity,
          pricePerShare: trade.price,
          fees: null,
        };

        try {
          await upsertTransaction(transaction);
          newlyCreatedTransactions.push(transaction);
        } catch (e) {
          console.error("Could not save transaction for trade", trade.ticker, e);
        }
      }

      const uniqueTickers = Array.from(new Set(result.trades.map((t) => t.ticker.toUpperCase())));
      const assetDataMap: Record<string, any> = {};

      for (const ticker of uniqueTickers) {
        try {
          assetDataMap[ticker] = await queryClient.ensureQueryData(assetQueryOptions(ticker));
        } catch (e) {
          console.warn("Could not fetch asset data for", ticker);
        }
      }

      const itemsToImport = consolidateTradesToWatchlistItems(
        result.trades,
        transactions,
        newlyCreatedTransactions,
        assetDataMap
      );

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
      <DialogContent closeLabel={t.common.close} className="sm:max-w-md border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl">{t.brokerNote.importTitle}</DialogTitle>
          <DialogDescription className="sr-only">{t.brokerNote.importTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t.brokerNote.selectBroker}
            </Label>
            <Select value={selectedBroker} onValueChange={handleBrokerChange}>
              <SelectTrigger className="w-full bg-background/50">
                <SelectValue placeholder={t.brokerNote.selectBroker} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">{t.brokerNote.autoDetect}</SelectItem>
                {ALL_SINACOR_BROKERS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {BROKER_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
              isDragging ? "border-success bg-success/5 scale-[1.02]" : "border-border/60 bg-background/40 hover:bg-muted/50"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
