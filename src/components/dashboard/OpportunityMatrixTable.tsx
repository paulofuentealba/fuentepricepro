import { useMemo, useState } from "react";
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
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { AssetType } from "@/lib/domain";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n-provider";
import { computeRecommendedAction, type RecommendedActionKey } from "@/lib/selectors/recommendedAction";
import { computeTaxRegimeKey } from "@/lib/selectors/taxRegimeLabel";
import { cn } from "@/lib/utils";

const CLASS_FILTERS: AssetType[] = [
  "STOCK_BR",
  "STOCK_US",
  "FII",
  "FIAGRO",
  "FII_INFRA",
  "REIT",
  "ETF",
  "FIXED_INCOME",
];

const ACTION_BADGE_VARIANT: Record<RecommendedActionKey, "success" | "warning" | "destructive" | "outline"> = {
  buy: "success",
  watch: "warning",
  avoid: "destructive",
  yieldTrap: "destructive",
  noData: "outline",
};

interface OpportunityMatrixTableProps {
  valuedItems: ValuedWatchlistItem[];
  isLoading: boolean;
}

export function OpportunityMatrixTable({ valuedItems, isLoading }: OpportunityMatrixTableProps) {
  const { locale, t } = useI18n();
  const [activeFilter, setActiveFilter] = useState<AssetType | "ALL">("ALL");

  const filteredItems = useMemo(() => {
    const items = activeFilter === "ALL" ? valuedItems : valuedItems.filter((i) => i.type === activeFilter);
    return [...items].sort((a, b) => (b.valuation?.margin ?? -Infinity) - (a.valuation?.margin ?? -Infinity));
  }, [valuedItems, activeFilter]);

  const actionLabel: Record<RecommendedActionKey, string> = {
    buy: t.dashboard.matrix.actionBuy,
    watch: t.dashboard.matrix.actionWatch,
    avoid: t.dashboard.matrix.actionAvoid,
    yieldTrap: t.dashboard.matrix.actionYieldTrap,
    noData: t.dashboard.matrix.actionNoData,
  };

  const taxRegimeLabel = {
    exemptDouble: t.dashboard.taxRegime.exemptDouble,
    exemptDividend: t.dashboard.taxRegime.exemptDividend,
    whtCompensable: t.dashboard.taxRegime.whtCompensable,
    jcpWithholding: t.dashboard.taxRegime.jcpWithholding,
    standard: t.dashboard.taxRegime.standard,
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="mb-4">
        <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
          {t.dashboard.matrix.eyebrow}
        </div>
        <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">{t.dashboard.matrix.title}</h2>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter("ALL")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs",
            activeFilter === "ALL"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {t.dashboard.matrix.filterAll}
        </button>
        {CLASS_FILTERS.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveFilter(type)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              activeFilter === type
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {t.types[type]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.dashboard.matrix.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.dashboard.matrix.columnAsset}</TableHead>
                <TableHead>{t.dashboard.matrix.columnClass}</TableHead>
                <TableHead>{t.dashboard.matrix.columnPrice}</TableHead>
                <TableHead>{t.dashboard.matrix.columnCeiling}</TableHead>
                <TableHead>{t.dashboard.matrix.columnMargin}</TableHead>
                <TableHead>{t.dashboard.matrix.columnNetDy}</TableHead>
                <TableHead>{t.dashboard.matrix.columnTaxRegime}</TableHead>
                <TableHead>{t.dashboard.matrix.columnAction}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const action = computeRecommendedAction(item);
                const regime = computeTaxRegimeKey(item.type, item.currency);
                const livePrice = item.livePrice ?? item.currentPrice ?? 0;
                const margin = item.valuation?.margin ?? item.safetyMargin ?? null;

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{item.ticker}</div>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                    </TableCell>
                    <TableCell>{t.types[item.type]}</TableCell>
                    <TableCell>{formatCurrency(livePrice, item.currency, locale)}</TableCell>
                    <TableCell>
                      {formatCurrency(item.valuation?.activeCeiling ?? item.ceilingPrice ?? 0, item.currency, locale)}
                    </TableCell>
                    <TableCell className={margin != null && margin >= 0 ? "text-success" : "text-destructive"}>
                      {margin != null ? formatPercent(margin, locale, 1) : "—"}
                    </TableCell>
                    <TableCell>{formatPercent(item.valuation?.dividendYield ?? 0, locale, 2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{taxRegimeLabel[regime]}</TableCell>
                    <TableCell>
                      <Badge variant={ACTION_BADGE_VARIANT[action]}>{actionLabel[action]}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
