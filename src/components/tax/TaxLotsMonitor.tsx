import React, { useMemo } from "react";
import { Clock, ShieldCheck, Calendar, Info, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import type { Transaction } from "@/lib/transactionsLogic";
import type { Currency } from "@/lib/domain";
import { computeAssetTaxLots, type AssetTaxLot } from "@/lib/tax/us/taxLots";
import { cn } from "@/lib/utils";

export interface TaxLotsMonitorProps {
  ticker: string;
  currentPrice: number;
  transactions: Transaction[];
  currency?: Currency;
  className?: string;
  asOf?: number;
}

export function TaxLotsMonitor({
  ticker,
  currentPrice,
  transactions,
  currency = "USD",
  className,
  asOf,
}: TaxLotsMonitorProps) {
  const { t, locale } = useI18n();
  const txDict = t.taxLots;

  const summary = useMemo(() => {
    return computeAssetTaxLots(transactions, ticker, currentPrice, asOf);
  }, [transactions, ticker, currentPrice, asOf]);

  if (summary.lots.length === 0) {
    return null;
  }

  const formatMoney = (amount: number) =>
    formatCurrency(amount, currency, locale === "en" ? "en" : locale === "es" ? "es" : "ptBR");

  return (
    <Card className={cn("border-border/60 bg-card/60 backdrop-blur-sm", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                {txDict.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {txDict.subtitle}
              </CardDescription>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
            {summary.totalQuantity.toLocaleString(locale === "en" ? "en-US" : "pt-BR")}{" "}
            {txDict.shares}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Short-Term vs Long-Term Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              {txDict.holdingProgress}
            </span>
            <span className="font-mono text-xs font-semibold">
              <span className="text-success">{summary.longTermPct}% {txDict.longTerm}</span>
              {" · "}
              <span className="text-warning">{summary.shortTermPct}% {txDict.shortTerm}</span>
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50 flex">
            {summary.longTermPct > 0 && (
              <div
                className="h-full bg-success transition-all duration-500"
                style={{ width: `${summary.longTermPct}%` }}
                title={`${summary.longTermPct}% ${txDict.longTerm}`}
              />
            )}
            {summary.shortTermPct > 0 && (
              <div
                className="h-full bg-warning transition-all duration-500"
                style={{ width: `${summary.shortTermPct}%` }}
                title={`${summary.shortTermPct}% ${txDict.shortTerm}`}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            <div className="rounded-md border border-success/30 bg-success/10 p-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-success flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {txDict.longTerm}
                </span>
                <span className="font-mono font-bold text-foreground">
                  {summary.longTermQuantity} {txDict.shares}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {txDict.longTermRateHint}
              </p>
            </div>

            <div className="rounded-md border border-warning/30 bg-warning/10 p-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-warning flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {txDict.shortTerm}
                </span>
                <span className="font-mono font-bold text-foreground">
                  {summary.shortTermQuantity} {txDict.shares}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {txDict.shortTermRateHint}
              </p>
            </div>
          </div>
        </div>

        {/* Individual Open Lots List */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {txDict.title} ({summary.lots.length})
          </div>

          <div className="divide-y divide-border/40 rounded-lg border border-border/60 overflow-hidden">
            {summary.lots.map((lot: AssetTaxLot) => {
              const dateFormatted = new Date(lot.acquisitionDate).toISOString().split("T")[0];
              const pnlPositive = lot.unrealizedGainLoss >= 0;

              return (
                <div
                  key={lot.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 transition-colors hover:bg-muted/30 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">
                        {lot.quantity} {txDict.shares}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {dateFormatted}
                      </span>
                      {lot.accountType === "roth_ira" && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Roth IRA
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      {txDict.costBasis}: <span className="font-mono">{formatMoney(lot.costBasisPerShare)}</span>/sh
                      {" · "}
                      {txDict.currentValue}: <span className="font-mono">{formatMoney(lot.currentValue)}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1">
                    {lot.isLongTerm ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10.5px] font-semibold text-success">
                        <ShieldCheck className="h-3 w-3" />
                        {txDict.longTermBadge}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10.5px] font-semibold text-warning">
                        <Clock className="h-3 w-3" />
                        {txDict.daysUntilLongTerm.replace("{{count}}", String(lot.daysUntilLongTerm))}
                      </span>
                    )}

                    <div className={cn(
                      "font-mono font-semibold text-xs",
                      pnlPositive ? "text-success" : "text-destructive",
                    )}>
                      {pnlPositive ? "+" : ""}
                      {formatMoney(lot.unrealizedGainLoss)} ({pnlPositive ? "+" : ""}
                      {formatPercent(lot.unrealizedGainLossPct, locale, 1)})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
