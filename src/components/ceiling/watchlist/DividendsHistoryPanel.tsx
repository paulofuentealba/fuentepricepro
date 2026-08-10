import { useState, useMemo } from "react";
import { useTransactions } from "@/lib/transactions";
import type { WatchlistItem } from "@/lib/watchlist";
import type { DividendEvent, Currency } from "@/lib/domain";
import { calculateRealizedIncome } from "@/lib/realizedIncome";
import { AssetMonthlyDividendChart } from "./AssetMonthlyDividendChart";
import { formatCurrency } from "@/lib/i18n";
import { formatResultDate } from "@/lib/resultCard";
import { useI18n } from "@/lib/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  item: WatchlistItem;
  events: DividendEvent[];
  currency: string;
}

export function DividendsHistoryPanel({ item, events, currency }: Props) {
  const { t, locale } = useI18n();
  const { transactions } = useTransactions();
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const dividendEventsMap = useMemo(() => ({ [item.ticker]: events }), [item.ticker, events]);
  const assetMetaMap = useMemo(
    () => ({
      [item.ticker]: {
        ticker: item.ticker,
        type: item.type,
        currency: item.currency as Currency,
        customTaxRate: item.customTaxRate,
      },
    }),
    [item.ticker, item.type, item.currency, item.customTaxRate]
  );

  const realizedEvents = useMemo(() => {
    return calculateRealizedIncome(transactions, dividendEventsMap, assetMetaMap);
  }, [transactions, dividendEventsMap, assetMetaMap]);

  const pastRealizedEvents = useMemo(() => {
    const todayISO = new Date().toISOString().split("T")[0];
    return realizedEvents.filter((ev) => {
      const dateStr = ev.paymentDate || ev.exDate;
      return dateStr && dateStr <= todayISO;
    });
  }, [realizedEvents]);

  const summary = useMemo(() => {
    const todayISO = new Date().toISOString().split("T")[0];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoISO = oneYearAgo.toISOString().split("T")[0];

    const lastReceivedEvent =
      pastRealizedEvents.length > 0 ? pastRealizedEvents[pastRealizedEvents.length - 1] : null;

    let total12m = 0;
    for (const ev of pastRealizedEvents) {
      const dateStr = ev.paymentDate || ev.exDate;
      if (dateStr >= oneYearAgoISO && dateStr <= todayISO) {
        total12m += ev.amountNet;
      }
    }

    return {
      lastReceived: lastReceivedEvent
        ? {
            amount: lastReceivedEvent.amountNet,
            dateStr: lastReceivedEvent.paymentDate || lastReceivedEvent.exDate,
          }
        : null,
      total12m: Math.round(total12m * 100) / 100,
    };
  }, [pastRealizedEvents]);

  const marketEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      return new Date(b.exDate).getTime() - new Date(a.exDate).getTime();
    });
  }, [events]);

  const totalPages = Math.ceil(marketEvents.length / pageSize);
  const visibleEvents = marketEvents.slice(page * pageSize, (page + 1) * pageSize);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-border/50 bg-background/50 mt-4">
        <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">{t.watchlist.noDividendHistory}</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {t.watchlist.noDividendHistoryDesc}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <Card className="bg-background/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            {t.watchlist.myIncomeSummary}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t.watchlist.lastReceived}</p>
              {summary.lastReceived ? (
                <>
                  <p className="text-xl font-semibold text-foreground">
                    {formatCurrency(summary.lastReceived.amount, currency as import("@/lib/domain").Currency, locale)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatResultDate(summary.lastReceived.dateStr, locale)}
                  </p>
                </>
              ) : (
                <p className="text-xl font-semibold text-muted-foreground">-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.watchlist.past12Months}</p>
              <p className="text-xl font-semibold text-success">
                {formatCurrency(summary.total12m, currency as import("@/lib/domain").Currency, locale)}
              </p>
            </div>
          </div>

          <AssetMonthlyDividendChart events={pastRealizedEvents} currency={currency} />
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border/50 bg-background/60 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.watchlist.exDate}</TableHead>
              <TableHead>{t.watchlist.paymentDate}</TableHead>
              <TableHead>{t.watchlist.type}</TableHead>
              <TableHead className="text-right">{t.watchlist.amountPerShare}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleEvents.map((ev, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">
                  {formatResultDate(ev.exDate, locale)}
                </TableCell>
                <TableCell className="text-sm">
                  {ev.paymentDate ? formatResultDate(ev.paymentDate, locale) : "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {ev.isJCP ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-warning/10 text-warning border border-warning/20">
                      {t.watchlist.jcp}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-success/10 text-success border border-success/20">
                      {t.watchlist.dividend}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm font-medium text-right text-success">
                  {formatCurrency(ev.amountPerShare, currency as any, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t.common.prev}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t.watchlist.page.replace("{current}", String(page + 1)).replace("{total}", String(totalPages))}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              {t.common.next}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
