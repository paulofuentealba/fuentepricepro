import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { STICKY_FIRST_COLUMN_CLASS } from "@/components/ui/responsive-table";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { computeRecommendedAction, type RecommendedActionKey } from "@/lib/selectors/recommendedAction";
import { netAfterTax } from "@/lib/calculations";

const ACTION_BADGE_VARIANT: Record<RecommendedActionKey, "success" | "warning" | "destructive" | "outline"> = {
  buy: "success",
  watch: "warning",
  avoid: "destructive",
  yieldTrap: "destructive",
  noData: "outline",
};

interface PortfolioPositionsTableProps {
  valuedItems: ValuedWatchlistItem[];
  onSelectItem: (item: ValuedWatchlistItem) => void;
  isLoading: boolean;
}

export function PortfolioPositionsTable({ valuedItems, onSelectItem, isLoading }: PortfolioPositionsTableProps) {
  const { locale, t } = useI18n();

  const actionLabel: Record<RecommendedActionKey, string> = {
    buy: t.dashboard.matrix.actionBuy,
    watch: t.dashboard.matrix.actionWatch,
    avoid: t.dashboard.matrix.actionAvoid,
    yieldTrap: t.dashboard.matrix.actionYieldTrap,
    noData: t.dashboard.matrix.actionNoData,
  };

  const positions = valuedItems.filter((item) => !item.isClosedPosition);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (positions.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.portfolio.emptyPositions}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead className={STICKY_FIRST_COLUMN_CLASS}>{t.portfolio.columnAsset}</TableHead>
            <TableHead>{t.portfolio.columnBroker}</TableHead>
            <TableHead>{t.portfolio.columnQty}</TableHead>
            <TableHead>{t.portfolio.columnAvgPrice}</TableHead>
            <TableHead>{t.portfolio.columnPrice}</TableHead>
            <TableHead>{t.portfolio.columnTotal}</TableHead>
            <TableHead>{t.portfolio.columnPnl}</TableHead>
            <TableHead>{t.portfolio.columnYoc}</TableHead>
            <TableHead>{t.portfolio.columnStatus}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((item) => {
            const livePrice = item.livePrice ?? item.currentPrice ?? 0;
            const avgPrice = item.averagePrice ?? 0;
            const total = livePrice * item.quantity;
            const invested = avgPrice * item.quantity;
            const pnl = total - invested;
            const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
            const netAnnualDividendPerShare = netAfterTax(
              item.annualDividend || 0,
              item.type,
              item.currency,
              item.customTaxRate,
            );
            const yoc = avgPrice > 0 ? (netAnnualDividendPerShare / avgPrice) * 100 : 0;
            const action = computeRecommendedAction(item);

            return (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => onSelectItem(item)}
              >
                <TableCell className={STICKY_FIRST_COLUMN_CLASS}>
                  <div className="font-semibold text-foreground">{item.ticker}</div>
                  <div className="text-xs text-muted-foreground">{item.name}</div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.broker || "—"}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(avgPrice, item.currency, locale)}</TableCell>
                <TableCell>{formatCurrency(livePrice, item.currency, locale)}</TableCell>
                <TableCell>{formatCurrency(total, item.currency, locale)}</TableCell>
                <TableCell className={pnl >= 0 ? "text-success" : "text-destructive"}>
                  {formatCurrency(pnl, item.currency, locale)} ({formatPercent(pnlPct, locale, 1)})
                </TableCell>
                <TableCell>{formatPercent(yoc, locale, 2)}</TableCell>
                <TableCell>
                  <Badge variant={ACTION_BADGE_VARIANT[action]}>{actionLabel[action]}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
