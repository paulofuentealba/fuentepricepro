import { useMemo, useState } from "react";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { getAssetPnL } from "@/lib/selectors/assetPnL";
import { getColorForAsset } from "@/components/ceiling/shared/chartColors";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type SortKey = "asset" | "class" | "position" | "avgPrice" | "change" | "pnl" | "dy";
type SortDirection = "asc" | "desc";

/**
 * Tabela de carteira da v2 "Horizonte FI" (prompt 52). Mesma fonte de dado
 * da v1 (`useValuedPortfolio().valuedItems`, sem novo hook de fetch) e o
 * mesmo `getAssetPnL()` do prompt 48 para a coluna de P&L. Ordenação por
 * coluna e busca por ticker/nome são client-side sobre o array já
 * carregado — não existe hook reaproveitável de sort por coluna clicável
 * na v1 (`useAssetFilterSort` é um dropdown de tipo/ordenação, não sort de
 * coluna), então o estado é local a este componente.
 *
 * Regra de design "quiet cards": sem `backdrop-blur`/glow aqui — esse
 * tratamento é exclusivo do hero (prompt 50).
 */
export function PortfolioTableV2({ limit }: { limit?: number } = {}) {
  const { locale, t } = useI18n();
  const { valuedItems, quotes, isAppLoading } = useValuedPortfolio();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("asset");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const activeItems = useMemo(
    () => valuedItems.filter((it) => !it.isClosedPosition),
    [valuedItems],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeItems;
    return activeItems.filter(
      (it) =>
        it.ticker.toLowerCase().includes(term) || it.name.toLowerCase().includes(term),
    );
  }, [activeItems, search]);

  const sorted = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    const dyOf = (it: ValuedWatchlistItem) =>
      it.currentPrice > 0 ? it.annualDividend / it.currentPrice : 0;

    const result = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "class":
          return dir * a.type.localeCompare(b.type);
        case "position":
          return dir * (a.quantity - b.quantity);
        case "avgPrice":
          return dir * ((a.averagePrice ?? 0) - (b.averagePrice ?? 0));
        case "change": {
          const chA = quotes[a.ticker]?.changePct ?? 0;
          const chB = quotes[b.ticker]?.changePct ?? 0;
          return dir * (chA - chB);
        }
        case "pnl":
          return dir * (getAssetPnL(a).pnlAbsolute - getAssetPnL(b).pnlAbsolute);
        case "dy":
          return dir * (dyOf(a) - dyOf(b));
        case "asset":
        default:
          return dir * a.ticker.localeCompare(b.ticker);
      }
    });
    return typeof limit === "number" ? result.slice(0, limit) : result;
  }, [filtered, sortKey, sortDirection, quotes, limit]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

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
          Horizonte FI
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

      <div className="w-full overflow-x-auto rounded-xl bg-card border border-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortableHeader label={t.home.columnAsset} sortKey="asset" active={sortKey} direction={sortDirection} onSort={toggleSort} align="left" />
              <SortableHeader label={t.home.columnClass} sortKey="class" active={sortKey} direction={sortDirection} onSort={toggleSort} align="left" />
              <SortableHeader label={t.home.columnPosition} sortKey="position" active={sortKey} direction={sortDirection} onSort={toggleSort} align="right" />
              <SortableHeader label={t.home.columnAvgPrice} sortKey="avgPrice" active={sortKey} direction={sortDirection} onSort={toggleSort} align="right" />
              <SortableHeader label={t.home.columnChange} sortKey="change" active={sortKey} direction={sortDirection} onSort={toggleSort} align="right" />
              <SortableHeader label={t.home.columnPnl} sortKey="pnl" active={sortKey} direction={sortDirection} onSort={toggleSort} align="right" />
              <SortableHeader label={t.home.columnDy} sortKey="dy" active={sortKey} direction={sortDirection} onSort={toggleSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <PortfolioRow key={item.id ?? item.ticker} item={item} changePct={quotes[item.ticker]?.changePct ?? null} locale={locale} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  active,
  direction,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  align: "left" | "right";
}) {
  const isActive = active === sortKey;
  const ariaSort: "ascending" | "descending" | "none" = isActive
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  function handleKeyDown(e: React.KeyboardEvent<HTMLTableCellElement>) {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      onSort(sortKey);
    }
  }

  return (
    <th
      scope="col"
      role="button"
      tabIndex={0}
      aria-sort={ariaSort}
      className="px-4 py-3 font-medium uppercase tracking-wide text-xs cursor-pointer select-none whitespace-nowrap text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      style={{ textAlign: align }}
      onClick={() => onSort(sortKey)}
      onKeyDown={handleKeyDown}
    >
      {label}
      {isActive ? (direction === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}

function PortfolioRow({
  item,
  changePct,
  locale,
}: {
  item: ValuedWatchlistItem;
  changePct: number | null;
  locale: Parameters<typeof formatCurrency>[2];
}) {
  const { pnlAbsolute, pnlPercent } = getAssetPnL(item);
  const dy = item.currentPrice > 0 ? (item.annualDividend / item.currentPrice) * 100 : 0;
  const pnlPositive = pnlAbsolute >= 0;

  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{item.ticker}</span>
          <span className="text-xs text-muted-foreground">{item.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `color-mix(in srgb, ${getColorForAsset(item.type)} 16%, transparent)`,
            color: getColorForAsset(item.type),
          }}
        >
          {item.type}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {item.averagePrice != null ? formatCurrency(item.averagePrice, item.currency, locale) : "—"}
      </td>
      <td
        className={`px-4 py-3 text-right tabular-nums ${
          changePct == null ? "text-muted-foreground" : changePct >= 0 ? "text-success" : "text-danger"
        }`}
      >
        {changePct == null ? "—" : `${changePct >= 0 ? "+" : ""}${formatPercent(changePct, locale, 2)}`}
      </td>
      <td className={`px-4 py-3 text-right tabular-nums ${pnlPositive ? "text-success" : "text-danger"}`}>
        <div className="flex flex-col items-end">
          <span>{formatCurrency(pnlAbsolute, item.currency, locale)}</span>
          <span className="text-xs">
            {pnlPositive ? "+" : ""}
            {formatPercent(pnlPercent * 100, locale, 2)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{formatPercent(dy, locale, 2)}</td>
    </tr>
  );
}
