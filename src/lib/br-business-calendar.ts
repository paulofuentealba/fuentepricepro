/**
 * Brazilian Business Calendar Utility.
 * Computes national holidays (fixed and mobile via Easter algorithm)
 * and provides business day calculation helpers.
 */

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysUtc(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toMonthDayKey(date: Date): string {
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${m}-${d}`;
}

/**
 * Returns a Set of 'MM-DD' keys for all national holidays in Brazil for a given year.
 */
export function getBrazilianHolidays(year: number): Set<string> {
  const holidays = new Set<string>([
    "01-01", // Ano Novo
    "04-21", // Tiradentes
    "05-01", // Dia do Trabalho
    "09-07", // Independência do Brasil
    "10-12", // Nossa Senhora Aparecida
    "11-02", // Finados
    "11-15", // Proclamação da República
    "12-25", // Natal
  ]);

  const easter = getEasterSunday(year);

  // Mobile holidays
  const carnivalMonday = addDaysUtc(easter, -48);
  const carnivalTuesday = addDaysUtc(easter, -47);
  const goodFriday = addDaysUtc(easter, -2);
  const corpusChristi = addDaysUtc(easter, 60);

  holidays.add(toMonthDayKey(carnivalMonday));
  holidays.add(toMonthDayKey(carnivalTuesday));
  holidays.add(toMonthDayKey(goodFriday));
  holidays.add(toMonthDayKey(corpusChristi));

  return holidays;
}

/**
 * Checks if a given UTC date is a Brazilian business day (not a weekend or national holiday).
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getUTCDay();
  // Saturday (6) or Sunday (0)
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  const year = date.getUTCFullYear();
  const holidays = getBrazilianHolidays(year);
  const key = toMonthDayKey(date);

  return !holidays.has(key);
}

/**
 * Returns the Nth business day of the specified month and year.
 * @param year e.g. 2024
 * @param month 1-indexed (1 = January, 12 = December)
 * @param n business day index (1 = 1st business day)
 */
export function nthBusinessDayOfMonth(year: number, month: number, n: number): Date {
  let count = 0;
  // Start on 1st of month in UTC
  let current = new Date(Date.UTC(year, month - 1, 1));

  while (current.getUTCMonth() === month - 1) {
    if (isBusinessDay(current)) {
      count++;
      if (count === n) {
        return current;
      }
    }
    current = addDaysUtc(current, 1);
  }

  // Fallback if N exceeds business days in month (unlikely for n=10)
  return addDaysUtc(current, -1);
}

/**
 * Starts at the Nth calendar day of the month and if it falls on a weekend or holiday,
 * moves forward to the next business day.
 * @param year e.g. 2024
 * @param month 1-indexed (1 = January, 12 = December)
 * @param day 1-indexed calendar day (e.g. 25)
 */
export function nthCalendarDayPostponed(year: number, month: number, day: number): Date {
  let current = new Date(Date.UTC(year, month - 1, day));
  while (!isBusinessDay(current)) {
    current = addDaysUtc(current, 1);
  }
  return current;
}
