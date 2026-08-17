import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeHgDate,
  formatHgTicker,
  fetchHgBrasilDividends,
  enrichDividendPaymentDates,
} from "../hgBrasil.server";
import * as httpModule from "../http.server";

describe("HG Brasil API Integration (hgBrasil.server.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("normalizeHgDate", () => {
    it("preserves already formatted ISO YYYY-MM-DD strings", () => {
      expect(normalizeHgDate("2024-05-15")).toBe("2024-05-15");
      expect(normalizeHgDate("2023-12-31")).toBe("2023-12-31");
    });

    it("converts Brazilian DD/MM/YYYY dates to ISO YYYY-MM-DD", () => {
      expect(normalizeHgDate("15/05/2024")).toBe("2024-05-15");
      expect(normalizeHgDate("01/01/2023")).toBe("2023-01-01");
    });

    it("returns null for invalid or empty inputs", () => {
      expect(normalizeHgDate("")).toBeNull();
      expect(normalizeHgDate(null)).toBeNull();
      expect(normalizeHgDate(undefined)).toBeNull();
      expect(normalizeHgDate("invalid-date-xyz")).toBeNull();
    });
  });

  describe("formatHgTicker", () => {
    it("prefixes ticker with B3: and removes .SA suffix", () => {
      expect(formatHgTicker("PETR4")).toBe("B3:PETR4");
      expect(formatHgTicker("PETR4.SA")).toBe("B3:PETR4");
      expect(formatHgTicker("vale3.sa")).toBe("B3:VALE3");
      expect(formatHgTicker("HGLG11")).toBe("B3:HGLG11");
    });
  });

  describe("fetchHgBrasilDividends", () => {
    it("returns null gracefully when no API key is provided", async () => {
      const result = await fetchHgBrasilDividends("PETR4", "");
      expect(result).toBeNull();
    });

    it("fetches and parses dividend records with payment dates correctly", async () => {
      const mockResponse = {
        results: [
          {
            symbol: "B3:PETR4",
            dividends: [
              {
                type: "Dividendo",
                amount: 1.25,
                payment_date: "2024-05-20",
                approved_date: "2024-04-25",
              },
              {
                type: "JCP",
                amount: 0.85,
                payment_date: "15/06/2024",
                approved_date: "2024-05-10",
              },
            ],
          },
        ],
      };

      vi.spyOn(httpModule, "fetchWithTimeout").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as any);

      const result = await fetchHgBrasilDividends("PETR4", "test_key_123");
      expect(result).not.toBeNull();
      expect(result?.ticker).toBe("PETR4");
      expect(result?.dividends.length).toBe(2);
      expect(result?.dividends[0]).toEqual({
        type: "Dividendo",
        amount: 1.25,
        paymentDate: "2024-05-20",
        approvedDate: "2024-04-25",
        lastDatePrior: undefined,
        rate: undefined,
        relatedTo: undefined,
      });
      expect(result?.dividends[1].paymentDate).toBe("2024-06-15");
    });

    it("handles HTTP errors gracefully without throwing", async () => {
      vi.spyOn(httpModule, "fetchWithTimeout").mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      } as any);

      const result = await fetchHgBrasilDividends("VALE3", "invalid_key");
      expect(result).toBeNull();
    });

    it("handles network errors gracefully without crashing", async () => {
      vi.spyOn(httpModule, "fetchWithTimeout").mockRejectedValueOnce(
        new Error("Network timeout after 4000ms"),
      );

      const result = await fetchHgBrasilDividends("TAEE11", "test_key");
      expect(result).toBeNull();
    });
  });

  describe("enrichDividendPaymentDates", () => {
    it("enriches missing payment dates using approvedDate matches", () => {
      const existing = [
        { approvedDate: "2024-04-25", paymentDate: null, amount: 1.25 },
        { approvedDate: "2024-05-10", paymentDate: "2024-06-10", amount: 0.85 }, // already has date
      ];

      const hgDividends = [
        {
          type: "Dividendo",
          amount: 1.25,
          approvedDate: "2024-04-25",
          paymentDate: "2024-05-20",
        },
      ];

      const enriched = enrichDividendPaymentDates(existing, hgDividends);
      expect(enriched[0].paymentDate).toBe("2024-05-20");
      expect(enriched[1].paymentDate).toBe("2024-06-10"); // preserved
    });
  });
});
