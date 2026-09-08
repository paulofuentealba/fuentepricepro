import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Scale, Receipt } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/i18n";
import type { Transaction } from "@/lib/transactions";
import type { Currency } from "@/lib/domain";
import { convertCurrency } from "@/lib/currency";
import { isBrTicker } from "@/lib/classify";

interface MyTransactionsKpisProps {
  transactions: Transaction[];
  currency?: Currency;
  currencyByTicker?: Record<string, Currency>;
  fxRate?: number;
}

export function MyTransactionsKpis({
  transactions,
  currency = "BRL",
  currencyByTicker = {},
  fxRate = 5.5,
}: MyTransactionsKpisProps) {
  const { t, locale } = useI18n();

  const { totalBuys, buysCount, totalSells, sellsCount, netFlow, totalFees } =
    useMemo(() => {
      let buys = 0;
      let bCount = 0;
      let sells = 0;
      let sCount = 0;
      let fees = 0;

      for (const tx of transactions) {
        const txCurrency: Currency =
          currencyByTicker[tx.ticker] ?? (isBrTicker(tx.ticker) ? "BRL" : "USD");
        const txFees = tx.fees || 0;
        const convertedFees = convertCurrency(txFees, txCurrency, currency, fxRate);
        fees += convertedFees;

        if (tx.type === "buy") {
          const rawBuy = tx.quantity * tx.pricePerShare + txFees;
          buys += convertCurrency(rawBuy, txCurrency, currency, fxRate);
          bCount++;
        } else if (tx.type === "sell") {
          const rawSell = Math.max(0, tx.quantity * tx.pricePerShare - txFees);
          sells += convertCurrency(rawSell, txCurrency, currency, fxRate);
          sCount++;
        }
      }

      return {
        totalBuys: buys,
        buysCount: bCount,
        totalSells: sells,
        sellsCount: sCount,
        netFlow: buys - sells,
        totalFees: fees,
      };
    }, [transactions, currency, currencyByTicker, fxRate]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Aportado */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {t.transactionsLedger.kpis.totalBuys}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success">
            <ArrowDownLeft className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-2 font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {formatCurrency(totalBuys, currency, locale)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.transactionsLedger.kpis.buysCount.replace("{{count}}", String(buysCount))}
        </p>
      </div>

      {/* 2. Total Desinvestido */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {t.transactionsLedger.kpis.totalSells}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-2 font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {formatCurrency(totalSells, currency, locale)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.transactionsLedger.kpis.sellsCount.replace("{{count}}", String(sellsCount))}
        </p>
      </div>

      {/* 3. Fluxo Líquido */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {t.transactionsLedger.kpis.netFlow}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent-text">
            <Scale className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-2 font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {formatCurrency(netFlow, currency, locale)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.transactionsLedger.kpis.netFlowSub}
        </p>
      </div>

      {/* 4. Custos & Emolumentos */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {t.transactionsLedger.kpis.totalFees}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <Receipt className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-2 font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {formatCurrency(totalFees, currency, locale)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.transactionsLedger.kpis.feesSub}
        </p>
      </div>
    </div>
  );
}
