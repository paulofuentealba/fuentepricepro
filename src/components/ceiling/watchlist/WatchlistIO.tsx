import { useCallback } from "react";
import { Download, FileSpreadsheet, ChevronDown, History, List } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  buildWatchlistCsv,
  buildWatchlistFullCsv,
  buildTransactionsCsv,
  downloadCsv,
} from "@/lib/csv";
import { type WatchlistItem } from "@/lib/watchlist";
import { useTransactions } from "@/lib/transactions";
import { useI18n } from "@/lib/i18n-provider";

interface Props {
  items: WatchlistItem[];
  onImport?: (item: WatchlistItem) => void;
}

export function WatchlistIO({ items }: Props) {
  const { t } = useI18n();
  const { transactions } = useTransactions();

  const handleExportQuick = useCallback(() => {
    if (items.length === 0) {
      toast.info(t.toasts.emptyWatchlist);
      return;
    }
    try {
      const csv = buildWatchlistCsv(items);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`watchlist-resumo-${date}.csv`, csv);
      toast.success(t.toasts.exportSuccess.replace("{{count}}", String(items.length)));
    } catch (err) {
      console.error("[export] failed", err);
      toast.error(t.toasts.exportFailed);
    }
  }, [items, t]);

  const handleExportFull = useCallback(() => {
    if (items.length === 0) {
      toast.info(t.toasts.emptyWatchlist);
      return;
    }
    try {
      const csv = buildWatchlistFullCsv(items);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`watchlist-completa-${date}.csv`, csv);
      toast.success(t.toasts.exportSuccess.replace("{{count}}", String(items.length)));
    } catch (err) {
      console.error("[export-full] failed", err);
      toast.error(t.toasts.exportFailed);
    }
  }, [items, t]);

  const handleExportTransactions = useCallback(() => {
    if (!transactions || transactions.length === 0) {
      toast.info("Nenhuma transação registrada para exportar.");
      return;
    }
    try {
      const csv = buildTransactionsCsv(transactions);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`transacoes-historico-${date}.csv`, csv);
      toast.success(t.toasts.exportSuccess.replace("{{count}}", String(transactions.length)));
    } catch (err) {
      console.error("[export-transactions] failed", err);
      toast.error(t.toasts.exportFailed);
    }
  }, [transactions, t]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          title={t.watchlist.exportData}
        >
          <Download className="h-3.5 w-3.5" />
          {t.watchlist.exportData}
          <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-popover border-border">
        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Exportar Dados
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2 text-xs"
          onClick={handleExportFull}
        >
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Posições Detalhadas</span>
            <span className="text-[10px] text-muted-foreground">Foto analítica rica com preços teto e DY</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2 text-xs"
          onClick={handleExportTransactions}
        >
          <History className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Histórico de Transações</span>
            <span className="text-[10px] text-muted-foreground">Todas as compras, vendas e taxas</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-1.5 text-xs text-muted-foreground"
          onClick={handleExportQuick}
        >
          <List className="h-3.5 w-3.5" />
          <span>Formato Rápido (4 colunas legadas)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

