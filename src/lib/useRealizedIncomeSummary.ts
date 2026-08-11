import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useTransactions } from "@/lib/transactions";
import { getEffectiveTransactions } from "@/lib/portfolioIrr";
import {
  calculateRealizedIncome,
  computeRealizedIncomeSummary,
  type AssetTaxMeta,
  type RealizedIncomeEvent,
  type RealizedIncomeSummary,
} from "@/lib/realizedIncome";
import type { DividendEventsMap } from "@/lib/cashflow";
import { assetQueryOptions } from "@/lib/queryOptions";
import type { Currency } from "@/lib/domain";

/**
 * SSOT hook for "realized income" (proventos recebidos): dividend events map
 * -> effective transactions -> realized events -> summary.
 *
 * Extracted from the near-identical inline logic that used to live in both
 * `CashFlowCalendar.tsx` (proventos por carteira, com `items`/`transactions`
 * vindos de props) and the Horizonte dashboard (`app-v2/index.tsx`, dado
 * buscado internamente via `useValuedPortfolio`/`useTransactions`). Esta
 * versão busca os próprios dados internamente (mesmo padrão que o dashboard
 * já usava), então não recebe `items`/`transactions` como parâmetro.
 */
export function useRealizedIncomeSummary(currency: Currency = "BRL"): {
  summary: RealizedIncomeSummary;
  events: RealizedIncomeEvent[];
  isLoading: boolean;
} {
  const { items, isAppLoading } = useValuedPortfolio();
  const { transactions = [] } = useTransactions();

  const effectiveTransactions = useMemo(
    () => getEffectiveTransactions(transactions, items),
    [transactions, items],
  );

  const assetQueries = useQueries({
    queries: items.map((it) => assetQueryOptions(it.ticker)),
  });

  const dividendEventsMap = useMemo<DividendEventsMap>(() => {
    const map: DividendEventsMap = {};
    assetQueries.forEach((q, i) => {
      const ticker = items[i]?.ticker;
      if (ticker && q.data?.dividendEvents) {
        map[ticker] = q.data.dividendEvents;
      }
    });
    return map;
  }, [assetQueries, items]);

  const realizedEvents = useMemo(() => {
    if (effectiveTransactions.length === 0) return [];
    const assetMetaMap: Record<string, AssetTaxMeta> = {};
    for (const item of items) {
      assetMetaMap[item.ticker] = {
        ticker: item.ticker,
        type: item.type,
        currency: item.currency,
        customTaxRate: item.customTaxRate,
      };
    }
    return calculateRealizedIncome(effectiveTransactions, dividendEventsMap, assetMetaMap);
  }, [effectiveTransactions, dividendEventsMap, items]);

  const summary = useMemo(
    () => computeRealizedIncomeSummary(realizedEvents, currency),
    [realizedEvents, currency],
  );

  return { summary, events: realizedEvents, isLoading: isAppLoading };
}
