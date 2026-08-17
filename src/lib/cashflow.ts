import type { Currency } from "@/lib/domain";
import type { DividendEvent } from "@/lib/domain";
import type { WatchlistItem } from "@/lib/watchlist";
import { type Transaction, getQuantityAtDate } from "@/lib/transactions";
import { calculateRealizedIncome, type AssetTaxMeta } from "@/lib/realizedIncome";
import { getEffectiveTransactions } from "@/lib/portfolioIrr";

export const QUARTERLY_MONTHS = [2, 5, 8, 11]; // Mar, Jun, Sep, Dec (0-indexed)
export const MONTHLY_TYPES: WatchlistItem["type"][] = ["FII", "FII_INFRA", "FIAGRO", "ETF", "REIT"];

export interface MonthContributor {
  ticker: string;
  amount: number;
  paidAmount?: number;
  type: WatchlistItem["type"];
}

export interface MonthBucket {
  month: string;
  monthIndex: number;
  calendarMonth: number;
  calendarYear: number;
  isStartMonth?: boolean;
  amount: number;
  paidAmount: number;
  realizedAmount: number;
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

export function getFxMultiplier(
  assetCurrency: Currency,
  targetCurrency: Currency,
  fxRate: number = 5.5
): number {
  if (assetCurrency === targetCurrency) return 1;
  if (assetCurrency === "USD" && targetCurrency === "BRL") return fxRate > 0 ? fxRate : 5.5;
  if (assetCurrency === "BRL" && targetCurrency === "USD") return fxRate > 0 ? 1 / fxRate : 1 / 5.5;
  return 1;
}

export function buildMonthlyBuckets(
  items: WatchlistItem[],
  currency: Currency,
  monthsLabels: string[],
  dividendEventsMap: DividendEventsMap = {},
  mode: "calendar" | "journey" = "calendar",
  transactions: Transaction[] = [],
  fxRate: number = 5.5
): MonthBucket[] {
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

  // 1. Determine window
  let startYear = currentYear;
  let startMonth = 0;
  let endYear = currentYear;
  let endMonth = 11;

  let earliestInvestingSince = Date.now();
  if (items.length > 0) {
    earliestInvestingSince = Math.min(...items.map((it) => it.investingSince));
  }
  const earliestDate = new Date(earliestInvestingSince);

  if (mode === "journey") {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(currentYear - 1);
    oneYearAgo.setMonth(currentMonthIndex + 1); // Rolling 12 months

    let startDate = earliestDate;
    if (startDate < oneYearAgo) {
      startDate = oneYearAgo;
    }

    startYear = startDate.getFullYear();
    startMonth = startDate.getMonth();
    endYear = currentYear;
    endMonth = currentMonthIndex;
  }

  // 2. Build bucket templates explicitly mapped to calendar months
  const bucketTemplates: {
    calendarMonth: number;
    calendarYear: number;
    monthLabel: string;
    isStartMonth: boolean;
    amount: number;
    contributors: MonthContributor[];
  }[] = [];

  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const isCrossYear = startYear !== endYear;
    let label = monthsLabels[m];
    
    const isFirstBucket = bucketTemplates.length === 0;
    const previousYear = bucketTemplates.length > 0 ? bucketTemplates[bucketTemplates.length - 1].calendarYear : null;
    const isYearChange = previousYear !== null && previousYear !== y;

    if (mode === "journey" && isCrossYear && (isFirstBucket || isYearChange)) {
      label = `${label}/${y.toString().slice(2)}`;
    }
    bucketTemplates.push({
      calendarMonth: m,
      calendarYear: y,
      monthLabel: label,
      isStartMonth: mode === "journey" && m === earliestDate.getMonth() && y === earliestDate.getFullYear(),
      amount: 0,
      contributors: [],
    });

    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }

  // 3. Distribute projected amounts (with currency conversion)
  for (const it of items) {
    const fx = getFxMultiplier(it.currency, currency, fxRate);
    const annual = it.annualDividend * it.quantity * fx;
    if (annual <= 0) continue;
    const detected =
      Array.isArray(it.paymentMonths) && it.paymentMonths.length > 0
        ? it.paymentMonths.map((m) => m - 1).filter((m) => m >= 0 && m <= 11)
        : fallbackMonthsForType(it.type);
    if (detected.length === 0) continue;
    const per = annual / detected.length;
    for (const d of detected) {
      const bucket = bucketTemplates.find((b) => b.calendarMonth === d);
      if (bucket) {
        bucket.amount += per;
        bucket.contributors.push({ ticker: it.ticker, amount: per, type: it.type });
      }
    }
  }

  // 4. --- PASS 1: compute the effective displayed value per month ---
  const effectiveAmounts: number[] = bucketTemplates.map((b) => {
    const isPast = b.calendarYear < currentYear || (b.calendarYear === currentYear && b.calendarMonth < currentMonthIndex);

    if (isPast) {
      let realPaid = 0;
      for (const contrib of b.contributors) {
        const events = dividendEventsMap[contrib.ticker] ?? [];
        const item = items.find((it) => it.ticker === contrib.ticker);
        const itemInvestingSince = item ? item.investingSince : Date.now();
        const fx = item ? getFxMultiplier(item.currency, currency, fxRate) : 1;

        const tickerTxs = transactions.filter(t => t.ticker === contrib.ticker);

        const monthPaid = events
          .filter((ev) => {
            const dateStr = ev.paymentDate ?? ev.exDate;
            const d = new Date(dateStr);
            // GHOST DIVIDEND FIX: Skip events before the asset was added
            if (d.getTime() < itemInvestingSince) return false;
            
            return d.getUTCMonth() === b.calendarMonth && d.getUTCFullYear() === b.calendarYear;
          })
          .reduce((sum, ev) => {
            const dateStr = ev.paymentDate ?? ev.exDate;
            const dateNum = new Date(dateStr).getTime();
            const q = tickerTxs.length > 0 ? getQuantityAtDate(tickerTxs, dateNum) : (item?.quantity ?? 0);
            return sum + ev.amountPerShare * q * fx;
          }, 0);

        contrib.paidAmount = monthPaid;
        realPaid += monthPaid;
      }
      return realPaid;
    }
    return b.amount; // current month and future: projected
  });

