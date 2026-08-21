import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { assetQueryOptions, ipcaFiveYearAverageQueryOptions } from "@/lib/queryOptions";
import {
  getCanonicalAnnualDividend,
  getAssetValuation,
  GORDON_TERMINAL_GROWTH_RATE,
} from "@/lib/calculations";
import {
  parseWatchlistCsv,
  parseTransactionTemplateCsv,
  decodeCsvBytes,
  detectCsvFormat,
} from "@/lib/csv";
import { makeId, useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import type { Currency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import {
  useTransactions,
  recalculateHoldingFromTransactions,
  recalculateInvestingSinceFromTransactions,
  type Transaction,
} from "@/lib/transactions";

export function useWatchlistCsvImport(
  providedItems?: WatchlistItem[],
  providedOnImport?: (item: WatchlistItem) => void,
) {
  const { t } = useI18n();
  const watchlist = useWatchlist();
  const items = providedItems ?? watchlist.items;
  const onImport = providedOnImport ?? watchlist.upsert;

  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const { transactions, upsert: upsertTransaction } = useTransactions();

  const handleFile = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const buffer = await file.arrayBuffer();
        const text = decodeCsvBytes(buffer);
        const ipcaAvg = await queryClient
          .ensureQueryData(ipcaFiveYearAverageQueryOptions())
          .catch(() => null);
        const terminalGrowthRate = ipcaAvg ?? GORDON_TERMINAL_GROWTH_RATE;

        // Detect format: Phase 3 Advanced Transaction Template vs Phase 1 Simple Watchlist Format
        const isAdvancedTemplate = detectCsvFormat(text) === "advanced";

        if (isAdvancedTemplate) {
          const templateRows = parseTransactionTemplateCsv(text);
          if (templateRows.length === 0) {
            toast.error(t.toasts.noValidRowsCsv);
            return;
          }
          let added = 0;
          let updated = 0;
          let failed = 0;
          const existingById = new Map(items.map((i) => [i.id, i]));
          const workingTransactions = [...transactions];

          for (const row of templateRows) {
            try {
              const asset = await queryClient.ensureQueryData(assetQueryOptions(row.ticker));
              const uppercaseTicker = asset.ticker.toUpperCase();
              const type = asset.type;
              const id = makeId(uppercaseTicker, type);
              const existing = existingById.get(id);
              const annual = getCanonicalAnnualDividend(asset, 3);
              const target = existing?.targetYield ?? 6;
              const val = getAssetValuation({
                targetYield: target,
                currentPrice: asset.currentPrice,
                avgDividend: annual,
                eps: asset.epsCurrent ?? asset.metrics?.eps ?? null,
                bvps: asset.metrics?.bvps ?? null,
                dividendCagr: asset.metrics?.dividendCagr5y ?? null,
                terminalGrowthRate,
                currency: asset.currency,
                type,
              });
              const ceiling = val.activeCeiling;
              const margin = val.margin;

              const txTimestamp = row.date || Date.now();
              let tx: Transaction;
              if (row.type === "corporate_action") {
                tx = {
                  id: `tx-csv-${uppercaseTicker}-${txTimestamp}-split-${row.factor}`,
                  ticker: uppercaseTicker,
                  type: "corporate_action",
                  date: txTimestamp,
                  quantity: 0,
                  pricePerShare: 0,
                  factor: row.factor ?? 1,
                  fees: null,
                  notes: t.transactions.csvImportAdjustment,
                };
              } else {
                const txPrice = row.pricePerShare > 0 ? row.pricePerShare : asset.currentPrice;
                tx = {
                  id: `tx-csv-${uppercaseTicker}-${txTimestamp}-${row.quantity}-${txPrice}`,
                  ticker: uppercaseTicker,
                  type: row.type, // "buy" or "sell" (from column Tipo in PT/EN/ES or fallback "buy")
                  date: txTimestamp,
                  quantity: row.quantity,
                  pricePerShare: txPrice,
                  fees: null,
                  notes: t.transactions.csvImportAdjustment,
                };
              }

              await upsertTransaction(tx);
              workingTransactions.push(tx);

              const finalTxs = workingTransactions.filter((t) => t.ticker === uppercaseTicker);
              const finalHolding = recalculateHoldingFromTransactions(finalTxs);

              const item: WatchlistItem = {
                id,
                ticker: asset.ticker,
                name: asset.name,
                type,
                currency: asset.currency,
                currentPrice: asset.currentPrice,
                annualDividend: annual,
                targetYield: target,
                ceilingPrice: ceiling,
                safetyMargin: margin,
                quantity: finalHolding.quantity,
                averagePrice: finalHolding.averagePrice,
                payoutRatio: existing?.payoutRatio ?? null,
                customTaxRate: existing?.customTaxRate ?? null,
                sector: existing?.sector ?? null,
                paymentMonths: Array.isArray(asset.paymentMonths) ? asset.paymentMonths : [],
                addedAt: existing?.addedAt ?? Date.now(),
                investingSince: Math.min(
                  existing?.investingSince && !isNaN(existing.investingSince) ? existing.investingSince : Infinity,
                  txTimestamp
                ),
              };
              onImport(item);
              if (existing) updated++;
              else added++;
            } catch {
              failed++;
            }
          }
          const parts: string[] = [];
          if (added) parts.push(t.toasts.importAdded.replace("{{count}}", String(added)));
          if (updated) parts.push(t.toasts.importUpdated.replace("{{count}}", String(updated)));
          if (failed) parts.push(t.toasts.importFailedCount.replace("{{count}}", String(failed)));
          const summary = parts.join(", ") || t.toasts.noChanges;
          toast.success(t.toasts.importComplete.replace("{{summary}}", summary));
        } else {
          // Phase 1 Simple Watchlist Format
          const rows = parseWatchlistCsv(text);
          if (rows.length === 0) {
            toast.error(t.toasts.noValidRowsCsv);
            return false;
          }
          let added = 0;
          let updated = 0;
          let failed = 0;
          const existingById = new Map(items.map((i) => [i.id, i]));
          const workingTransactions = [...transactions];

          for (const row of rows) {
            try {
              const asset = await queryClient.ensureQueryData(assetQueryOptions(row.ticker));
              const uppercaseTicker = asset.ticker.toUpperCase();
              const type = row.type ?? asset.type;
              const id = makeId(uppercaseTicker, type);
              const existing = existingById.get(id);
              const annual = row.annualDividend ?? getCanonicalAnnualDividend(asset, 3);
              const target = row.targetYield ?? existing?.targetYield ?? 6;
              const currency = (row.currency ?? existing?.currency ?? asset.currency) as Currency;
              const val = getAssetValuation({
                targetYield: target,
                currentPrice: asset.currentPrice,
                avgDividend: annual,
                eps: asset.epsCurrent ?? asset.metrics?.eps ?? null,
                bvps: asset.metrics?.bvps ?? null,
                dividendCagr: asset.metrics?.dividendCagr5y ?? null,
                terminalGrowthRate,
                currency,
                type,
              });
              const ceiling = row.ceilingPrice ?? val.activeCeiling;
              const margin = row.safetyMargin ?? val.margin;

              const existingAssetTxs = workingTransactions.filter((tx) => tx.ticker === uppercaseTicker);
              const currentHolding = recalculateHoldingFromTransactions(existingAssetTxs);

              let currentQty = currentHolding.quantity;
              let currentAvgPrice = currentHolding.averagePrice;

              if (existingAssetTxs.length === 0 && existing && existing.quantity > 0) {
                currentQty = existing.quantity;
                currentAvgPrice = existing.averagePrice ?? asset.currentPrice;
              }

              const importedQty = row.quantity > 0 ? row.quantity : currentQty;
              if (importedQty <= 0) {
                failed++;
                continue;
              }

              const importedAvgPrice =
                row.averagePrice != null && row.averagePrice > 0
                  ? row.averagePrice
                  : currentAvgPrice > 0
                    ? currentAvgPrice
                    : asset.currentPrice;

              const delta = importedQty - currentQty;
              const txTimestamp = Date.now();
              const noteText = t.transactions.csvImportAdjustment;

              if (existingAssetTxs.length === 0) {
                const txDate = row.investingSince ?? existing?.investingSince ?? txTimestamp;
                const firstTx: Transaction = {
                  id: `tx-csv-${uppercaseTicker}-${txDate}-${importedQty}-${importedAvgPrice}`,
                  ticker: uppercaseTicker,
                  type: "buy",
                  date: txDate,
                  quantity: importedQty,
                  pricePerShare: importedAvgPrice,
                  fees: null,
                  notes: noteText,
                };
                await upsertTransaction(firstTx);
                workingTransactions.push(firstTx);
              } else if (delta > 0) {
                const targetTotalCost = importedQty * importedAvgPrice;
                const currentTotalCost = currentQty * currentAvgPrice;
                const requiredCostForDelta = targetTotalCost - currentTotalCost;
                const pricePerShare = requiredCostForDelta > 0 ? requiredCostForDelta / delta : importedAvgPrice;
                const buyPrice = pricePerShare > 0 ? pricePerShare : importedAvgPrice;

                const buyTx: Transaction = {
                  id: `tx-csv-${uppercaseTicker}-${txTimestamp}-${delta}-${buyPrice}`,
                  ticker: uppercaseTicker,
                  type: "buy",
                  date: txTimestamp,
                  quantity: delta,
                  pricePerShare: buyPrice,
                  fees: null,
                  notes: noteText,
                };
                await upsertTransaction(buyTx);
                workingTransactions.push(buyTx);
              } else if (delta < 0) {
                const absDelta = Math.abs(delta);
                const sellTx: Transaction = {
                  id: `tx-csv-${uppercaseTicker}-${txTimestamp}-${absDelta}-${importedAvgPrice}`,
                  ticker: uppercaseTicker,
                  type: "sell",
                  date: txTimestamp,
                  quantity: absDelta,
                  pricePerShare: importedAvgPrice,
                  fees: null,
                  notes: noteText,
                };
                await upsertTransaction(sellTx);
                workingTransactions.push(sellTx);
              } else if (delta === 0 && row.averagePrice != null && row.averagePrice !== currentAvgPrice) {
                if (existingAssetTxs.length === 1 && existingAssetTxs[0].type === "buy") {
                  const updatedTx: Transaction = {
                    ...existingAssetTxs[0],
                    pricePerShare: importedAvgPrice,
                    notes: noteText,
                  };
                  await upsertTransaction(updatedTx);
                  const idx = workingTransactions.findIndex((tx) => tx.id === updatedTx.id);
                  if (idx >= 0) workingTransactions[idx] = updatedTx;
                }
              }

              const finalTxs = workingTransactions.filter((tx) => tx.ticker === uppercaseTicker);
              const finalHolding = recalculateHoldingFromTransactions(finalTxs);

              const item: WatchlistItem = {
                id,
                ticker: asset.ticker,
                name: row.name || existing?.name || asset.name,
                type,
                currency,
                currentPrice: asset.currentPrice,
                annualDividend: annual,
                targetYield: target,
                ceilingPrice: ceiling,
                safetyMargin: margin,
                quantity: finalHolding.quantity > 0 ? finalHolding.quantity : importedQty,
                averagePrice: finalHolding.averagePrice > 0 ? finalHolding.averagePrice : importedAvgPrice,
                payoutRatio: existing?.payoutRatio ?? null,
                customTaxRate: row.customTaxRate ?? existing?.customTaxRate ?? null,
                sector: row.sector ?? existing?.sector ?? null,
                targetMonthlyIncome: row.targetMonthlyIncome ?? existing?.targetMonthlyIncome ?? null,
                paymentMonths: Array.isArray(asset.paymentMonths) ? asset.paymentMonths : [],
                addedAt: existing?.addedAt ?? Date.now(),
                investingSince:
                  recalculateInvestingSinceFromTransactions(finalTxs) ??
                  row.investingSince ??
                  (existing?.investingSince && !isNaN(existing.investingSince)
                    ? existing.investingSince
                    : Date.now()),
              };
              onImport(item);
              if (existing) updated++;
              else added++;
            } catch {
              failed++;
            }
          }
          const parts: string[] = [];
          if (added) parts.push(t.toasts.importAdded.replace("{{count}}", String(added)));
          if (updated) parts.push(t.toasts.importUpdated.replace("{{count}}", String(updated)));
          if (failed) parts.push(t.toasts.importFailedCount.replace("{{count}}", String(failed)));
          const summary = parts.join(", ") || t.toasts.noChanges;
          toast.success(t.toasts.importComplete.replace("{{summary}}", summary));
          return true;
        }
      } catch (err) {
        console.error("[import] failed", err);
        toast.error(t.toasts.importFailed);
        return false;
      } finally {
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [queryClient, items, onImport, transactions, upsertTransaction, t],
  );

  const triggerImport = useCallback(() => {
    fileRef.current?.click();
  }, []);

  return {
    triggerImport,
    importing,
    fileInputProps: {
      ref: fileRef,
      type: "file" as const,
      accept: ".csv,text/csv",
      hidden: true,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) void handleFile(f);
      },
    },
    handleFile,
  };
}
