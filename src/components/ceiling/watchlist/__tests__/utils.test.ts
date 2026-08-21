import { describe, it, expect, vi, afterEach } from "vitest";
import { formatExDate, flagFor } from "../utils";

describe("watchlist utils", () => {
  describe("flagFor", () => {
    it("returns US for USD and BR for BRL", () => {
      expect(flagFor("USD")).toBe("US");
      expect(flagFor("BRL")).toBe("BR");
    });
  });

  describe("formatExDate", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns null for empty or invalid date strings", () => {
      expect(formatExDate("", "ptBR")).toBeNull();
      expect(formatExDate("invalid-date", "ptBR")).toBeNull();
    });

    it("returns null for past ex-dividend dates", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-21T15:00:00.000Z"));

      expect(formatExDate("2026-08-20", "ptBR")).toBeNull();
      expect(formatExDate("2026-08-15T12:00:00.000Z", "ptBR")).toBeNull();
    });

    it("returns formatted string for today's ex-dividend date (does not hide today)", () => {
      vi.useFakeTimers();
      // Even late at night local time (e.g. 23:30 local = 02:30 UTC next day)
      vi.setSystemTime(new Date(2026, 7, 21, 23, 30, 0));

      const resPt = formatExDate("2026-08-21", "ptBR");
      expect(resPt).not.toBeNull();
      expect(resPt).toContain("21");

      const resEn = formatExDate("2026-08-21", "en");
      expect(resEn).not.toBeNull();
      expect(resEn).toContain("21");
    });

    it("returns formatted string for future ex-dividend dates", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));

      const res = formatExDate("2026-08-28", "ptBR");
      expect(res).not.toBeNull();
      expect(res).toContain("28");
    });
  });
});
