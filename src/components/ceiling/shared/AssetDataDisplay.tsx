import { formatCurrency, formatPercent, displayTicker } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-provider";
import type { AssetType, Currency } from "@/lib/domain";

export function AssetTicker({
  ticker,
  name,
  type,
  sector,
}: {
  ticker: string;
  name?: string;
  type?: AssetType;
  sector?: string;
}) {
  const { t } = useI18n();
  const cleanTicker = ticker;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">{displayTicker(ticker)}</span>
        {type && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {t.types[type]}
          </Badge>
        )}
      </div>
      {(name || sector) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {name && (
            <span className="line-clamp-1 max-w-[120px]" title={name}>
              {name}
            </span>
          )}
          {name && sector && <span>•</span>}
          {sector && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {sector}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export function PriceTag({
  value,
  currency,
  className,
}: {
  value: number | null | undefined;
  currency: string;
  className?: string;
}) {
  const { locale } = useI18n();
  if (value === null || value === undefined || isNaN(value))
    return <span className={cn("text-muted-foreground", className)}>—</span>;

  return (
    <span className={cn("font-medium", className)}>
      {formatCurrency(value, currency as Currency, locale)}
    </span>
  );
}

export function SafetyMarginBadge({
  margin,
  className,
}: {
  margin: number | null | undefined;
  className?: string;
}) {
  const { t } = useI18n();

  if (margin === null || margin === undefined || isNaN(margin)) {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  }

  const isPositive = margin >= 0;

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className={cn("text-xs font-semibold", isPositive ? "text-success" : "text-destructive")}
      >
        {isPositive ? "+" : ""}
        {margin.toFixed(1)}%
      </div>
    </div>
  );
}

export function YieldIndicator({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  const { locale } = useI18n();

  if (value === null || value === undefined || isNaN(value)) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  return (
    <span className={cn("font-bold text-primary", className)}>
      {formatPercent(value, locale, 1)}
    </span>
  );
}
