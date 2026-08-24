import type { Currency } from "@/lib/domain";
import type { DividendEvent } from "@/lib/domain";
import type { WatchlistItem } from "@/lib/watchlist";
import { type Transaction, getQuantityAtDate, recalculateInvestingSinceFromTransactions } from "@/lib/transactionsLogic";
import { calculateRealizedIncome, type AssetTaxMeta } from "@/lib/realizedIncome";
import { getEffectiveTransactions } from "@/lib/portfolioIrr";
import { getFxMultiplier } from "@/lib/currency";
import { EXCHANGE_RATE_FALLBACK } from "@/lib/macroDefaults";

export { getFxMultiplier };

export const QUARTERLY_MONTHS = [2, 5, 8, 11]; // Mar, Jun, Sep, Dec (0-indexed)
export const MONTHLY_TYPES: WatchlistItem["type"][] = ["FII", "FII_INFRA", "FIAGRO", "ETF", "REIT"];

export interface MonthContributor {
  ticker: string;
  amount: number;
  paidAmount?: number;
  announcedAmount?: number;
  paymentDate?: string | null;
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


export function buildMonthlyBuckets(
  items: WatchlistItem[],
  currency: Currency,
  monthsLabels: string[],
  dividendEventsMap: DividendEventsMap = {},
  mode: "calendar" | "journey" = "calendar",
  transactions: Transaction[] = [],
  fxRate: number = EXCHANGE_RATE_FALLBACK
): MonthBucket[] {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonthIndex = now.getUTCMonth();

  // 1. Determine window
  let startYear = currentYear;
  let startMonth = 0;
  let endYear = currentYear;
  let endMonth = 11;

  let earliestInvestingSince = Date.now();
  if (items.length > 0) {
    const itemEarliestDates = items.map((it) => {
      const tickerTxs = transactions.filter((t) => t.ticker === it.ticker);
      const computed = tickerTxs.length > 0 ? recalculateInvestingSinceFromTransactions(tickerTxs) : null;
      return computed ?? it.investingSince ?? Date.now();
    });
    earliestInvestingSince = Math.min(...itemEarliestDates);
  }
  const earliestDate = new Date(earliestInvestingSince);

  if (mode === "journey") {
    const oneYearAgo = new Date();
    oneYearAgo.setUTCFullYear(currentYear - 1);
    oneYearAgo.setUTCMonth(currentMonthIndex + 1); // Rolling 12 months

    let startDate = earliestDate;
    if (startDate < oneYearAgo) {
      startDate = oneYearAgo;
    }

    startYear = startDate.getUTCFullYear();
    startMonth = startDate.getUTCMonth();
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
      isStartMonth: mode === "journey" && m === earliestDate.getUTCMonth() && y === earliestDate.getUTCFullYear(),
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

  // Calculate SSOT Realized & Announced events once for all buckets
  const assetMetaMap: Record<string, AssetTaxMeta> = {};
  for (const item of items) {
    assetMetaMap[item.ticker] = {
      ticker: item.ticker,
      type: item.type,
      currency: item.currency,
      customTaxRate: item.customTaxRate,
    };
  }
  const allRealizedEvents = transactions.length > 0
    ? calculateRealizedIncome(transactions, dividendEventsMap, assetMetaMap)
    : [];

  // 4. --- PASS 1: compute the effective displayed value per month ---
  const effectiveAmounts: number[] = bucketTemplates.map((b) => {
    const isPast = b.calendarYear < currentYear || (b.calendarYear === currentYear && b.calendarMonth < currentMonthIndex);

    // Calculate events for this month bucket
    let monthRealized = 0;
    let monthAnnounced = 0;

    for (const ev of allRealizedEvents) {
      const dateStr = ev.paymentDate || ev.exDate;
      const d = new Date(dateStr);
      if (d.getUTCMonth() === b.calendarMonth && d.getUTCFullYear() === b.calendarYear) {
        const item = items.find((it) => it.ticker === ev.ticker);
        const fx = item ? getFxMultiplier(item.currency, currency, fxRate) : 1;
        if (ev.isPaid) {
          monthRealized += ev.amountNet * fx;
        } else {
          monthAnnounced += ev.amountNet * fx;
        }
      }
    }

    if (isPast) {
      if (transactions.length > 0) {
        return monthRealized;
      }
      // Fallback calculation for guest mode without transaction ledger
      let rawFallbackPaid = 0;
      for (const contrib of b.contributors) {
        const events = dividendEventsMap[contrib.ticker] ?? [];
        const item = items.find((it) => it.ticker === contrib.ticker);
        const itemInvestingSince = item?.investingSince ?? 0;
        const fx = item ? getFxMultiplier(item.currency, currency, fxRate) : 1;
        const monthPaid = events
          .filter((ev) => {
            const dateStr = ev.paymentDate ?? ev.exDate;
            const d = new Date(dateStr);
            if (itemInvestingSince > 0 && d.getTime() < itemInvestingSince) return false;
            return d.getUTCMonth() === b.calendarMonth && d.getUTCFullYear() === b.calendarYear;
          })
          .reduce((sum, ev) => sum + ev.amountPerShare * (item?.quantity ?? 0) * fx, 0);
        rawFallbackPaid += monthPaid;
      }
      return rawFallbackPaid;
    }

    return b.amount; // current month and future: projected amount
  });

  const positiveEffective = effectiveAmounts.filter((a) => a > 0);
  const maxEffective = Math.max(...effectiveAmounts, 0);
  const minEffective = positiveEffective.length > 0 ? Math.min(...positiveEffective) : 0;

  // 5. --- PASS 2: build MonthBucket array ---
  let running = 0;
  return bucketTemplates.map((b, i) => {
    running += b.amount;
    const isPast = b.calendarYear < currentYear || (b.calendarYear === currentYear && b.calendarMonth < currentMonthIndex);

    // Filter events for this month bucket
    let monthRealized = 0;
    let monthAnnounced = 0;
    const tickerEventsMap: Record<string, { paid: number; announced: number; payDate: string | null }> = {};

    for (const ev of allRealizedEvents) {
      const dateStr = ev.paymentDate || ev.exDate;
      const d = new Date(dateStr);
      if (d.getUTCMonth() === b.calendarMonth && d.getUTCFullYear() === b.calendarYear) {
        const item = items.find((it) => it.ticker === ev.ticker);
        const fx = item ? getFxMultiplier(item.currency, currency, fxRate) : 1;
        const netConverted = ev.amountNet * fx;

        if (!tickerEventsMap[ev.ticker]) {
          tickerEventsMap[ev.ticker] = { paid: 0, announced: 0, payDate: ev.paymentDate };
        }

        if (ev.isPaid) {
          monthRealized += netConverted;
          tickerEventsMap[ev.ticker].paid += netConverted;
        } else {
          monthAnnounced += netConverted;
          tickerEventsMap[ev.ticker].announced += netConverted;
          if (ev.paymentDate) {
            tickerEventsMap[ev.ticker].payDate = ev.paymentDate;
          }
        }
      }
    }

    // Populate contributor paidAmount, announcedAmount, and paymentDate
    for (const contrib of b.contributors) {
      const evData = tickerEventsMap[contrib.ticker];
      if (evData) {
        contrib.paidAmount = Math.round(evData.paid * 100) / 100;
        contrib.announcedAmount = Math.round(evData.announced * 100) / 100;
        contrib.paymentDate = evData.payDate;
      }
    }

    // Sort contributors based on confirmed amounts (paid or announced), fallback to projected
    const sortedContribs = [...b.contributors].sort((x, y) => {
      const valX = (x.paidAmount ?? 0) + (x.announcedAmount ?? 0) > 0
        ? (x.paidAmount ?? 0) + (x.announcedAmount ?? 0)
        : x.amount;
      const valY = (y.paidAmount ?? 0) + (y.announcedAmount ?? 0) > 0
        ? (y.paidAmount ?? 0) + (y.announcedAmount ?? 0)
        : y.amount;
      return valY - valX;
    });

    const topShare =
      b.amount > 0 && sortedContribs.length > 0 ? sortedContribs[0].amount / b.amount : 0;

    const roundedRealized = Math.round(monthRealized * 100) / 100;
    const roundedAnnounced = Math.round(monthAnnounced * 100) / 100;
    const realizedAmount = isPast ? (roundedRealized > 0 ? roundedRealized : effectiveAmounts[i]) : roundedRealized;
    const announcedAmount = roundedAnnounced;
    const projectedAmount = isPast
      ? 0
      : Math.max(0, Math.round((b.amount - announcedAmount - realizedAmount) * 100) / 100);
    const paidAmount = isPast ? realizedAmount : 0;

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
      isBest: effectiveAmounts[i] > 0 && effectiveAmounts[i] === maxEffective && positiveEffective.length > 1,
      isWorst:
        effectiveAmounts[i] > 0 &&
        effectiveAmounts[i] === minEffective &&
        positiveEffective.length > 1 &&
        effectiveAmounts[i] !== maxEffective,
      concentratedTicker:
        topShare >= 0.3 && sortedContribs.length > 1 ? sortedContribs[0].ticker : null,
    };
  });
}

export function computeCashFlowSummary(data: MonthBucket[]): CashFlowSummary {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const avg = data.length > 0 ? total / data.length : 0;
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

  if (data.length === 0) {
    return { total, avg, top, next30: 0 };
  }

  const now = new Date();
  const currentMonthIdx = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  const daysInCurrent = new Date(Date.UTC(currentYear, currentMonthIdx + 1, 0)).getUTCDate();
  const dayOfMonth = now.getUTCDate();
  const remainingCurrent = (daysInCurrent - dayOfMonth) / daysInCurrent;

  const nextIdx = (currentMonthIdx + 1) % data.length;
  const nextYear = nextIdx === 0 ? currentYear + 1 : currentYear;
  const daysInNext = new Date(Date.UTC(nextYear, nextIdx + 1, 0)).getUTCDate();
  const nextConsumed = Math.min(dayOfMonth / daysInNext, 1);

  const currentAmount = data[currentMonthIdx % data.length]?.amount ?? 0;
  const nextAmount = data[nextIdx]?.amount ?? 0;

  const next30 = currentAmount * remainingCurrent + nextAmount * nextConsumed;
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
  fxRate: number = EXCHANGE_RATE_FALLBACK
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

export interface CashFlowCsvHeaders {
  month: string;
  amount: string;
  paid: string;
  realized: string;
  announced: string;
  projected: string;
  cumulative: string;
  currency: string;
  contributors: string;
}

export function buildCashFlowCsv(
  data: MonthBucket[],
  currency: Currency,
  headers: CashFlowCsvHeaders,
): string {
  const headerRow = [
    headers.month,
    headers.amount,
    headers.paid,
    headers.realized,
    headers.announced,
    headers.projected,
    headers.cumulative,
    headers.currency,
    headers.contributors,
  ];
  const rows = data.map((d) => [
    d.month,
    d.amount.toFixed(2),
    (d.paidAmount ?? 0).toFixed(2),
    (d.realizedAmount ?? 0).toFixed(2),
    (d.announcedAmount ?? 0).toFixed(2),
    (d.projectedAmount ?? 0).toFixed(2),
    d.cumulativeTotal.toFixed(2),
    currency,
    d.contributors.map((c) => `${c.ticker}:${c.amount.toFixed(2)}`).join("|"),
  ]);
  return [headerRow, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function exportCashFlowCsv(
  data: MonthBucket[],
  currency: Currency,
  headers: CashFlowCsvHeaders,
): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const csv = buildCashFlowCsv(data, currency, headers);
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
