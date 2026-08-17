import type { Asset } from "./domain";

export interface HeatmapCell {
  month: number; // 1 to 12
  year: number;
  totalAmount: number;
  paymentCount: number;
}

export interface MonthRecurrence {
  month: number;
  yearsPaidCount: number;
  totalYearsCount: number;
  recurrencePct: number;
}

export interface DividendHeatmapData {
  years: number[]; // sorted descending, e.g. [2025, 2024, 2023, ...]
  cellsByYear: Record<number, Record<number, HeatmapCell>>;
  maxMonthlyAmount: number;
  recurrenceByMonth: Record<number, MonthRecurrence>;
  payoutRatio: number | null;
}

/**
 * Pure calculation engine to aggregate dividend events into a Year x Month heatmap matrix
 * and calculate monthly historical recurrence frequency (%).
 */
export function computeDividendHeatmap(asset: Asset): DividendHeatmapData {
  const cellsByYear: Record<number, Record<number, HeatmapCell>> = {};
  const yearSet = new Set<number>();
  let maxMonthlyAmount = 0;

  const events = asset.dividendEvents ?? [];

  if (events.length > 0) {
    for (const ev of events) {
      const dateStr = ev.paymentDate || ev.exDate;
      if (!dateStr || ev.amountPerShare <= 0) continue;

      const d = new Date(dateStr);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1; // 1 to 12

      if (!Number.isFinite(year) || year < 2000 || year > 2100) continue;

      yearSet.add(year);

      if (!cellsByYear[year]) {
        cellsByYear[year] = {};
        for (let m = 1; m <= 12; m++) {
          cellsByYear[year][m] = { month: m, year, totalAmount: 0, paymentCount: 0 };
        }
      }

      const cell = cellsByYear[year][month];
      cell.totalAmount += ev.amountPerShare;
      cell.paymentCount += 1;

      if (cell.totalAmount > maxMonthlyAmount) {
        maxMonthlyAmount = cell.totalAmount;
      }
    }
  } else if ((asset.dividendHistory ?? []).length > 0) {
    // Fallback: derive from annual dividend history
    const months = asset.paymentMonths && asset.paymentMonths.length > 0 ? asset.paymentMonths : [12];
    for (const pt of asset.dividendHistory) {
      if (pt.amount <= 0 || pt.year < 2000) continue;
      const year = pt.year;
      yearSet.add(year);

      if (!cellsByYear[year]) {
        cellsByYear[year] = {};
        for (let m = 1; m <= 12; m++) {
          cellsByYear[year][m] = { month: m, year, totalAmount: 0, paymentCount: 0 };
        }
      }

      const amountPerMonth = pt.amount / months.length;
      for (const m of months) {
        if (m >= 1 && m <= 12) {
          cellsByYear[year][m].totalAmount += amountPerMonth;
          cellsByYear[year][m].paymentCount += 1;
          if (cellsByYear[year][m].totalAmount > maxMonthlyAmount) {
            maxMonthlyAmount = cellsByYear[year][m].totalAmount;
          }
        }
      }
    }
  }

  const years = Array.from(yearSet).sort((a, b) => b - a);

  // Ensure all years have 12 initialized months
  for (const y of years) {
    if (!cellsByYear[y]) {
      cellsByYear[y] = {};
      for (let m = 1; m <= 12; m++) {
        cellsByYear[y][m] = { month: m, year: y, totalAmount: 0, paymentCount: 0 };
      }
    }
  }

  const recurrenceByMonth: Record<number, MonthRecurrence> = {};
  const totalYears = years.length;

  for (let m = 1; m <= 12; m++) {
    let yearsPaid = 0;
    if (totalYears > 0) {
      for (const y of years) {
        if (cellsByYear[y]?.[m]?.totalAmount > 0) {
          yearsPaid += 1;
        }
      }
    }
    recurrenceByMonth[m] = {
      month: m,
      yearsPaidCount: yearsPaid,
      totalYearsCount: totalYears,
      recurrencePct: totalYears > 0 ? (yearsPaid / totalYears) * 100 : 0,
    };
  }

  const isStock = asset.type === "STOCK_BR" || asset.type === "STOCK_US";
  const payoutRatio = isStock ? asset.metrics?.payoutRatio ?? null : null;

  return {
    years,
    cellsByYear,
    maxMonthlyAmount,
    recurrenceByMonth,
    payoutRatio,
  };
}
