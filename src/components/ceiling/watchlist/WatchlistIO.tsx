import { useCallback, useRef, useState } from "react";
import { Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { assetQueryOptions } from "@/lib/queryOptions";
import {
  getCanonicalAnnualDividend,
  avgDividend,
  ceilingPrice,
  safetyMargin,
} from "@/lib/calculations";
import { buildWatchlistCsv, downloadCsv, parseWatchlistCsv } from "@/lib/csv";
import { makeId, type WatchlistItem } from "@/lib/watchlist";
import { useI18n } from "@/lib/i18n-provider";

interface Props {
  items: WatchlistItem[];
  onImport: (item: WatchlistItem) => void;
}

const DEFAULT_TARGET_YIELD = 6;

export function WatchlistIO({ items, onImport }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = useCallback(() => {
    if (items.length === 0) {
      toast.info(t.toasts.emptyWatchlist);
      return;
    }
    try {
      const csv = buildWatchlistCsv(items);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`watchlist-${date}.csv`, csv);
      toast.success(t.toasts.exportSuccess.replace("{{count}}", String(items.length)));
    } catch (err) {
      console.error("[export] failed", err);
      toast.error(t.toasts.exportFailed);
    }
  }, [items, t]);

  const handleFile = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const text = await file.text();
        const rows = parseWatchlistCsv(text);
        if (rows.length === 0) {
          toast.error(t.toasts.noValidRowsCsv);
          return;
        }
        let added = 0;
        let updated = 0;
        let failed = 0;
        const existingById = new Map(items.map((i) => [i.id, i]));

        for (const row of rows) {
          try {
            const asset = await queryClient.ensureQueryData(assetQueryOptions(row.ticker));
            const type = row.type ?? asset.type;
            const id = makeId(asset.ticker, type);
            const existing = existingById.get(id);
            const annual = getCanonicalAnnualDividend(asset, 3);
            const target = existing?.targetYield ?? DEFAULT_TARGET_YIELD;
            const ceiling = ceilingPrice(annual, target);
            const margin = safetyMargin(ceiling, asset.currentPrice);
            const qty = row.quantity > 0 ? row.quantity : (existing?.quantity ?? 0);
            if (qty <= 0) {
              failed++;
              continue;
            }
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
              quantity: qty,
              averagePrice:
                row.averagePrice != null ? row.averagePrice : (existing?.averagePrice ?? null),
              payoutRatio: existing?.payoutRatio ?? null,
              customTaxRate: existing?.customTaxRate ?? null,
              sector: existing?.sector ?? null,
              paymentMonths: Array.isArray(asset.paymentMonths) ? asset.paymentMonths : [],
              addedAt: existing?.addedAt ?? Date.now(),
              investingSince: existing?.investingSince ?? Date.now(),
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
      } catch (err) {
        console.error("[import] failed", err);
        toast.error(t.toasts.importFailed);
      } finally {
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [queryClient, items, onImport],
  );

  return (
    <div className="flex shrink-0 items-center gap-1">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={handleExport}
        title={t.watchlist.exportData}
      >
        <Download className="h-3.5 w-3.5" />
        {t.watchlist.exportData}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        title={t.watchlist.importData}
      >
        {importing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {t.watchlist.importData}
      </Button>
    </div>
  );
}
