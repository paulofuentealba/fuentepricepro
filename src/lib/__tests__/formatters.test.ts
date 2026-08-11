import { describe, it, expect } from "vitest";
import { toIntlLocale, formatPercent, formatNumber, formatMonthsAsYearsMonths } from "../formatters";

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
  it("formats years and months together", () => {
    expect(formatMonthsAsYearsMonths(26)).toBe("2 anos e 2 meses");
  });

  it("uses singular for exactly 1 year and 1 month", () => {
    expect(formatMonthsAsYearsMonths(13)).toBe("1 ano e 1 mês");
  });

  it("omits the zeroed part when only years or only months apply", () => {
    expect(formatMonthsAsYearsMonths(24)).toBe("2 anos");
    expect(formatMonthsAsYearsMonths(6)).toBe("6 meses");
  });

  it("returns empty string for non-positive or non-finite input", () => {
    expect(formatMonthsAsYearsMonths(0)).toBe("");
    expect(formatMonthsAsYearsMonths(-5)).toBe("");
    expect(formatMonthsAsYearsMonths(Infinity)).toBe("");
    expect(formatMonthsAsYearsMonths(NaN)).toBe("");
  });

  it("returns a friendly fallback for sub-month durations", () => {
    expect(formatMonthsAsYearsMonths(0.4)).toBe("menos de 1 mês");
  });
});
