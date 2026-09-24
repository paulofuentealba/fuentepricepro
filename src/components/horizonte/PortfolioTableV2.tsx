import { useMemo, useState } from "react";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { getAssetPnL } from "@/lib/selectors/assetPnL";
import { getColorForAsset } from "@/components/shared/chartColors";
import { formatCurrency, formatPercent, getDisplayAssetType } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

/**
 * Tabela de carteira da v2 "Horizonte FI".
 * Consolidada sobre o componente mestre DataTable (Regra 1 do AGENTS.md — Reusabilidade Primeiro).
 * Suporta o ciclo tri-state de ordenação (asc -> desc -> default) e busca por ticker/nome.
 */
export function PortfolioTableV2({ limit }: { limit?: number } = {}) {
  const { locale, t } = useI18n();
  const { valuedItems, quotes, isAppLoading } = useValuedPortfolio();
  const [search, setSearch] = useState("");

  const activeItems = useMemo(
    () => valuedItems.filter((it) => !it.isClosedPosition),
    [valuedItems],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = !term
      ? activeItems
      : activeItems.filter(
          (it) =>
            it.ticker.toLowerCase().includes(term) || it.name.toLowerCase().includes(term),
        );
    return typeof limit === "number" ? list.slice(0, limit) : list;
  }, [activeItems, search, limit]);

  const columns: DataTableColumn<ValuedWatchlistItem>[] = useMemo(
    () => [
      {
        id: "asset",
        header: t.home.columnAsset,
        sticky: true,
        accessor: (item) => item.ticker,
        cell: (item) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{item.ticker}</span>
            <span className="text-xs text-muted-foreground">{item.name}</span>
          </div>
        ),
      },
      {
        id: "class",
        header: t.home.columnClass,
        accessor: (item) => item.type,
        cell: (item) => (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `color-mix(in srgb, ${getColorForAsset(getDisplayAssetType(item.type))} 16%, transparent)`,
              color: getColorForAsset(getDisplayAssetType(item.type)),
            }}
          >
            {t.types[getDisplayAssetType(item.type) as keyof typeof t.types] ?? item.type}
          </span>
        ),
      },
      {
        id: "position",
        header: t.home.columnPosition,
        align: "right",
        accessor: (item) => item.quantity,
        cell: (item) => <span>{item.quantity}</span>,
      },
      {
        id: "avgPrice",
        header: t.home.columnAvgPrice,
        align: "right",
        accessor: (item) => item.averagePrice ?? 0,
        cell: (item) => (
          <span>
            {item.averagePrice != null
              ? formatCurrency(item.averagePrice, item.currency, locale)
              : "—"}
          </span>
        ),
      },
      {
        id: "change",
        header: t.home.columnChange,
        align: "right",
        accessor: (item) => quotes[item.ticker]?.changePct ?? 0,
        cell: (item) => {
          const changePct = quotes[item.ticker]?.changePct ?? null;
          return (
            <span
              className={
                changePct == null
                  ? "text-muted-foreground"
                  : changePct >= 0
                    ? "text-success"
                    : "text-danger"
              }
            >
              {changePct == null
                ? "—"
                : `${changePct >= 0 ? "+" : ""}${formatPercent(changePct, locale, 2)}`}
            </span>
          );
        },
      },
      {
        id: "pnl",
        header: t.home.columnPnl,
        align: "right",
        accessor: (item) => getAssetPnL(item).pnlAbsolute,
        cell: (item) => {
          const { pnlAbsolute, pnlPercent } = getAssetPnL(item);
          const pnlPositive = pnlAbsolute >= 0;
          return (
            <div
              className={`flex flex-col items-end ${
                pnlPositive ? "text-success" : "text-danger"
              }`}
            >
              <span>{formatCurrency(pnlAbsolute, item.currency, locale)}</span>
              <span className="text-xs">
                {pnlPositive ? "+" : ""}
                {formatPercent(pnlPercent * 100, locale, 2)}
              </span>
            </div>
          );
        },
      },
      {
        id: "dy",
        header: t.home.columnDy,
        align: "right",
        accessor: (item) => item.valuation?.dividendYield ?? 0,
        cell: (item) => (
          <span>{formatPercent(item.valuation?.dividendYield ?? 0, locale, 2)}</span>
        ),
      },
    ],
    [quotes, locale, t],
  );

  if (isAppLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-sm rounded-lg bg-muted/30" />
        <Skeleton className="h-64 w-full rounded-xl bg-muted/30" />
      </div>
    );
  }

  if (activeItems.length === 0) {
    return (
      <div className="w-full flex flex-col gap-2 rounded-xl bg-card border border-border p-6">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t.tabs.financialIndependence}
        </span>
        <span className="text-2xl font-semibold font-serif text-foreground">
          {t.home.emptyTitle}
        </span>
        <span className="text-sm text-muted-foreground">
          {t.home.emptySubtitle}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {typeof limit !== "number" && (
        <Input
          type="search"
          placeholder={t.home.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-card border-border text-foreground"
        />
      )}

      <DataTable<ValuedWatchlistItem>
        data={filtered}
        columns={columns}
        defaultSortKey="position"
        defaultSortDirection="desc"
        tableClassName="min-w-[720px]"
        keyExtractor={(item) => item.id ?? item.ticker}
      />
    </div>
  );
}
