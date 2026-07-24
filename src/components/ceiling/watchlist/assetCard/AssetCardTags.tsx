import { CalendarClock, TrendingDown, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPercent } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";
import { formatExDate, type AssetMeta } from "../utils";

interface Props {
  meta?: AssetMeta;
}

export function AssetCardTags({ meta }: Props) {
  const { t, locale } = useI18n();
  const exDateFormatted = meta?.exDividendDate
    ? formatExDate(meta.exDividendDate, locale as any)
    : null;
  const cagr = meta?.dividendCagr5y ?? null;
  const cagrNegative = cagr != null && cagr < 0;

  if (!exDateFormatted && cagr == null) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {exDateFormatted && (
        <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/60">
          <CalendarClock className="h-3 w-3" />
          <span className="uppercase tracking-wider">{t.watchlist.exDivShort}</span>
          <span className="tabular-nums text-foreground/90">{exDateFormatted}</span>
        </span>
      )}
      {cagr != null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                cagrNegative
                  ? "bg-rose-500/10 text-rose-300/90 ring-rose-500/20"
                  : "bg-background/60 text-muted-foreground ring-border/60",
              )}
            >
              {cagrNegative ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              <span className="uppercase tracking-wider">{t.watchlist.cagr5y}</span>
              <span className="tabular-nums">{formatPercent(cagr, locale as any, 2)}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px]">
            <p>{t.watchlist.cagrTip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
