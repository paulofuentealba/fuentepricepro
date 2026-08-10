import { useCallback } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildWatchlistCsv, downloadCsv } from "@/lib/csv";
import { type WatchlistItem } from "@/lib/watchlist";
import { useI18n } from "@/lib/i18n-provider";

interface Props {
  items: WatchlistItem[];
  onImport?: (item: WatchlistItem) => void;
}

export function WatchlistIO({ items }: Props) {
  const { t } = useI18n();

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

  return (
    <div className="flex shrink-0 items-center gap-1">
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
    </div>
  );
}

