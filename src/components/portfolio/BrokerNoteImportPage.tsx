import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUp, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/formatters";
import { resolveReasonText } from "@/lib/askEngine";
import { cn } from "@/lib/utils";
import {
  parseBrokerNote,
  reconstructRowsFromTextItems,
  ALL_SUPPORTED_BROKERS,
  type SupportedBroker,
  type TradeRecord,
} from "@/lib/dataIngestion/brokerNoteParser";
import {
  parseDdMmYyyyToTimestamp,
  consolidateTradesToWatchlistItems,
} from "@/lib/dataIngestion/brokerNoteImport";
import { useTransactions, type Transaction } from "@/lib/transactions";
import { useWatchlist } from "@/lib/watchlist";
import { useIssuerTickerMappings } from "@/lib/useIssuerTickerMappings";
import { assetQueryOptions } from "@/lib/queryOptions";
import { toast } from "sonner";
// pdfjs-dist is loaded dynamically in processFile to avoid breaking SSR
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const BROKER_LABELS: Record<SupportedBroker, string> = {
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
  SCHWAB: "Charles Schwab",
};

interface ReviewRow {
  key: string;
  ticker: string;
  isUnresolved: boolean;
  normalizedKey?: string;
  rawSpecification?: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  date: string;
  fees?: number;
  checked: boolean;
}

/**
 * Full-page "Importar nota de corretagem" flow — replaces the old BrokerNoteUploader modal.
 * Reuses parseBrokerNote (all supported Brazilian + international brokers) and the moved-out
 * parseDdMmYyyyToTimestamp/consolidateTradesToWatchlistItems helpers unchanged — the only new
 * behavior is a review step: every detected trade (resolved or not) lands in a checklist the
 * user confirms before anything is written, instead of writing immediately on parse success.
 */
