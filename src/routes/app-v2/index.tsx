import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { HorizonteHero } from "@/components/horizonte/HorizonteHero";
import { Skeleton } from "@/components/ui/skeleton";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useTransactions } from "@/lib/transactions";
import { getEffectiveTransactions } from "@/lib/portfolioIrr";
import {
  calculateRealizedIncome,
  computeRealizedIncomeSummary,
  type AssetTaxMeta,
} from "@/lib/realizedIncome";
import type { DividendEventsMap } from "@/lib/cashflow";
import { assetQueryOptions } from "@/lib/queryOptions";
import { getLargestPosition } from "@/lib/selectors/largestPosition";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";

/**
 * Dashboard real da v2 "Horizonte FI" (prompt 51): `HorizonteHero` (prompt 50)
 * + grid de 3 cards de resumo (patrimônio total, proventos do ano, maior
 * posição), todos com dado real vindo de `useValuedPortfolio()` e
 * `computeRealizedIncomeSummary()`.
 *
 * Tabela de carteira, cash flow, radar, comparador e screener continuam
 * fora de escopo aqui — ver prompt 52 e prompt 49.
 */
export const Route = createFileRoute("/app-v2/")({
  component: HorizonteDashboardV2,
});

function SummaryCard({
  label,
  value,
  delta,
  isLoading,
}: {
  label: string;
  value: string;
  delta?: { label: string; positive: boolean } | null;
  isLoading: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-5"
      style={{
        backgroundColor: "var(--h-paper-raised)",
        border: "1px solid var(--h-line)",
        borderRadius: "var(--h-radius-xl)",
        boxShadow: "var(--h-shadow-sm)",
      }}
    >
      <span
        className="text-xs font-medium uppercase tracking-widest"
        style={{ color: "var(--h-ink-soft)" }}
      >
        {label}
      </span>
      {isLoading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <span
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--h-font-display)", color: "var(--h-ink)" }}
        >
          {value}
        </span>
      )}
      {!isLoading && delta && (
        <span
          className="text-xs font-medium"
          style={{ color: delta.positive ? "var(--h-success)" : "var(--h-danger)" }}
        >
          {delta.label}
        </span>
      )}
    </div>
  );
}

function HorizonteDashboardV2() {
  const { locale } = useI18n();
  const { valuedItems, totals, isAppLoading, items, quotes } = useValuedPortfolio();
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

  const realizedSummary = useMemo(
    () => computeRealizedIncomeSummary(realizedEvents),
    [realizedEvents],
  );

  const largestPosition = useMemo(() => getLargestPosition(valuedItems), [valuedItems]);

  const netWorthLabel = formatCurrency(totals.consolidatedNetWorth, "BRL", locale);
  const incomeLabel = formatCurrency(realizedSummary.currentYear, "BRL", locale);
  const largestPositionLabel = largestPosition
    ? `${largestPosition.item.ticker} · ${formatCurrency(
        largestPosition.marketValue,
        largestPosition.item.currency,
        locale,
      )}`
    : "—";

  // Delta do dia da maior posição, quando disponível — sem cálculo inventado.
  // `changePct` vem de `quotes` (LiveQuote), não de `valuedItems` (checado
  // no hook antes de assumir o campo).
  const largestPositionChangePct = largestPosition
    ? quotes[largestPosition.item.ticker]?.changePct ?? null
    : null;
  const largestPositionDelta =
    typeof largestPositionChangePct === "number"
      ? {
          label: `${largestPositionChangePct >= 0 ? "+" : ""}${formatPercent(
            largestPositionChangePct,
            locale,
            1,
          )} hoje`,
          positive: largestPositionChangePct >= 0,
        }
      : null;

  return (
    <div className="flex flex-col gap-8">
      <HorizonteHero />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Patrimônio total"
          value={netWorthLabel}
          isLoading={isAppLoading}
        />
        <SummaryCard
          label="Proventos recebidos (ano)"
          value={incomeLabel}
          isLoading={isAppLoading}
        />
        <SummaryCard
          label="Maior posição"
          value={largestPositionLabel}
          delta={largestPositionDelta}
          isLoading={isAppLoading}
        />
      </div>
    </div>
  );
}
