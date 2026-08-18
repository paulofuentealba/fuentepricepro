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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/formatters";
import {
  parseB3BrokerNote,
  ALL_SINACOR_BROKERS,
  type BrokerType,
  type TradeRecord,
  type UnresolvedTradeRecord,
} from "@/lib/dataIngestion/b3Parser";
import { useTransactions, recalculateHoldingFromTransactions, recalculateInvestingSinceFromTransactions, type Transaction } from "@/lib/transactions";
import { useWatchlist, makeId, WatchlistItem } from "@/lib/watchlist";
import { useIssuerTickerMappings } from "@/lib/useIssuerTickerMappings";
import { useQueryClient } from "@tanstack/react-query";
import { assetQueryOptions } from "@/lib/queryOptions";
import { getCanonicalAnnualDividend, getAssetValuation } from "@/lib/calculations";
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
    const val = getAssetValuation({
      targetYield: target,
      currentPrice: lastTrade.price,
      avgDividend: annualDiv,
      eps: assetData?.epsCurrent ?? assetData?.metrics?.eps ?? null,
      bvps: assetData?.metrics?.bvps ?? null,
      dividendCagr: assetData?.metrics?.dividendCagr5y ?? null,
      currency: assetData?.currency || (ticker.endsWith("3") || ticker.endsWith("4") || ticker.endsWith("11") ? "BRL" : "USD"),
      type,
    });
    const ceil = val.activeCeiling;
    const margin = val.margin;

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
      investingSince: recalculateInvestingSinceFromTransactions(allTickerTransactions) ?? Date.now(),
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
  const { t, locale } = useI18n();
  const { upsertManyAsync } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const { mappings, saveMappings } = useIssuerTickerMappings();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"upload" | "resolve">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<string>("AUTO");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resolvedTrades, setResolvedTrades] = useState<TradeRecord[]>([]);
  const [unresolvedTrades, setUnresolvedTrades] = useState<UnresolvedTradeRecord[]>([]);
  const [tickerInputs, setTickerInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setStep("upload");
      setResolvedTrades([]);
      setUnresolvedTrades([]);
      setTickerInputs({});
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

  const importTrades = async (allTrades: TradeRecord[]) => {
    const newlyCreatedTransactions: Transaction[] = [];

    for (const trade of allTrades) {
      const txTimestamp = parseDdMmYyyyToTimestamp(trade.date);
      const transaction: Transaction = {
        id: `tx-pdf-${trade.ticker.toUpperCase()}-${txTimestamp}-${trade.quantity}-${trade.price}`,
        ticker: trade.ticker.toUpperCase(),
        type: trade.type || "buy",
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

    const uniqueTickers = Array.from(new Set(allTrades.map((t) => t.ticker.toUpperCase())));
    const assetDataMap: Record<string, any> = {};

    for (const ticker of uniqueTickers) {
      try {
        assetDataMap[ticker] = await queryClient.ensureQueryData(assetQueryOptions(ticker));
      } catch (e) {
        console.warn("Could not fetch asset data for", ticker);
      }
    }

    const itemsToImport = consolidateTradesToWatchlistItems(
      allTrades,
      transactions,
      newlyCreatedTransactions,
      assetDataMap
    );

    await upsertManyAsync(itemsToImport);
    toast.success(`${itemsToImport.length} ${t.brokerNote.successImport}`);
    onOpenChange(false);
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

      const result = parseB3BrokerNote(rawText, selectedBroker as BrokerType | "AUTO", mappings);

      if (result.brokerDivergence) {
        const detectedName = BROKER_LABELS[result.brokerDivergence.detected] || result.brokerDivergence.detected;
        const selectedName = BROKER_LABELS[result.brokerDivergence.selected] || result.brokerDivergence.selected;
        const notice = t.brokerNote.divergenceNotice
          .replace("{detected}", detectedName)
          .replace("{selected}", selectedName);
        toast.info(notice);
      }

      if (!result.success) {
        if (result.error === "broker_layout_unsupported") {
          const bName = result.broker ? (BROKER_LABELS[result.broker] || result.broker) : "";
          throw new Error(t.brokerNote.brokerLayoutUnsupported.replace("{broker}", bName));
        }
        if (result.error === "unknown_broker") {
          throw new Error(t.brokerNote.unknownBroker);
        }
        throw new Error(t.brokerNote.malformedPdf);
      }

      const autoTrades = result.trades || [];
      const pendingUnresolved = result.unresolvedTrades || [];

      if (pendingUnresolved.length > 0) {
        setResolvedTrades(autoTrades);
        setUnresolvedTrades(pendingUnresolved);
        const initialInputs: Record<string, string> = {};
        pendingUnresolved.forEach((u) => {
          initialInputs[u.id] = "";
        });
        setTickerInputs(initialInputs);
        setStep("resolve");
      } else if (autoTrades.length > 0) {
        await importTrades(autoTrades);
      } else {
        throw new Error(t.brokerNote.malformedPdf);
      }
    } catch (err: any) {
      toast.error(t.brokerNote.errorImport + ": " + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmResolution = async () => {
    const newMappings: Record<string, string> = {};
    const newlyResolvedTrades: TradeRecord[] = [];

    for (const item of unresolvedTrades) {
      const entered = (tickerInputs[item.id] || "").trim().toUpperCase();
      if (!entered) {
        toast.error(t.brokerNote.invalidTickerError);
        return;
      }
      newMappings[item.normalizedKey] = entered;
      newlyResolvedTrades.push({
        ticker: entered,
        quantity: item.quantity,
        price: item.price,
        date: item.date,
        type: item.type,
      });
    }

    setIsProcessing(true);
    try {
      await saveMappings(newMappings);
      const allTrades = [...resolvedTrades, ...newlyResolvedTrades];
      await importTrades(allTrades);
    } catch (e: any) {
      toast.error(t.brokerNote.errorImport + ": " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.common.close} className="sm:max-w-md border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === "upload" ? t.brokerNote.importTitle : t.brokerNote.unresolvedTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {step === "upload" ? t.brokerNote.importTitle : t.brokerNote.unresolvedTitle}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
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
        ) : (
          <div className="space-y-4 mt-1">
            <div className="p-3.5 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning/90 leading-relaxed">
                {t.brokerNote.unresolvedDesc}
              </p>
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {unresolvedTrades.map((item) => {
                const totalVal = formatCurrency(item.quantity * item.price, "BRL", locale);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-background/50 border border-border/60 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground truncate max-w-[200px]" title={item.rawSpecification}>
                        {item.rawSpecification || item.normalizedKey}
                      </span>
                      <span
                        className={`font-medium px-2 py-0.5 rounded text-[10px] uppercase ${
                          item.type === "buy" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}
                      >
                        {item.type === "buy" ? t.brokerNote.typeBuy : t.brokerNote.typeSell}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {item.quantity} x {formatCurrency(item.price, "BRL", locale)}
                      </span>
                      <span className="font-semibold text-foreground">{totalVal}</span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`ticker-${item.id}`} className="sr-only">
                        {t.brokerNote.enterTicker}
                      </Label>
                      <Input
                        id={`ticker-${item.id}`}
                        value={tickerInputs[item.id] || ""}
                        onChange={(e) =>
                          setTickerInputs({
                            ...tickerInputs,
                            [item.id]: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder={t.brokerNote.enterTicker}
                        className="bg-background/80 uppercase tracking-wide text-xs h-9 focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={handleConfirmResolution}
              disabled={isProcessing}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-primary/30 transition-all"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {t.brokerNote.confirmResolution}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

