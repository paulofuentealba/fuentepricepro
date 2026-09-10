import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DynamicImportModal } from "@/components/horizonte/DynamicImportModal";
import type { ParseResult } from "@/lib/dynamicCsvParser";
import { reconcileParsedTransactionsToWatchlistItems } from "@/lib/dataIngestion/csvImportReconcile";
import { assetQueryOptions, ipcaFiveYearAverageQueryOptions } from "@/lib/queryOptions";
import { GORDON_TERMINAL_GROWTH_RATE } from "@/lib/calculations";
import { useTransactions, type Transaction } from "@/lib/transactions";
import { useWatchlist } from "@/lib/watchlist";
import { useI18n } from "@/lib/i18n-provider";

interface CsvImportWatchlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Owns every hook the "Trazer meu arquivo" import flow needs (react-query client,
 * transactions, watchlist) so that PortfolioSummaryHeader — a lightweight, broadly-rendered
 * summary component covered by a unit test with minimal mocking — never has to call them
 * itself. Mirrors the isolation the old CsvImportUploader/useWatchlistCsvImport pair already
 * had; this component is this flow's direct replacement, wired the same way.
 */
export function CsvImportWatchlistModal({ open, onOpenChange }: CsvImportWatchlistModalProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const { items: watchlistItems, upsertManyAsync } = useWatchlist();

  const handleCsvConfirmImport = async (result: ParseResult) => {
    const ipcaAvg = await queryClient
      .ensureQueryData(ipcaFiveYearAverageQueryOptions())
      .catch(() => null);
    const terminalGrowthRate = ipcaAvg ?? GORDON_TERMINAL_GROWTH_RATE;

    const newlyCreatedTransactions: Transaction[] = [];
    let failedCount = 0;
    for (const tx of result.transactions) {
      const ticker = tx.ticker.toUpperCase();
      const transaction: Transaction = {
        id: `tx-csv-${ticker}-${tx.date.getTime()}-${tx.quantity}-${tx.price}`,
        ticker,
        type: tx.type === "BUY" ? "buy" : "sell",
        date: tx.date.getTime(),
        quantity: tx.quantity,
        pricePerShare: tx.price,
        fees: tx.costs || null,
        notes: tx.notes,
      };
      try {
        await upsertTransaction(transaction);
        newlyCreatedTransactions.push(transaction);
      } catch (e) {
        failedCount++;
        console.error("[csv-import] failed to save transaction", ticker, e);
      }
    }

    if (newlyCreatedTransactions.length === 0) {
      toast.error(t.toasts.importFailed);
      return;
    }

    const uniqueTickers = Array.from(new Set(newlyCreatedTransactions.map((tx) => tx.ticker)));
    const assetDataMap: Record<string, any> = {};
    for (const ticker of uniqueTickers) {
      try {
        assetDataMap[ticker] = await queryClient.ensureQueryData(assetQueryOptions(ticker));
      } catch {
        // Asset metadata is best-effort — reconcileParsedTransactionsToWatchlistItems skips a
        // ticker entirely if its asset data never resolves, rather than fabricating an item.
      }
    }

    const itemsToImport = reconcileParsedTransactionsToWatchlistItems(
      result.transactions,
      transactions,
      newlyCreatedTransactions,
      assetDataMap,
      watchlistItems,
      terminalGrowthRate,
    );

    await upsertManyAsync(itemsToImport);

    if (failedCount > 0) {
      toast.warning(
        t.toasts.importFailedCount?.replace("{{count}}", String(failedCount)) ??
          `${failedCount} transações falharam.`,
      );
    }
    toast.success(
      t.dynamicImport.importSuccessToast.replace("{{count}}", String(newlyCreatedTransactions.length)),
    );
  };

  return <DynamicImportModal open={open} onOpenChange={onOpenChange} onConfirmImport={handleCsvConfirmImport} />;
}
