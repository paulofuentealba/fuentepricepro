import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Loader2,
  ArrowRight,
  RefreshCw,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useImportParser } from "@/lib/useImportParser";
import type { MappableColumn, ParseResult } from "@/lib/dynamicCsvParser";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

interface DynamicImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmImport?: (result: ParseResult) => Promise<void> | void;
}

export function DynamicImportModal({
  open,
  onOpenChange,
  onConfirmImport,
}: DynamicImportModalProps) {
  const { t } = useI18n();
  const dict = t.dynamicImport;

  const {
    state,
    fileName,
    headers,
    columnMapping,
    sampleRows,
    totalRows,
    progress,
    result,
    error,
    loadFile,
    confirmMapping,
    reset,
  } = useImportParser();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedOverrides, setSelectedOverrides] = useState<
    Record<number, MappableColumn | "ignore">
  >({});
  const [showIgnoredDetails, setShowIgnoredDetails] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs feed
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [progress.logs]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      setSelectedOverrides({});
      setShowIgnoredDetails(false);
      setIsPersisting(false);
    }
  }, [open, reset]);

  // Initialize overrides from columnMapping
  useEffect(() => {
    if (state === "mapping" && columnMapping) {
      const initialOverrides: Record<number, MappableColumn | "ignore"> = {};
      headers.forEach((_, idx) => {
        initialOverrides[idx] = "ignore";
      });

      (Object.keys(columnMapping) as MappableColumn[]).forEach((colKey) => {
        const match = columnMapping[colKey];
        if (match.sourceIndex !== -1) {
          initialOverrides[match.sourceIndex] = colKey;
        }
      });
      setSelectedOverrides(initialOverrides);
    }
  }, [state, columnMapping, headers]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      loadFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadFile(file);
    }
  };

  // Validation: Ticker, Quantity, Price must be mapped
  const missingRequiredFields = useMemo(() => {
    const assignedColumns = new Set(Object.values(selectedOverrides));
    const missing: string[] = [];
    if (!assignedColumns.has("ticker")) missing.push(dict.fieldTicker);
    if (!assignedColumns.has("quantity")) missing.push(dict.fieldQuantity);
    if (!assignedColumns.has("price")) missing.push(dict.fieldPrice);
    return missing;
  }, [selectedOverrides, dict]);

  const handleProcess = () => {
    const manualMapping: Partial<Record<MappableColumn, number>> = {};
    Object.entries(selectedOverrides).forEach(([headerIdxStr, mappedField]) => {
      const idx = parseInt(headerIdxStr, 10);
      if (mappedField !== "ignore") {
        manualMapping[mappedField] = idx;
      }
    });
    confirmMapping(manualMapping);
  };

  const handleDownloadIgnoredCsv = () => {
    if (!result || result.ignored.length === 0) return;
    const lines: string[] = ["Linha;Motivo;Valores Originais"];
    result.ignored.forEach((item) => {
      const rawStr = JSON.stringify(item.rawValues).replace(/;/g, ",");
      lines.push(`${item.lineIndex};"${item.reason.replace(/"/g, '""')}";"${rawStr.replace(/"/g, '""')}"`);
    });
    downloadCsv(`pendencias-importacao-${Date.now()}.csv`, lines.join("\n"));
  };

  const handleConfirm = async () => {
    if (!result) return;
    if (onConfirmImport) {
      setIsPersisting(true);
      try {
        await onConfirmImport(result);
        onOpenChange(false);
      } finally {
        setIsPersisting(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-popover/95 backdrop-blur-xl border-border shadow-2xl transition-all duration-200",
          state === "mapping" ? "sm:max-w-2xl" : "sm:max-w-xl",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {dict.modalTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {dict.modalDescription}
          </DialogDescription>
        </DialogHeader>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="mt-2 h-7 text-xs border-destructive/40 hover:bg-destructive/20"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                {dict.changeFile}
              </Button>
            </div>
          </div>
        )}

        {/* STATE 1: DROPZONE */}
        {state === "idle" && (
          <div className="space-y-4 my-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center",
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-border/80 hover:border-primary/60 bg-background/40 hover:bg-background/60",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.xls,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="p-3 rounded-2xl bg-primary/10 text-primary mb-3">
                <UploadCloud className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {dict.dropzoneTitle}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {dict.dropzoneSubtitle}
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/30 border border-border/40 text-[11px] text-muted-foreground font-medium">
                <span>{dict.dropzoneSupportedFormats}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-background/50 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
              <p className="leading-snug">{dict.dropzoneParsingClientSide}</p>
            </div>
          </div>
        )}

        {/* STATE 2: COLUMN MAPPING */}
        {state === "mapping" && (
          <div className="space-y-4 my-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {dict.mappingTitle} ({fileName})
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {dict.mappingSubtitle}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {dict.changeFile}
              </Button>
            </div>

            {/* Missing required validation warning */}
            {missingRequiredFields.length > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-warning/30 bg-warning/10 text-warning text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>
                  {dict.requiredFieldsMissing.replace(
                    "{{fields}}",
                    missingRequiredFields.join(", "),
                  )}
                </p>
              </div>
            )}

            {/* Mapping rows */}
            <div className="space-y-2">
              {headers.map((header, idx) => {
                const assigned = selectedOverrides[idx] || "ignore";
                const autoMatch = columnMapping
                  ? Object.values(columnMapping).find((m) => m.sourceIndex === idx)
                  : null;
                const confidence = autoMatch ? autoMatch.confidence : "none";

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/60 bg-background/40 gap-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-xs font-semibold text-foreground truncate">
                        {header || `(Coluna ${idx + 1})`}
                      </span>
                      {confidence === "exact" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          {dict.confidenceExact}
                        </span>
                      )}
                      {confidence === "alias" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                          {dict.confidenceAlias}
                        </span>
                      )}
                      {confidence === "substring" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                          {dict.confidenceSubstring}
                        </span>
                      )}
                    </div>

                    <div className="w-full sm:w-60 shrink-0">
                      <select
                        aria-label={`Mapeamento para ${header || `Coluna ${idx + 1}`}`}
                        value={assigned}
                        onChange={(e) => {
                          const val = e.target.value as MappableColumn | "ignore";
                          setSelectedOverrides((prev) => ({
                            ...prev,
                            [idx]: val,
                          }));
                        }}
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="ignore">{dict.ignoreColumn}</option>
                        <option value="ticker">{dict.fieldTicker} *</option>
                        <option value="quantity">{dict.fieldQuantity} *</option>
                        <option value="price">{dict.fieldPrice} *</option>
                        <option value="operationType">{dict.fieldType}</option>
                        <option value="costs">{dict.fieldCosts}</option>
                        <option value="date">{dict.fieldDate}</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={reset}>
                {dict.closeModal}
              </Button>
              <Button
                size="sm"
                onClick={handleProcess}
                disabled={missingRequiredFields.length > 0}
                className="font-semibold shadow-md gap-1.5"
              >
                {dict.proceedToProcess}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STATE 3: PROCESSING / STREAMING */}
        {state === "processing" && (
          <div className="space-y-4 my-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-foreground">
                <span>{progress.message || dict.processingTitle}</span>
                <span>{progress.percent}%</span>
              </div>
              <Progress value={progress.percent} className="h-2 rounded-full" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {dict.logFeedTitle}
              </Label>
              <div
                ref={logContainerRef}
                className="h-44 overflow-y-auto p-3 rounded-xl border border-border/60 bg-black/40 font-mono text-[11px] text-muted-foreground space-y-1"
              >
                {progress.logs.map((log, i) => (
                  <p key={i} className="leading-snug text-foreground/90">
                    <span className="text-primary mr-1.5">›</span>
                    {log}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STATE 4: SUMMARY / DONE */}
        {state === "done" && result && (
          <div className="space-y-4 my-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-border/60 bg-background/40 text-center">
                <span className="text-xl font-bold text-foreground block">
                  {result.transactions.length}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {dict.statTotalTransactions}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-background/40 text-center">
                <span className="text-xl font-bold text-primary block">
                  {new Set(result.transactions.map((t) => t.ticker)).size}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {dict.statUniqueAssets}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-background/40 text-center">
                <span
                  className={cn(
                    "text-xl font-bold block",
                    result.ignored.length > 0 ? "text-warning" : "text-muted-foreground",
                  )}
                >
                  {result.ignored.length}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {dict.statIgnoredRows}
                </span>
              </div>
            </div>

            {/* Ignored rows accordion if any */}
            {result.ignored.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-background/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowIgnoredDetails(!showIgnoredDetails)}
                  className="flex w-full items-center justify-between p-3 text-xs font-semibold text-muted-foreground hover:bg-muted/10 transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    {dict.ignoredRowsTitle} ({result.ignored.length})
                  </span>
                  {showIgnoredDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showIgnoredDetails && (
                  <div className="p-3 border-t border-border/40 space-y-2 text-xs">
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {result.ignored.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between p-2 rounded-lg bg-background/60 border border-border/40 text-[11px]"
                        >
                          <span className="font-semibold text-foreground">
                            Linha {item.lineIndex}:
                          </span>
                          <span className="text-muted-foreground text-right">
                            {item.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadIgnoredCsv}
                      className="w-full text-xs font-medium gap-1.5 border-border/60"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {dict.downloadIgnoredCsv}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {dict.closeModal}
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isPersisting || result.transactions.length === 0}
                className="font-semibold shadow-md gap-1.5"
              >
                {isPersisting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {dict.confirmImport}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
