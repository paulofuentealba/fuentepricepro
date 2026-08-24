import { describe, it, expect } from "vitest";
import {
  toIntlLocale,
  formatPercent,
  formatNumber,
  formatMonthsAsYearsMonths,
  getLocalDateISOString,
} from "../formatters";
import { ptBR } from "../i18n/dict.ptBR";
import { en } from "../i18n/dict.en";
import { es } from "../i18n/dict.es";

describe("toIntlLocale & formatters", () => {
  it("should convert internal app locale codes to valid BCP 47 language tags", () => {
    expect(toIntlLocale("en")).toBe("en-US");
    expect(toIntlLocale("es")).toBe("es-ES");
    expect(toIntlLocale("ptBR")).toBe("pt-BR");
  });

  it("should format percentages correctly for all locales", () => {
    expect(formatPercent(12.5, "en")).toContain("12.5");
    expect(formatPercent(12.5, "es")).toContain("12,5");
    expect(formatPercent(12.5, "ptBR")).toContain("12,5");
  });

  it("should format numbers correctly with decimal separators for all locales", () => {
    expect(formatNumber(12.56, "en")).toBe("12.56");
    expect(formatNumber(12.56, "es")).toBe("12,56");
    expect(formatNumber(12.56, "ptBR")).toBe("12,56");
  });
});

describe("formatMonthsAsYearsMonths", () => {
  const ptLabels = {
    year: ptBR.common.year,
    years: ptBR.common.years,
    month: ptBR.common.month,
    months: ptBR.common.months,
    separator: ptBR.common.durationSeparator,
    lessThanOneMonth: ptBR.common.lessThanOneMonth,
  };
  const enLabels = {
    year: en.common.year,
    years: en.common.years,
    month: en.common.month,
    months: en.common.months,
    separator: en.common.durationSeparator,
    lessThanOneMonth: en.common.lessThanOneMonth,
  };
  const esLabels = {
    year: es.common.year,
    years: es.common.years,
    month: es.common.month,
    months: es.common.months,
    separator: es.common.durationSeparator,
    lessThanOneMonth: es.common.lessThanOneMonth,
  };

  it("formats years and months together", () => {
    expect(formatMonthsAsYearsMonths(26, ptLabels)).toBe("2 anos e 2 meses");
  });

  it("uses singular for exactly 1 year and 1 month", () => {
    expect(formatMonthsAsYearsMonths(13, ptLabels)).toBe("1 ano e 1 mês");
  });

  it("omits the zeroed part when only years or only months apply", () => {
    expect(formatMonthsAsYearsMonths(24, ptLabels)).toBe("2 anos");
    expect(formatMonthsAsYearsMonths(6, ptLabels)).toBe("6 meses");
  });

  it("returns empty string for non-positive or non-finite input", () => {
    expect(formatMonthsAsYearsMonths(0, ptLabels)).toBe("");
    expect(formatMonthsAsYearsMonths(-5, ptLabels)).toBe("");
    expect(formatMonthsAsYearsMonths(Infinity, ptLabels)).toBe("");
    expect(formatMonthsAsYearsMonths(NaN, ptLabels)).toBe("");
  });

  it("returns a friendly fallback for sub-month durations", () => {
    expect(formatMonthsAsYearsMonths(0.4, ptLabels)).toBe("menos de 1 mês");
  });

  it("formats correctly in English (en) from dict.en", () => {
    expect(formatMonthsAsYearsMonths(26, enLabels)).toBe("2 years and 2 months");
    expect(formatMonthsAsYearsMonths(13, enLabels)).toBe("1 year and 1 month");
    expect(formatMonthsAsYearsMonths(24, enLabels)).toBe("2 years");
    expect(formatMonthsAsYearsMonths(6, enLabels)).toBe("6 months");
    expect(formatMonthsAsYearsMonths(0.4, enLabels)).toBe("less than 1 month");
  });

  it("formats correctly in Spanish (es) from dict.es", () => {
    expect(formatMonthsAsYearsMonths(26, esLabels)).toBe("2 años y 2 meses");
    expect(formatMonthsAsYearsMonths(13, esLabels)).toBe("1 año y 1 mes");
    expect(formatMonthsAsYearsMonths(24, esLabels)).toBe("2 años");
    expect(formatMonthsAsYearsMonths(6, esLabels)).toBe("6 meses");
    expect(formatMonthsAsYearsMonths(0.4, esLabels)).toBe("menos de 1 mes");
  });
});

describe("getLocalDateISOString", () => {
  it("returns current local date formatted as YYYY-MM-DD when called without arguments or with null/empty", () => {
    const res = getLocalDateISOString();
    expect(res).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const now = new Date();
    const expectedYear = now.getFullYear();
    const expectedMonth = String(now.getMonth() + 1).padStart(2, "0");
    const expectedDay = String(now.getDate()).padStart(2, "0");
    expect(res).toBe(`${expectedYear}-${expectedMonth}-${expectedDay}`);

    expect(getLocalDateISOString(null)).toBe(res);
    expect(getLocalDateISOString(undefined)).toBe(res);
    expect(getLocalDateISOString("")).toBe(res);
  });

  it("formats a specific Date instance accurately using its local calendar components", () => {
    // Construct local date: 2026-03-05 at 23:45:00
    const localDate = new Date(2026, 2, 5, 23, 45, 0); // Month is 0-indexed (2 = March)
    expect(getLocalDateISOString(localDate)).toBe("2026-03-05");
  });

  it("formats numeric timestamp correctly", () => {
    const localDate = new Date(2026, 7, 21, 14, 30, 0);
    expect(getLocalDateISOString(localDate.getTime())).toBe("2026-08-21");
  });

  it("handles valid ISO string inputs and returns local YYYY-MM-DD", () => {
    const localDate = new Date(2026, 11, 31, 10, 0, 0);
    expect(getLocalDateISOString(localDate.toString())).toBe("2026-12-31");
  });

  it("returns empty string for invalid date inputs", () => {
    expect(getLocalDateISOString("invalid-date-string")).toBe("");
    expect(getLocalDateISOString(NaN)).toBe("");
  });

  it("preserves local day for late-night hours (e.g. 22h00) that would roll over in UTC to the next day", () => {
    // 2026-08-21 at 22:30:00 local time
    const lateNightDate = new Date(2026, 7, 21, 22, 30, 0);
    expect(getLocalDateISOString(lateNightDate)).toBe("2026-08-21");
    // Verify that the local calendar day is 21
    expect(lateNightDate.getDate()).toBe(21);
  });
});

