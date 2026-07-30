import { Shield, TrendingUp, Calendar, ArrowUpRight } from "lucide-react";
import type { WatchlistItem } from "@/lib/watchlist";
import { useI18n } from "@/lib/i18n-provider";
import { useQuery } from "@tanstack/react-query";
import { macroRatesQueryOptions } from "@/lib/queryOptions";
import { calculateFixedIncomeBalance } from "@/lib/calculations";
import { formatCurrency } from "@/lib/i18n";

interface Props {
  item: WatchlistItem;
}

export function FixedIncomePanel({ item }: Props) {
  const { t } = useI18n();
  const { locale } = useI18n();
  const { data: macroRates } = useQuery(macroRatesQueryOptions());

  const accrual = calculateFixedIncomeBalance(item, macroRates);

  // Format the rate elegantly (e.g. 110% of CDI, or IPCA + 6.5%)
  let rateDisplay = "N/A";
  if (item.rate != null && item.indexer) {
    if (item.indexer.toUpperCase() === "CDI") {
      rateDisplay = `${item.rate}% do CDI`;
    } else {
      rateDisplay = `${item.indexer} + ${item.rate}%`;
    }
  } else if (item.rate != null) {
    rateDisplay = `${item.rate}%`;
  } else if (item.indexer) {
    rateDisplay = item.indexer;
  }

  // Format maturity date
  let maturityDisplay = "N/A";
  if (item.maturityDate) {
    try {
      const date = new Date(item.maturityDate);
      maturityDisplay = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      maturityDisplay = item.maturityDate;
    }
  }

  return (
    <div className="relative mt-6 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-md p-6 shadow-2xl">
      {/* Decorative Glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-[80px]" />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between border-b border-slate-700/50 pb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-slate-200">
              {t.watchlist.fixedIncomePanel.title}
            </h3>
          </div>
          {accrual && accrual.profit > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/20">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">
                +{formatCurrency(accrual.profit, item.currency, locale)}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">
              {t.watchlist.fixedIncomePanel.indexer}
            </span>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400/70" />
              <span className="text-sm font-semibold text-slate-200">{item.indexer || "PRE"}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">
              {t.watchlist.fixedIncomePanel.rateYield}
            </span>
            <span className="text-sm font-semibold text-emerald-400">{rateDisplay}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">
              {t.watchlist.fixedIncomePanel.maturityDate}
            </span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400/70" />
              <span className="text-sm font-semibold text-slate-200">{maturityDisplay}</span>
            </div>
          </div>

          {accrual && (
            <div className="flex flex-col gap-1 sm:col-span-3 mt-2 border-t border-slate-700/50 pt-4">
              <span className="text-xs font-medium text-slate-400">
                {t.watchlist.fixedIncomePanel.accruedBalance}
              </span>
              <span className="text-2xl font-bold text-slate-100">
                {formatCurrency(accrual.accruedBalance, item.currency, locale)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
