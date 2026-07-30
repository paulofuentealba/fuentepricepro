import type { Currency } from "@/lib/domain";
import type { DividendEvent } from "@/lib/domain";
import type { WatchlistItem } from "@/lib/watchlist";

export const QUARTERLY_MONTHS = [2, 5, 8, 11]; // Mar, Jun, Sep, Dec (0-indexed)
export const MONTHLY_TYPES: WatchlistItem["type"][] = ["FII", "FII_INFRA", "FIAGRO", "ETF", "REIT"];

export interface MonthContributor {
  ticker: string;
  amount: number;
  type: WatchlistItem["type"];
}

export interface MonthBucket {
  month: string;
  monthIndex: number;
  amount: number;
  paidAmount: number;
  announcedAmount: number;
  projectedAmount: number;
  cumulativeTotal: number;
  contributors: MonthContributor[];
  isBest: boolean;
  isWorst: boolean;
  concentratedTicker: string | null;
  [key: string]: any;
}

export interface CashFlowSummary {
  total: number;
  avg: number;
  top: { ticker: string; amount: number } | null;
  next30: number;
}

/** Map of ticker → raw dividend events, used to compute real paidAmount. */
export type DividendEventsMap = Record<string, DividendEvent[]>;

export interface InvestedVsReceivedItem {
  ticker: string;
  /** averagePrice × quantity */
  invested: number;
  /** Sum of all historical dividend events × current quantity (constant quantity assumption). */
  received: number;
}

function fallbackMonthsForType(type: WatchlistItem["type"]): number[] {
  return MONTHLY_TYPES.includes(type) ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : QUARTERLY_MONTHS;
}

export function buildMonthlyBuckets(
  items: WatchlistItem[],
  currency: Currency,
  months: string[],
  dividendEventsMap: DividendEventsMap = {},
): MonthBucket[] {
  const buckets: { amount: number; contributors: MonthContributor[] }[] = Array.from(
    { length: 12 },
    () => ({ amount: 0, contributors: [] }),
  );
  for (const it of items) {
    if (it.currency !== currency) continue;
    const annual = it.annualDividend * it.quantity;
    if (annual <= 0) continue;
    const detected =
      Array.isArray(it.paymentMonths) && it.paymentMonths.length > 0
        ? it.paymentMonths.map((m) => m - 1).filter((m) => m >= 0 && m <= 11)
        : fallbackMonthsForType(it.type);
    if (detected.length === 0) continue;
    const per = annual / detected.length;
    for (const m of detected) {
      buckets[m].amount += per;
      buckets[m].contributors.push({ ticker: it.ticker, amount: per, type: it.type });
    }
  }
  const amounts = buckets.map((b) => b.amount);
  const maxAmount = Math.max(...amounts, 0);
  const positive = amounts.filter((a) => a > 0);
  const minPositive = positive.length > 0 ? Math.min(...positive) : 0;

  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

  let running = 0;
  return buckets.map((b, i) => {
    running += b.amount;
    const sortedContribs = [...b.contributors].sort((a, b) => b.amount - a.amount);
    const topShare =
      b.amount > 0 && sortedContribs.length > 0 ? sortedContribs[0].amount / b.amount : 0;

    let paidAmount = 0;
    const announcedAmount = 0;
    let projectedAmount = 0;

    if (i < currentMonthIndex) {
      // Use real dividend events for past months: sum events whose paymentDate (or exDate for Yahoo)
      // falls in month i of the current year, multiplied by each asset's current quantity.
      let realPaid = 0;
      for (const contrib of b.contributors) {
        const events = dividendEventsMap[contrib.ticker] ?? [];
        const monthPaid = events
          .filter((ev) => {
            const dateStr = ev.paymentDate ?? ev.exDate;
            const d = new Date(dateStr);
            return d.getUTCMonth() === i && d.getUTCFullYear() === currentYear;
          })
          .reduce((sum, ev) => {
            // Find quantity for this ticker in items
            const item = items.find((it) => it.ticker === contrib.ticker);
            return sum + ev.amountPerShare * (item?.quantity ?? 0);
          }, 0);
        realPaid += monthPaid;
      }
      paidAmount = realPaid;
      projectedAmount = 0;
    } else {
      // Current month and future: keep as projected
      projectedAmount = b.amount;
      paidAmount = 0;
    }

    return {
      month: months[i],
      monthIndex: i,
      amount: b.amount,
      paidAmount,
      announcedAmount,
      projectedAmount,
      cumulativeTotal: running,
      contributors: sortedContribs,
      isBest: b.amount > 0 && b.amount === maxAmount && positive.length > 1,
      isWorst:
        b.amount > 0 && b.amount === minPositive && positive.length > 1 && b.amount !== maxAmount,
      concentratedTicker:
        topShare >= 0.3 && sortedContribs.length > 1 ? sortedContribs[0].ticker : null,
    };
  });
}

export function computeCashFlowSummary(data: MonthBucket[]): CashFlowSummary {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const avg = total / 12;
  const tickerTotals = new Map<string, number>();
  for (const d of data) {
    for (const c of d.contributors) {
      tickerTotals.set(c.ticker, (tickerTotals.get(c.ticker) ?? 0) + c.amount);
    }
  }
  let top: { ticker: string; amount: number } | null = null;
  for (const [ticker, amount] of tickerTotals) {
    if (!top || amount > top.amount) top = { ticker, amount };
  }
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const daysInCurrent = new Date(now.getFullYear(), currentMonthIdx + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const remainingCurrent = (daysInCurrent - dayOfMonth) / daysInCurrent;

  const nextIdx = (currentMonthIdx + 1) % 12;
  const nextYear = nextIdx === 0 ? now.getFullYear() + 1 : now.getFullYear();
  const daysInNext = new Date(nextYear, nextIdx + 1, 0).getDate();
  const nextConsumed = Math.min(dayOfMonth / daysInNext, 1);

  const next30 =
    data[currentMonthIdx].amount * remainingCurrent + data[nextIdx].amount * nextConsumed;
  return { total, avg, top, next30 };
}

/**
 * Computes invested vs. received amounts per asset, for the third chart.
 * Limited to top 10 by invested value.
 * NOTE: "received" assumes current quantity is held throughout (no transaction history).
 */
export function computeInvestedVsReceived(
  items: WatchlistItem[],
  currency: Currency,
  dividendEventsMap: DividendEventsMap,
): InvestedVsReceivedItem[] {
  return items
    .filter((it) => it.currency === currency && it.quantity > 0)
    .map((it) => {
      const events = dividendEventsMap[it.ticker] ?? [];
      const totalReceivedPerShare = events.reduce((s, e) => s + e.amountPerShare, 0);
      return {
        ticker: it.ticker,
        invested: (it.averagePrice ?? 0) * it.quantity,
        received: totalReceivedPerShare * it.quantity,
      };
    })
    .filter((r) => r.invested > 0 || r.received > 0)
    .sort((a, b) => b.invested - a.invested)
    .slice(0, 10);
}

export function buildSparklinePath(values: number[]): string {
  const w = 80;
  const h = 20;
  const max = Math.max(...values, 0);
  if (max <= 0) return "";
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function exportCashFlowCsv(data: MonthBucket[], currency: Currency): void {
  const header = ["Month", "Amount", "Cumulative", "Currency", "Contributors"];
  const rows = data.map((d) => [
    d.month,
    d.amount.toFixed(2),
    d.cumulativeTotal.toFixed(2),
    currency,
    d.contributors.map((c) => `${c.ticker}:${c.amount.toFixed(2)}`).join("|"),
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cash-flow-${currency}-${new Date().getFullYear()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
