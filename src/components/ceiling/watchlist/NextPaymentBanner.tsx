import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { formatCurrency, displayTicker, toIntlLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { netAfterTax } from "@/lib/calculations";
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
  const { t, locale } = useI18n();
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

  const label = t.watchlist.upcomingPayments;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-success/30 bg-success/5 p-4 text-sm w-full">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
          <CalendarClock className="h-3 w-3" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {(upcomingList || []).map((upcoming, idx) => {
          const dateLabel = new Intl.DateTimeFormat(toIntlLocale(locale), {
            day: "2-digit",
            month: "short",
          }).format(upcoming.date);

          return (
            <div
              key={`${upcoming.item.ticker}-${idx}`}
              className="flex items-center justify-between bg-background/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-success/10 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">
                  {displayTicker(upcoming.item.ticker)}
                </span>
                <span className="text-muted-foreground text-[10px] uppercase">· {dateLabel}</span>
              </div>
              <span className="font-medium text-success text-sm tabular-nums">
                {formatCurrency(upcoming.estimated, upcoming.item.currency, locale)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
