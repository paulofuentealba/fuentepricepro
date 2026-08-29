import type { Currency } from "@/lib/domain";
import type { RealizedIncomeEvent } from "@/lib/realizedIncome";
import type { MonthBucket } from "@/lib/cashflow";
import { convertCurrency } from "@/lib/currency";
import { getLocalDateISOString } from "@/lib/formatters";

/**
 * "Renda garantida" (guaranteed income) screen — src/routes/app/income.tsx.
 *
 * All three helpers below are pure aggregations over data the app already computes
 * canonically (RealizedIncomeEvent from calculateRealizedIncome, MonthBucket from
 * buildMonthlyBuckets) — no new tax/valuation math, per AGENTS.md rule 4 (SSOT).
 */

export interface ConfirmedUpcomingRow {
  ticker: string;
  currency: Currency;
  amountGross: number;
  amountNet: number;
  paymentDate: string; // "YYYY-MM-DD"
  daysUntilPayment: number;
}

/**
 * Announced-but-unpaid dividend events due within `windowDays` — "Já garantido" table.
 * These are events whose ex-date already passed and whose amount was announced by the
 * payer; only the payment date is still pending. Sorted soonest-first.
 */
export function buildConfirmedUpcoming(
  events: RealizedIncomeEvent[],
  todayISO: string = getLocalDateISOString(),
  windowDays: number = 60,
): ConfirmedUpcomingRow[] {
  const today = new Date(`${todayISO}T00:00:00`);

  const rows: ConfirmedUpcomingRow[] = [];
  for (const ev of events) {
    if (ev.isPaid || !ev.paymentDate) continue;
    const payDate = new Date(`${ev.paymentDate}T00:00:00`);
    const daysUntilPayment = Math.round((payDate.getTime() - today.getTime()) / 86_400_000);
    if (daysUntilPayment < 0 || daysUntilPayment > windowDays) continue;

    rows.push({
      ticker: ev.ticker,
      currency: ev.currency,
      amountGross: ev.amountGross,
      amountNet: ev.amountNet,
      paymentDate: ev.paymentDate,
      daysUntilPayment,
    });
  }

  return rows.sort((a, b) => a.daysUntilPayment - b.daysUntilPayment);
}

export interface WeakMonthsResult {
  /** 12 entries, Jan..Dec, in the buckets' currency. */
  monthlyAmounts: number[];
  /** Indexes (0-11) of months none of `topTickers` pay in. */
  weakMonthIndexes: number[];
  /** Up to 3 tickers ranked by total contribution across the 12 buckets. */
  topTickers: string[];
  /** The highest monthly amount among the weak months — used to phrase "rendem menos que X". */
  weakMonthThreshold: number;
}

/**
 * Identifies the user's top holdings and the calendar months where none of them pay —
 * "Seus meses secos". Built directly from `MonthBucket[]` (buildMonthlyBuckets, calendar
 * mode) rather than re-deriving payment months, so it stays consistent with the chart the
 * rest of the app already shows for cashflow.
 */
export function buildWeakMonths(buckets: MonthBucket[]): WeakMonthsResult {
  const monthlyAmounts = buckets.map((b) => Math.round(b.amount * 100) / 100);

  const tickerTotals = new Map<string, number>();
  for (const bucket of buckets) {
    for (const contrib of bucket.contributors) {
      tickerTotals.set(contrib.ticker, (tickerTotals.get(contrib.ticker) ?? 0) + contrib.amount);
    }
  }
  const topTickers = Array.from(tickerTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ticker]) => ticker);

  const topTickerSet = new Set(topTickers);
  const weakMonthIndexes = buckets
    .map((bucket, index) => ({ index, hasTopPayer: bucket.contributors.some((c) => topTickerSet.has(c.ticker) && c.amount > 0) }))
    .filter(({ hasTopPayer }) => !hasTopPayer)
    .map(({ index }) => index);

  const weakMonthThreshold =
    weakMonthIndexes.length > 0 ? Math.max(...weakMonthIndexes.map((i) => monthlyAmounts[i])) : 0;

  return { monthlyAmounts, weakMonthIndexes, topTickers, weakMonthThreshold: Math.round(weakMonthThreshold) };
}

export interface AnnualDividendYear {
  year: number;
  /** Amount already realized (paid) this year, in `currency`. */
  receivedAmount: number;
  /** Amount announced-or-modeled for the remainder of the year (0 for past years). */
  projectedAmount: number;
  isCurrentYear: boolean;
}

export interface AnnualDividendsResult {
  years: AnnualDividendYear[]; // oldest -> newest
  /** Annualized growth rate across the span, using each year's full total (received+projected). */
  cagrPct: number;
  /** Total growth from the first year to the last, (last/first - 1) * 100. */
  totalGrowthPct: number;
}

/**
 * Per-year dividend totals for the last `yearsBack + 1` years, with the current year split
 * into already-received vs. projected-for-the-rest-of-the-year (from `currentYearBuckets`,
 * the same buildMonthlyBuckets output already used by the chart on the old cashflow view).
 */
export function buildAnnualDividends(
  events: RealizedIncomeEvent[],
  currentYearBuckets: MonthBucket[],
  currency: Currency,
  fxRate: number | undefined,
  yearsBack: number = 5,
  todayISO: string = getLocalDateISOString(),
): AnnualDividendsResult {
  const currentYear = Number(todayISO.slice(0, 4));
  const startYear = currentYear - yearsBack;

  const years: AnnualDividendYear[] = [];
  for (let year = startYear; year < currentYear; year++) {
    let total = 0;
    for (const ev of events) {
      if (!ev.isPaid) continue;
      const day = ev.paymentDate || ev.exDate;
      if (!day.startsWith(String(year))) continue;
      total += convertCurrency(ev.amountNet, ev.currency, currency, fxRate);
    }
    years.push({ year, receivedAmount: Math.round(total * 100) / 100, projectedAmount: 0, isCurrentYear: false });
  }

  const receivedThisYear = currentYearBuckets.reduce((sum, b) => sum + b.realizedAmount, 0);
  const projectedThisYear = currentYearBuckets.reduce(
    (sum, b) => sum + b.announcedAmount + b.projectedAmount,
    0,
  );
  years.push({
    year: currentYear,
    receivedAmount: Math.round(receivedThisYear * 100) / 100,
    projectedAmount: Math.round(projectedThisYear * 100) / 100,
    isCurrentYear: true,
  });

  const firstTotal = years[0].receivedAmount + years[0].projectedAmount;
  const lastTotal = years[years.length - 1].receivedAmount + years[years.length - 1].projectedAmount;
  const totalGrowthPct = firstTotal > 0 ? ((lastTotal / firstTotal) - 1) * 100 : 0;
  const spanYears = years.length - 1;
  const cagrPct =
    firstTotal > 0 && spanYears > 0 ? (Math.pow(lastTotal / firstTotal, 1 / spanYears) - 1) * 100 : 0;

  return {
    years,
    cagrPct: Math.round(cagrPct * 10) / 10,
    totalGrowthPct: Math.round(totalGrowthPct),
  };
}
