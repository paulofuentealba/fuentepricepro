import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCvmDividendEvents, _resetCvmDividendsMemoryCache } from "../cvmDividends.server";
import * as adminModule from "../../../integrations/firebase/admin";
import * as ingestionLogModule from "../ingestionLog.server";

describe("cvmDividends.server", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    _resetCvmDividendsMemoryCache();
  });

  it("loads CVM dividend events from bundled local cache as fallback", async () => {
    vi.spyOn(adminModule, "getAdminFirestore").mockReturnValue(null as any);
    const reportSpy = vi.spyOn(ingestionLogModule, "reportIngestionStatus");

    const events = await fetchCvmDividendEvents();
    expect(events.length).toBeGreaterThan(0);

    const bbdc4 = events.find((e) => e.ticker === "BBDC4" && e.dateKey === "2026-10-01");
    expect(bbdc4).toBeDefined();
    expect(bbdc4?.eventType).toBe("pay");
    expect(bbdc4?.taxType).toBe("jcp");

    expect(reportSpy).toHaveBeenCalledWith("cvm_dividends", "PASSED", undefined, expect.stringContaining("events from local cache"));
  });

  it("filters events by specified month", async () => {
    vi.spyOn(adminModule, "getAdminFirestore").mockReturnValue(null as any);

    const octEvents = await fetchCvmDividendEvents(10);
    expect(octEvents.length).toBeGreaterThan(0);
    expect(octEvents.every((e) => e.month === 10)).toBe(true);

    const nonExistentMonth = await fetchCvmDividendEvents(99);
    expect(nonExistentMonth.length).toBe(octEvents.length); // falls back to all events on invalid month
  });

  it("gracefully catches Firestore read errors and falls back to local cache", async () => {
    const mockDb = {
      collection: () => ({
        get: vi.fn().mockRejectedValue(new Error("Firestore connection timeout")),
      }),
    };
    vi.spyOn(adminModule, "getAdminFirestore").mockReturnValue(mockDb as any);
    const reportSpy = vi.spyOn(ingestionLogModule, "reportIngestionStatus");

    const events = await fetchCvmDividendEvents(10);
    expect(events.length).toBeGreaterThan(0);
    expect(reportSpy).toHaveBeenCalledWith(
      "cvm_dividends",
      "WARNING",
      expect.stringContaining("Firestore read error"),
    );
  });
});