export function BrokerNoteImportPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { upsertManyAsync } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const { mappings, saveMappings } = useIssuerTickerMappings();

  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [detectedBroker, setDetectedBroker] = useState<SupportedBroker | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);

  const supportedBrokerLabels = useMemo(
    () => ALL_SUPPORTED_BROKERS.map((b) => BROKER_LABELS[b]),
    [],
  );

  const checkedRows = rows.filter((r) => r.checked);
  const totalFees = rows.reduce((sum, r) => sum + (r.fees || 0), 0);
  const detectedDate = rows[0]?.date ?? null;
  const canConfirm =
    checkedRows.length > 0 &&
    checkedRows.every((r) => !r.isUnresolved || r.ticker.trim().length > 0) &&
    !isImporting;

  function resetToUpload() {
    setStep("upload");
    setFileName(null);
    setDetectedBroker(null);
    setRows([]);
  }

  async function processFile(file: File) {
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
        const pageText = reconstructRowsFromTextItems(textContent.items as any);
        rawText += pageText + "\n";
      }

      const result = parseBrokerNote(rawText, "AUTO", mappings);

      if (!result.success) {
        if (result.error === "broker_layout_unsupported") {
          const bName = result.broker ? BROKER_LABELS[result.broker] || result.broker : "";
          throw new Error(t.brokerNote.brokerLayoutUnsupported.replace("{broker}", bName));
        }
        if (result.error === "unknown_broker") {
          throw new Error(t.brokerNote.unknownBroker);
        }
        throw new Error(t.brokerNote.malformedPdf);
      }

      const resolved = result.trades || [];
      const unresolved = result.unresolvedTrades || [];

      if (resolved.length === 0 && unresolved.length === 0) {
        throw new Error(t.brokerNote.malformedPdf);
      }

      const nextRows: ReviewRow[] = [
        ...resolved.map((trade, i) => ({
          key: `r-${i}-${trade.ticker}-${trade.date}`,
          ticker: trade.ticker.toUpperCase(),
          isUnresolved: false,
          type: trade.type || "buy",
          quantity: trade.quantity,
          price: trade.price,
          date: trade.date,
          fees: trade.fees,
          checked: true,
        })),
        ...unresolved.map((item) => ({
          key: item.id,
          ticker: "",
          isUnresolved: true,
          normalizedKey: item.normalizedKey,
          rawSpecification: item.rawSpecification,
          type: item.type,
          quantity: item.quantity,
          price: item.price,
          date: item.date,
          checked: true,
        })),
      ];

      setFileName(file.name);
      setDetectedBroker(result.broker ?? null);
      setRows(nextRows);
      setStep("review");
    } catch (err: any) {
      toast.error(t.brokerNote.errorImport + ": " + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    setIsImporting(true);
    try {
      const newMappings: Record<string, string> = {};
      for (const row of checkedRows) {
        if (row.isUnresolved && row.normalizedKey) {
          newMappings[row.normalizedKey] = row.ticker.trim().toUpperCase();
        }
      }
      if (Object.keys(newMappings).length > 0) {
        await saveMappings(newMappings);
      }

      const finalTrades: TradeRecord[] = checkedRows.map((row) => ({
        ticker: row.ticker.trim().toUpperCase(),
        quantity: row.quantity,
        price: row.price,
        date: row.date,
        type: row.type,
        fees: row.fees,
      }));

      const newlyCreatedTransactions: Transaction[] = [];
      const validTrades: TradeRecord[] = [];
      let invalidDatesCount = 0;

      for (const trade of finalTrades) {
        const txTimestamp = parseDdMmYyyyToTimestamp(trade.date);
        if (txTimestamp === null) {
          invalidDatesCount++;
          continue;
        }
        validTrades.push(trade);

        const transaction: Transaction = {
          id: `tx-pdf-${trade.ticker}-${txTimestamp}-${trade.quantity}-${trade.price}`,
          ticker: trade.ticker,
          type: trade.type || "buy",
          date: txTimestamp,
          quantity: trade.quantity,
          pricePerShare: trade.price,
          fees: trade.fees != null ? trade.fees : null,
        };

        try {
          await upsertTransaction(transaction);
          newlyCreatedTransactions.push(transaction);
        } catch (e) {
          console.error("Could not save transaction for trade", trade.ticker, e);
        }
      }

      if (invalidDatesCount > 0) {
        toast.error(t.toasts.brokerNoteInvalidDatesSkipped.replace("{{count}}", String(invalidDatesCount)));
      }

      if (validTrades.length === 0) {
        setIsImporting(false);
        return;
      }

      const uniqueTickers = Array.from(new Set(validTrades.map((tr) => tr.ticker)));
      const assetDataMap: Record<string, any> = {};
      for (const ticker of uniqueTickers) {
        try {
          assetDataMap[ticker] = await queryClient.ensureQueryData(assetQueryOptions(ticker));
        } catch {
          // Asset metadata is best-effort here — consolidateTradesToWatchlistItems falls back
          // to classifyBr()/raw ticker when it's missing, so a lookup failure isn't fatal.
        }
      }

      const itemsToImport = consolidateTradesToWatchlistItems(
        validTrades,
        transactions,
        newlyCreatedTransactions,
        assetDataMap,
      );

      await upsertManyAsync(itemsToImport);
      toast.success(t.brokerNote.successImport.replace("{{count}}", String(itemsToImport.length)));
      navigate({ to: "/app/myportfolio" });
    } catch (e: any) {
      toast.error(t.brokerNote.errorImport + ": " + e.message);
    } finally {
      setIsImporting(false);
    }
  }

  const confirmLabel =
    checkedRows.length === 1
      ? t.brokerNoteImportPage?.confirmOne
      : resolveReasonText(t, "brokerNoteImportPage.confirmN", { count: checkedRows.length });

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-display font-semibold uppercase tracking-widest text-success">
            {resolveReasonText(t, "brokerNoteImportPage.eyebrow", { count: ALL_SUPPORTED_BROKERS.length })}
          </div>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t.brokerNoteImportPage?.title}
          </h1>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => navigate({ to: "/app/myportfolio" })}>
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.brokerNoteImportPage?.back}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: upload */}
        <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
          <h3 className="font-serif text-base font-medium text-foreground">{t.brokerNoteImportPage?.uploadCardTitle}</h3>

          <div
            className={cn(
              "mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer",
              isDragging ? "border-success bg-success/5 scale-[1.01]" : "border-border/60 bg-background hover:bg-muted/30",
            )}
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
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-9 w-9 animate-spin text-success" />
                <p className="text-sm font-medium text-foreground">{t.brokerNote.importing}</p>
              </div>
            ) : (
              <>
                <ArrowUp className="h-7 w-7 text-accent-text" />
                <p className="mt-3 font-serif text-lg font-semibold text-foreground">
                  {t.brokerNoteImportPage?.dragDropTitle}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">{t.brokerNoteImportPage?.dragDropDesc}</p>
                <p className="text-sm text-muted-foreground">{t.brokerNoteImportPage?.autoDetectDesc}</p>
              </>
            )}
            <input
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processFile(e.target.files[0]);
                }
              }}
            />
          </div>

          <p className="mt-5 text-[11px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t.brokerNoteImportPage?.supportedBrokers}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {supportedBrokerLabels.map((label) => (
              <div
                key={label}
                className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{t.brokerNoteImportPage?.privacyNote}</p>
        </div>

        {/* Right: review */}
        <div className="rounded-[22px] border border-border/60 bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-base font-medium text-foreground">{t.brokerNoteImportPage?.reviewCardTitle}</h3>
            {fileName && (
              <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                {fileName}
              </span>
            )}
          </div>

          {step === "upload" || rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t.brokerNoteImportPage?.empty}</p>
          ) : (
            <>
              {detectedBroker && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{t.brokerNoteImportPage?.detectedBroker}</span>
                  <span className="font-semibold text-foreground">
                    {BROKER_LABELS[detectedBroker]}
                    {detectedDate ? ` · ${detectedDate}` : ""}
                  </span>
                </div>
              )}

              <div className="mt-4 flex flex-col divide-y divide-border/40">
                {rows.map((row) => {
                  const total = row.quantity * row.price;
                  return (
                    <div key={row.key} className="flex items-center gap-3 py-3">
                      <Checkbox
                        checked={row.checked}
                        onCheckedChange={(v) =>
                          setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, checked: !!v } : r)))
                        }
                      />
                      <div className="min-w-0 flex-1">
                        {row.isUnresolved ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={row.ticker}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.key === row.key ? { ...r, ticker: e.target.value.toUpperCase() } : r,
                                  ),
                                )
                              }
                              placeholder={t.brokerNoteImportPage?.unresolvedTickerPlaceholder}
                              className="h-8 max-w-[180px] text-xs uppercase"
                            />
                            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                              {t.brokerNoteImportPage?.unresolvedBadge}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm font-semibold text-foreground">{row.ticker}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {row.type === "buy" ? t.brokerNote.typeBuy : t.brokerNote.typeSell} ·{" "}
                          {resolveReasonText(t, "brokerNoteImportPage.unitsLabelGeneric", { qty: row.quantity })}
                        </div>
                      </div>
                      <div className="shrink-0 font-mono text-sm font-semibold text-foreground">
                        {formatCurrency(total, "BRL", locale)}
                      </div>
                    </div>
                  );
                })}

                {totalFees > 0 && (
                  <div className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <div className="text-foreground">{t.brokerNoteImportPage?.feesRowLabel}</div>
                      <div className="text-xs text-muted-foreground">{t.brokerNoteImportPage?.feesRowDesc}</div>
                    </div>
                    <div className="font-mono font-semibold text-foreground">{formatCurrency(totalFees, "BRL", locale)}</div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p className="text-xs leading-relaxed text-foreground">
                  <span className="font-semibold text-warning">{t.brokerNoteImportPage?.reviewWarningTitle}</span>{" "}
                  {t.brokerNoteImportPage?.reviewWarningDesc}
                </p>
              </div>

              <div className="mt-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={resetToUpload} disabled={isImporting}>
                  {t.brokerNoteImportPage?.edit}
                </Button>
                <Button
                  className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                  disabled={!canConfirm}
                  onClick={handleConfirm}
                >
                  {isImporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  {confirmLabel}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
