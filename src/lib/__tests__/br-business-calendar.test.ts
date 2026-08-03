import { describe, expect, it } from "vitest";
import {
  getBrazilianHolidays,
  isBusinessDay,
  nthBusinessDayOfMonth,
  nthCalendarDayPostponed,
} from "../br-business-calendar";

describe("br-business-calendar", () => {
  it("computes mobile holidays correctly for 2024 (Easter = March 31, 2024)", () => {
    const holidays2024 = getBrazilianHolidays(2024);

    // Fixed holidays
    expect(holidays2024.has("01-01")).toBe(true); // Ano Novo
    expect(holidays2024.has("09-07")).toBe(true); // Independencia
    expect(holidays2024.has("12-25")).toBe(true); // Natal

    // Mobile holidays for 2024:
    // Easter: March 31, 2024
    // Good Friday: March 29, 2024
    // Carnival Monday: Feb 12, 2024
    // Carnival Tuesday: Feb 13, 2024
    // Corpus Christi: May 30, 2024
    expect(holidays2024.has("03-29")).toBe(true);
    expect(holidays2024.has("02-12")).toBe(true);
    expect(holidays2024.has("02-13")).toBe(true);
    expect(holidays2024.has("05-30")).toBe(true);
  });

  it("computes mobile holidays correctly for 2025 (Easter = April 20, 2025)", () => {
    const holidays2025 = getBrazilianHolidays(2025);

    // Good Friday: April 18, 2025
    // Carnival Tuesday: March 4, 2025
    // Corpus Christi: June 19, 2025
    expect(holidays2025.has("04-18")).toBe(true);
    expect(holidays2025.has("03-04")).toBe(true);
    expect(holidays2025.has("06-19")).toBe(true);
  });

  it("identifies weekends and holidays correctly in isBusinessDay", () => {
    // 2024-09-07 (Independence day - Saturday) -> false
    expect(isBusinessDay(new Date(Date.UTC(2024, 8, 7)))).toBe(false);

    // 2024-09-08 (Sunday) -> false
    expect(isBusinessDay(new Date(Date.UTC(2024, 8, 8)))).toBe(false);

    // 2024-09-09 (Monday) -> true
    expect(isBusinessDay(new Date(Date.UTC(2024, 8, 9)))).toBe(true);

    // 2024-12-25 (Christmas - Wednesday) -> false
    expect(isBusinessDay(new Date(Date.UTC(2024, 11, 25)))).toBe(false);
  });

  it("calculates 10th business day of month (September 2024)", () => {
    // Sept 2024:
    // Sept 1 = Sun
    // Sept 2 = Mon (1)
    // Sept 3 = Tue (2)
    // Sept 4 = Wed (3)
    // Sept 5 = Thu (4)
    // Sept 6 = Fri (5)
    // Sept 7 = Sat (Holiday)
    // Sept 8 = Sun
    // Sept 9 = Mon (6)
    // Sept 10 = Tue (7)
    // Sept 11 = Wed (8)
    // Sept 12 = Thu (9)
    // Sept 13 = Fri (10)
    const tenthBd = nthBusinessDayOfMonth(2024, 9, 10);
    expect(tenthBd.toISOString().slice(0, 10)).toBe("2024-09-13");
  });

  it("calculates nth calendar day postponed (BTLG11 style)", () => {
    // Sept 25, 2024 is Wednesday (business day) -> stays Sept 25
    const d1 = nthCalendarDayPostponed(2024, 9, 25);
    expect(d1.toISOString().slice(0, 10)).toBe("2024-09-25");

    // Aug 25, 2024 was Sunday -> postpones to Aug 26, 2024 (Monday)
    const d2 = nthCalendarDayPostponed(2024, 8, 25);
    expect(d2.toISOString().slice(0, 10)).toBe("2024-08-26");
  });
});
