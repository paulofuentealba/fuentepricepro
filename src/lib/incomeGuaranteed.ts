import type { Currency } from "@/lib/domain";
import type { RealizedIncomeEvent, TaxType } from "@/lib/realizedIncome";
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
  /** The year actually used as the % baseline — the first year with any income, not necessarily years[0]. */
  baseYear: number;
  /** Number of years between `baseYear` and the last year — the actual span the % figures cover. */
  spanYears: number;
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

  // Growth is measured from the first year with any actual income, not necessarily years[0] —
  // a year with zero income (e.g. before the user's first investment) can't be a % baseline.
  const baseIndex = years.findIndex((y) => y.receivedAmount + y.projectedAmount > 0);
  const firstTotal =
    baseIndex >= 0 ? years[baseIndex].receivedAmount + years[baseIndex].projectedAmount : 0;
  const lastTotal = years[years.length - 1].receivedAmount + years[years.length - 1].projectedAmount;
  const totalGrowthPct = firstTotal > 0 ? ((lastTotal / firstTotal) - 1) * 100 : 0;
  const spanYears = baseIndex >= 0 ? years.length - 1 - baseIndex : 0;
  const cagrPct =
    firstTotal > 0 && spanYears > 0 ? (Math.pow(lastTotal / firstTotal, 1 / spanYears) - 1) * 100 : 0;

  return {
    years,
    cagrPct: Math.round(cagrPct * 10) / 10,
    totalGrowthPct: Math.round(totalGrowthPct),
    baseYear: baseIndex >= 0 ? years[baseIndex].year : years[0].year,
    spanYears,
  };
}

export interface MonthlyDividendMonth {
  month: string;
  monthIndex: number; // 0-11
  /** Amount already realized (paid) this month, in `currency`. */
  receivedAmount: number;
  /** Amount announced-or-modeled for this month (0 for months of a past year). */
  projectedAmount: number;
}

/**
 * Per-month dividend totals for a single calendar year — the drill-down behind the
 * "Dividendos por ano" chart. For the current year, reuses `currentYearBuckets`
 * (the same buildMonthlyBuckets calendar-mode output that already carries the
 * realized/announced/projected split per month) instead of re-deriving projections.
 * For any past year, every month is fully realized — all `events` are already paid.
 */
export function buildYearMonthlyDividends(
  events: RealizedIncomeEvent[],
  year: number,
  currency: Currency,
  fxRate: number | undefined,
  monthsLabels: string[],
  currentYearBuckets: MonthBucket[],
  todayISO: string = getLocalDateISOString(),
): MonthlyDividendMonth[] {
  const currentYear = Number(todayISO.slice(0, 4));

  if (year === currentYear && currentYearBuckets.length === 12) {
    return currentYearBuckets.map((b, i) => ({
      month: monthsLabels[i] ?? b.month,
      monthIndex: i,
      receivedAmount: Math.round(b.realizedAmount * 100) / 100,
      projectedAmount: Math.round((b.announcedAmount + b.projectedAmount) * 100) / 100,
    }));
  }

  const totals = new Array(12).fill(0);
  for (const ev of events) {
    if (!ev.isPaid) continue;
    const day = ev.paymentDate || ev.exDate;
    if (!day || !day.startsWith(String(year))) continue;
    const monthIdx = Number(day.slice(5, 7)) - 1;
    if (monthIdx < 0 || monthIdx > 11) continue;
    totals[monthIdx] += convertCurrency(ev.amountNet, ev.currency, currency, fxRate);
  }

  return totals.map((total, i) => ({
    month: monthsLabels[i],
    monthIndex: i,
    receivedAmount: Math.round(total * 100) / 100,
    projectedAmount: 0,
  }));
}

export interface MonthTickerRow {
  ticker: string;
  /** The asset's own native currency — never converted, per the per-asset display rule. */
  currency: Currency;
  receivedAmount: number;
  announcedAmount: number;
  /** Pre-tax total (received + announced), in `currency`. */
  grossAmount: number;
  /** grossAmount - (receivedAmount + announcedAmount) — 0 for tax-exempt payouts. */
  taxAmount: number;
  /** Tax classification of the largest-amount event for this ticker this month. */
  taxType: TaxType;
}

/**
 * Per-ticker dividend breakdown for a single calendar month — the 3rd drill-down level
 * below "Dividendos por meses". Built directly from `events` (already native-currency,
 * see RealizedIncomeEvent.currency), so amounts are never converted — consistent with
 * the rule that per-asset values always show in the asset's own currency.
 *
 * Only covers realized and already-announced events; a month whose bar total includes a
 * pure model projection with no backing event yet will simply list fewer/no rows than
 * the bar's total suggests — callers should treat an empty result as "not yet announced
 * per asset", not as zero income.
 */
export function buildMonthTickerBreakdown(
  events: RealizedIncomeEvent[],
  year: number,
  monthIndex: number, // 0-11
): MonthTickerRow[] {
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const rows = new Map<string, MonthTickerRow & { dominantEventAmount: number }>();

  for (const ev of events) {
    const day = ev.paymentDate || ev.exDate;
    if (!day || !day.startsWith(monthPrefix)) continue;

    const existing = rows.get(ev.ticker) ?? {
      ticker: ev.ticker,
      currency: ev.currency,
      receivedAmount: 0,
      announcedAmount: 0,
      grossAmount: 0,
      taxAmount: 0,
      taxType: ev.taxType,
      dominantEventAmount: 0,
    };
    if (ev.isPaid) {
      existing.receivedAmount += ev.amountNet;
    } else {
      existing.announcedAmount += ev.amountNet;
    }
    existing.grossAmount += ev.amountGross;
    // The tax type shown is whichever single event contributed the most this month —
    // a ticker paying both a dividend and JCP in the same month is a rare edge case,
    // and picking the dominant one keeps the chip meaningful without a multi-type list.
    if (ev.amountGross > existing.dominantEventAmount) {
      existing.dominantEventAmount = ev.amountGross;
      existing.taxType = ev.taxType;
    }
    rows.set(ev.ticker, existing);
  }

  return Array.from(rows.values())
    .map(({ dominantEventAmount: _dominantEventAmount, ...r }) => {
      const receivedAmount = Math.round(r.receivedAmount * 100) / 100;
      const announcedAmount = Math.round(r.announcedAmount * 100) / 100;
      const grossAmount = Math.round(r.grossAmount * 100) / 100;
      return {
        ...r,
        receivedAmount,
        announcedAmount,
        grossAmount,
        taxAmount: Math.max(0, Math.round((grossAmount - receivedAmount - announcedAmount) * 100) / 100),
      };
    })
    .filter((r) => r.receivedAmount + r.announcedAmount > 0)
    .sort((a, b) => (b.receivedAmount + b.announcedAmount) - (a.receivedAmount + a.announcedAmount));
}
