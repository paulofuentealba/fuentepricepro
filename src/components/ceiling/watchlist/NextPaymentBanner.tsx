import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { formatCurrency, displayTicker, toIntlLocale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { netAfterTax } from "@/lib/calculations";
import type { WatchlistItem } from "@/lib/watchlist";
import type { AssetType } from "@/lib/domain";
import type { AssetMeta } from "./utils";
import type { DividendEventsMap } from "@/lib/cashflow";

interface Props {
  items: WatchlistItem[];
  meta: Record<string, AssetMeta>;
  dividendEventsMap?: DividendEventsMap;
}

export interface UpcomingPayment {
  item: WatchlistItem;
  date: Date;
  estimatedAmount: number;
  isEstimated: boolean;
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

export function computeUpcomingPayments(
  items: WatchlistItem[],
  meta: Record<string, AssetMeta>,
  dividendEventsMap: DividendEventsMap = {},
  nowMs: number = Date.now(),
): { displayList: UpcomingPayment[]; totalCount: number } {
  const list: UpcomingPayment[] = [];

  for (const it of items) {
    if (it.quantity <= 0) continue;

    const events = dividendEventsMap[it.ticker] ?? [];

    // 1. Primary path: look for future paymentDate in DividendEvents
    const futurePaymentEvents = events
      .filter((ev) => {
        if (!ev.paymentDate) return false;
        const time = new Date(ev.paymentDate).getTime();
        return Number.isFinite(time) && time > nowMs;
      })
      .sort((a, b) => new Date(a.paymentDate!).getTime() - new Date(b.paymentDate!).getTime());

    if (futurePaymentEvents.length > 0) {
      // Take ONLY the earliest future paymentDate event for this ticker
      const ev = futurePaymentEvents[0];
      const d = new Date(ev.paymentDate!);
      const gross = ev.amountPerShare * it.quantity;
      const amountNet = netAfterTax(gross, it.type, it.currency, it.customTaxRate, ev.isJCP);
      list.push({
        item: it,
        date: d,
        estimatedAmount: amountNet,
        isEstimated: !!ev.paymentDateEstimated,
      });
    } else {
      // 2. Fallback: if no future paymentDate in events, check exDate or meta fallback
      const futureExDateEvent = events.find((ev) => {
        const d = new Date(ev.exDate);
        return Number.isFinite(d.getTime()) && d.getTime() > nowMs;
      });

      if (futureExDateEvent) {
        const d = new Date(futureExDateEvent.exDate);
        const gross = futureExDateEvent.amountPerShare * it.quantity;
        const amountNet = netAfterTax(gross, it.type, it.currency, it.customTaxRate, futureExDateEvent.isJCP);
        list.push({
          item: it,
          date: d,
          estimatedAmount: amountNet,
          isEstimated: true,
        });
      } else {
        // Heuristic fallback using meta exDividendDate if future
        const iso = meta[it.ticker]?.exDividendDate;
        if (iso) {
          const d = new Date(iso);
          const time = d.getTime();
          if (Number.isFinite(time) && time > nowMs) {
            const historical = it.paymentMonths?.length ?? 0;
            const freq = historical > 0 ? historical : fallbackFrequency(it.type);
            const perPaymentPerShare = freq > 0 ? it.annualDividend / freq : it.annualDividend;
            const gross = perPaymentPerShare * it.quantity;
            const amountNet = netAfterTax(gross, it.type, it.currency, it.customTaxRate);
            list.push({
              item: it,
              date: d,
              estimatedAmount: amountNet,
              isEstimated: true,
            });
          }
        }
      }
    }
  }

  list.sort((a, b) => a.date.getTime() - b.date.getTime());
  return {
    displayList: list.slice(0, 4),
    totalCount: list.length,
  };
}

export function NextPaymentBanner({ items, meta, dividendEventsMap = {} }: Props) {
  const { t, locale } = useI18n();

  const { displayList, totalCount } = useMemo(
    () => computeUpcomingPayments(items, meta, dividendEventsMap),
    [items, meta, dividendEventsMap],
  );

  if (displayList.length === 0) return null;

  const label =
    totalCount > 4 && t.watchlist.upcomingPaymentsCount
      ? t.watchlist.upcomingPaymentsCount
          .replace("{{x}}", displayList.length.toString())
          .replace("{{total}}", totalCount.toString())
      : t.watchlist.upcomingPayments;

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
        {displayList.map((upcoming, idx) => {
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
                <span className="text-muted-foreground text-[10px] uppercase">
                  · {dateLabel} {upcoming.isEstimated && <span className="normal-case opacity-75">(est.)</span>}
                </span>
              </div>
              <span className="font-medium text-success text-sm tabular-nums">
                {formatCurrency(upcoming.estimatedAmount, upcoming.item.currency, locale)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