  const positiveEffective = effectiveAmounts.filter((a) => a > 0);
  const maxEffective = Math.max(...effectiveAmounts, 0);
  const minEffective = positiveEffective.length > 0 ? Math.min(...positiveEffective) : 0;

  // 5. --- PASS 2: build MonthBucket array ---
  let running = 0;
  return bucketTemplates.map((b, i) => {
    running += b.amount;
    const isPast = b.calendarYear < currentYear || (b.calendarYear === currentYear && b.calendarMonth < currentMonthIndex);

    // Sort contributors based on effective paid amount for past months
    const sortedContribs = [...b.contributors].sort((x, y) => {
      const valX = isPast ? (x.paidAmount ?? 0) : x.amount;
      const valY = isPast ? (y.paidAmount ?? 0) : y.amount;
      return valY - valX;
    });

    const topShare =
      b.amount > 0 && sortedContribs.length > 0 ? sortedContribs[0].amount / b.amount : 0;

    const effectiveAmount = effectiveAmounts[i];
    const paidAmount = isPast ? effectiveAmount : 0;

    // Calculate SSOT Realized Income for this month/year bucket
    let bucketRealized = 0;
    if (transactions.length > 0) {
      const assetMetaMap: Record<string, AssetTaxMeta> = {};
      for (const item of items) {
        assetMetaMap[item.ticker] = {
          ticker: item.ticker,
          type: item.type,
          currency: item.currency,
          customTaxRate: item.customTaxRate,
        };
      }
      const realizedEvents = calculateRealizedIncome(transactions, dividendEventsMap, assetMetaMap);
      for (const ev of realizedEvents) {
        const item = items.find((it) => it.ticker === ev.ticker);
        const fx = item ? getFxMultiplier(item.currency, currency, fxRate) : 1;

        const dateStr = ev.paymentDate || ev.exDate;
        const d = new Date(dateStr);
        if (d.getUTCMonth() === b.calendarMonth && d.getUTCFullYear() === b.calendarYear) {
          bucketRealized += ev.amountNet * fx;
        }
      }
    }
    const roundedBucketRealized = Math.round(bucketRealized * 100) / 100;
    const realizedAmount = isPast ? roundedBucketRealized : 0;
    const announcedAmount = !isPast ? roundedBucketRealized : 0;
    const projectedAmount = isPast
      ? 0
      : Math.max(0, Math.round((b.amount - announcedAmount) * 100) / 100);

    return {
      month: b.monthLabel,
      monthIndex: i,
      calendarMonth: b.calendarMonth,
      calendarYear: b.calendarYear,
      isStartMonth: b.isStartMonth,
      amount: b.amount, // kept as pure projection — used by summary/sparklines
      paidAmount,
      realizedAmount,
      announcedAmount,
      projectedAmount,
      cumulativeTotal: running,
      contributors: sortedContribs,
      isBest: effectiveAmount > 0 && effectiveAmount === maxEffective && positiveEffective.length > 1,
      isWorst:
        effectiveAmount > 0 &&
        effectiveAmount === minEffective &&
        positiveEffective.length > 1 &&
        effectiveAmount !== maxEffective,
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
 * Uses SSOT calculateRealizedIncome with effective transaction history and tax deductions.
 */
export function computeInvestedVsReceived(
  items: WatchlistItem[],
  currency: Currency,
  dividendEventsMap: DividendEventsMap,
  transactions: Transaction[] = [],
  fxRate: number = 5.5
): InvestedVsReceivedItem[] {
  if (!items || items.length === 0) return [];

  const effectiveTxs = getEffectiveTransactions(transactions, items);
  const assetMetaMap: Record<string, AssetTaxMeta> = {};
  for (const it of items) {
    assetMetaMap[it.ticker] = {
      ticker: it.ticker,
      type: it.type,
      currency: it.currency,
      customTaxRate: it.customTaxRate,
    };
  }

  const realizedEvents = calculateRealizedIncome(effectiveTxs, dividendEventsMap, assetMetaMap);

  const receivedByTicker = new Map<string, number>();
  for (const ev of realizedEvents) {
    const norm = ev.ticker.toUpperCase();
    const item = items.find(
      (it) =>
        it.ticker.toUpperCase() === norm ||
        it.ticker.toUpperCase() === `${norm}.SA` ||
        `${it.ticker.toUpperCase()}.SA` === norm
    );
    const fx = item ? getFxMultiplier(item.currency, currency, fxRate) : 1;
    receivedByTicker.set(norm, (receivedByTicker.get(norm) ?? 0) + ev.amountNet * fx);
  }

  return items
    .filter((it) => it.quantity > 0)
    .map((it) => {
      const fx = getFxMultiplier(it.currency, currency, fxRate);
      const normTicker = it.ticker.toUpperCase();
      const received =
        receivedByTicker.get(normTicker) ??
        receivedByTicker.get(normTicker.replace(/\.SA$/, "")) ??
        0;
      const invested = (it.averagePrice ?? 0) * it.quantity * fx;

      return {
        ticker: it.ticker,
        invested: Math.round(invested * 100) / 100,
        received: Math.round(received * 100) / 100,
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
