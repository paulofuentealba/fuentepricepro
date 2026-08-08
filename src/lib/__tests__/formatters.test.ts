import { describe, it, expect } from "vitest";
import { toIntlLocale, formatPercent, formatNumber } from "../formatters";

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
