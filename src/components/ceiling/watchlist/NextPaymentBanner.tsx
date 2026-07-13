import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { netAfterTax } from "@/lib/calc";
import type { WatchlistItem } from "@/lib/watchlist";
import type { AssetType } from "@/lib/domain";
import type { AssetMeta } from "./utils";

interface Props {
  items: WatchlistItem[];
  meta: Record<string, AssetMeta>;
}

interface Upcoming {
  item: WatchlistItem;
  date: Date;
  estimated: number;
}

/** Fallback payments-per-year when the API returned no historical payment months. */
function fallbackFrequency(type: AssetType): number {
  switch (type) {
    case "FII":
    case "FII_INFRA":
    case "FIAGRO":
    case "ETF":
      return 12;
    default:
      return 4;
  }
}

export function NextPaymentBanner({ items, meta }: Props) {
  const { locale } = useI18n();

  const upcomingList = useMemo<Upcoming[]>(() => {
    const now = Date.now();
    const list: Upcoming[] = [];
    for (const it of items) {
      const iso = meta[it.ticker]?.exDividendDate;
      if (!iso) continue;
      const d = new Date(iso);
      const t = d.getTime();
      if (!Number.isFinite(t) || t <= now) continue;

      const historical = it.paymentMonths?.length ?? 0;
      const freq = historical > 0 ? historical : fallbackFrequency(it.type);
      const perPaymentPerShare = freq > 0 ? it.annualDividend / freq : it.annualDividend;
      const gross = perPaymentPerShare * it.quantity;
      const estimated = netAfterTax(gross, it.type, it.currency);

      list.push({ item: it, date: d, estimated });
    }
    
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
    return list.slice(0, 4);
  }, [items, meta]);

  if (upcomingList.length === 0) return null;

  const label = locale === "en" ? "Upcoming Payments" : "Próximos Pagamentos";

  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-success/30 bg-success/5 px-3 py-2.5 text-sm">
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
          <CalendarClock className="h-4 w-4" />
        </div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground sm:mr-2">{label}</span>
      </div>
      
      <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2">
        {upcomingList.map((upcoming, idx) => {
          const dateLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
            day: "2-digit",
            month: "short",
          }).format(upcoming.date);
          
          return (
            <div key={`${upcoming.item.ticker}-${idx}`} className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-2.5 py-1 rounded-md border border-success/10 shadow-sm">
              <span className="font-semibold text-foreground text-xs">{upcoming.item.ticker}</span>
              <span className="text-muted-foreground text-[10px] uppercase">· {dateLabel} ·</span>
              <span className="font-medium text-success text-xs">
                {formatCurrency(upcoming.estimated, upcoming.item.currency, locale)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
