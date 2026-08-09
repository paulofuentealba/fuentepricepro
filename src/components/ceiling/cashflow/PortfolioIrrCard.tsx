import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Percent, TrendingUp, Info, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Currency } from "@/lib/domain";
import { useI18n } from "@/lib/i18n-provider";
import { useSelic } from "@/lib/useSelic";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { type Transaction } from "@/lib/transactions";
import { type RealizedIncomeEvent } from "@/lib/realizedIncome";
import { calculateIrr, buildCashFlowsFromPortfolio } from "@/lib/portfolioIrr";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  transactions: Transaction[];
  realizedEvents: RealizedIncomeEvent[];
  currentPortfolioValue: number;
  activeCurrency: Currency;
  assetCurrencies?: Record<string, Currency>;
}

export function PortfolioIrrCard({
  transactions,
  realizedEvents,
  currentPortfolioValue,
  activeCurrency,
  assetCurrencies = {},
}: Props) {
  const { t } = useI18n();
  const { data: selicRaw } = useSelic();
  const selicPct = selicRaw ?? 10.5;

  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const fxRateUsdToBrl = fx?.USDBRL ?? 1;

  const cashFlows = useMemo(
    () =>
      buildCashFlowsFromPortfolio(
        transactions,
        realizedEvents,
        currentPortfolioValue,
        Date.now(),
        fxRateUsdToBrl,
        assetCurrencies
      ),
    [transactions, realizedEvents, currentPortfolioValue, fxRateUsdToBrl, assetCurrencies]
  );

  const irrRate = useMemo(() => calculateIrr(cashFlows), [cashFlows]);

  const irrPct = irrRate !== null ? irrRate * 100 : null;
  const diffVsSelic = irrPct !== null ? irrPct - selicPct : null;

  return (
    <Card className="border border-success/30 bg-success/10 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.15)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-success/20 flex items-center justify-center border border-success/30 shrink-0">
              <Percent className="h-4 w-4 text-success" />
            </div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-semibold text-success uppercase tracking-wider">
                {t.tabs.chart.irrTitle}
              </h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-success/70 hover:text-success cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {t.tabs.chart.irrTooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {diffVsSelic !== null && (
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                diffVsSelic >= 0
                  ? "bg-success/20 text-success border-success/40"
                  : "bg-warning/20 text-warning border-warning/40"
              }`}
            >
              {diffVsSelic >= 0 ? "+" : ""}
              {diffVsSelic.toFixed(1)}% vs Selic
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="rounded-lg bg-background/60 border border-success/25 p-3">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              {t.tabs.chart.portfolioIrr}
            </span>
            <p className="text-xl font-extrabold text-success mt-1">
              {irrPct !== null ? `${irrPct.toFixed(1)}% a.a.` : t.tabs.chart.irrInsufficientData}
            </p>
          </div>

          <div className="rounded-lg bg-background/60 border border-success/25 p-3">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-success/80" />
              {t.tabs.chart.selicBenchmark}
            </span>
            <p className="text-xl font-extrabold text-foreground mt-1">
              {selicPct.toFixed(1)}% a.a.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
