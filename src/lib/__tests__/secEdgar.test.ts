import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchSecEdgarFacts, fetchSecEdgarCompanyFacts, getCikForTicker, _resetCikCacheForTesting } from "../api/secEdgar.server";

// Trimmed real fixture: values pulled directly from SEC EDGAR's live
// https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json (Apple Inc.)
// on 2026-08-11, keeping only the FY2024/FY2025 10-K entries for each tag
// this module reads. Real fixture, not an invented shape — this is exactly
// how SEC EDGAR nests `facts.us-gaap.{Tag}.units.{USD|shares}` entries with
// `start`/`end`/`val`/`fy`/`fp`/`form`/`filed`/`accn`.
const AAPL_COMPANY_FACTS_FIXTURE = {
  facts: {
    "us-gaap": {
      NetIncomeLoss: {
        units: {
          USD: [
            {
              start: "2023-10-01",
              end: "2024-09-28",
              val: 93736000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
            {
              start: "2024-09-29",
              end: "2025-09-27",
              val: 112010000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
          ],
        },
      },
      Assets: {
        units: {
          USD: [
            {
              end: "2024-09-28",
              val: 364980000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
            {
              end: "2025-09-27",
              val: 359241000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
          ],
        },
      },
      NetCashProvidedByUsedInOperatingActivities: {
        units: {
          USD: [
            {
              start: "2023-10-01",
              end: "2024-09-28",
              val: 118254000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
            {
              start: "2024-09-29",
              end: "2025-09-27",
              val: 111482000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
          ],
        },
      },
      LongTermDebtNoncurrent: {
        units: {
          USD: [
            {
              end: "2024-09-28",
              val: 85750000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
            {
              end: "2025-09-27",
              val: 78328000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
          ],
        },
      },
      AssetsCurrent: {
        units: {
          USD: [
            {
              end: "2024-09-28",
              val: 152987000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
            {
              end: "2025-09-27",
              val: 147957000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
          ],
        },
      },
      LiabilitiesCurrent: {
        units: {
          USD: [
            {
              end: "2024-09-28",
              val: 176392000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
            {
              end: "2025-09-27",
              val: 165631000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
          ],
        },
      },
      CommonStockSharesOutstanding: {
        units: {
          shares: [
            {
              end: "2024-09-28",
              val: 15116786000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
            {
              end: "2025-09-27",
              val: 14773260000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
          ],
        },
      },
      // Apple doesn't report GrossProfit directly on recent 10-Ks — it must be
      // derived from Revenues - CostOfGoodsAndServicesSold (real behavior).
      RevenueFromContractWithCustomerExcludingAssessedTax: {
        units: {
          USD: [
            {
              start: "2023-10-01",
              end: "2024-09-28",
              val: 391035000000,
              fy: 2024,
              fp: "FY",
              form: "10-K",
              filed: "2024-11-01",
              accn: "0000320193-24-000123",
            },
            {
              start: "2023-10-01",
              end: "2024-09-28",
              val: 391035000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
            {
              start: "2024-09-29",
              end: "2025-09-27",
              val: 416161000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
          ],
        },
      },
      CostOfGoodsAndServicesSold: {
        units: {
          USD: [
            {
              start: "2023-10-01",
              end: "2024-09-28",
              val: 210352000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
            {
              start: "2024-09-29",
              end: "2025-09-27",
              val: 220960000000,
              fy: 2025,
              fp: "FY",
              form: "10-K",
              filed: "2025-10-31",
              accn: "0000320193-25-000079",
            },
          ],
        },
      },
    },
  },
};

describe("secEdgar.server", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calculates BVPS using the most recent 'end' date fact for equity and shares", async () => {
    const mockTickers = {
      "0": { cik_str: 320193, ticker: "AAPL" },
    };

    const mockCompanyFacts = {
      facts: {
        "us-gaap": {
          StockholdersEquity: {
            units: {
              USD: [
                { end: "2025-03-31", val: 100000000 },
                { end: "2026-06-27", val: 300000000 }, // Most recent
                { end: "2025-12-31", val: 200000000 },
              ],
            },
          },
        },
        dei: {
          EntityCommonStockSharesOutstanding: {
            units: {
              shares: [
                { end: "2025-03-31", val: 10000000 },
                { end: "2026-06-27", val: 15000000 }, // Most recent
                { end: "2025-12-31", val: 20000000 },
              ],
            },
          },
        },
      },
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("company_tickers.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTickers),
        });
      }
      if (url.includes("CIK0000320193.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCompanyFacts),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    const result = await fetchSecEdgarFacts("AAPL");
    // 300,000,000 / 15,000,000 = 20
    expect(result.bvps).toBe(20);
  });

  it("falls back to us-gaap CommonStockSharesOutstanding when dei EntityCommonStockSharesOutstanding is missing", async () => {
    const mockTickers = {
      "0": { cik_str: 320193, ticker: "AAPL" },
    };

    const mockCompanyFacts = {
      facts: {
        "us-gaap": {
          StockholdersEquity: {
            units: {
              USD: [{ end: "2026-06-27", val: 500000000 }],
            },
          },
          CommonStockSharesOutstanding: {
            units: {
              shares: [{ end: "2026-06-27", val: 25000000 }],
            },
          },
        },
      },
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("company_tickers.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTickers),
        });
      }
      if (url.includes("CIK0000320193.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCompanyFacts),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    const result = await fetchSecEdgarFacts("AAPL");
    // 500,000,000 / 25,000,000 = 20
    expect(result.bvps).toBe(20);
  });

  it("returns { bvps: null } gracefully on network/HTTP errors", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("company_tickers.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ "0": { cik_str: 320193, ticker: "AAPL" } }),
        });
      }
      return Promise.resolve({ ok: false, status: 500 });
    }) as any;

    const result = await fetchSecEdgarFacts("AAPL");
    expect(result.bvps).toBeNull();
  });

  it("returns { bvps: null } when ticker is not found in company_tickers.json", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("company_tickers.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ "0": { cik_str: 320193, ticker: "AAPL" } }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    const result = await fetchSecEdgarFacts("UNKNOWN_TICKER");
    expect(result.bvps).toBeNull();
  });

  it("returns { bvps: null } when shares outstanding is zero or missing", async () => {
    const mockTickers = {
      "0": { cik_str: 320193, ticker: "AAPL" },
    };

    const mockCompanyFactsZeroShares = {
      facts: {
        "us-gaap": {
          StockholdersEquity: {
            units: {
              USD: [{ end: "2026-06-27", val: 500000000 }],
            },
          },
          CommonStockSharesOutstanding: {
            units: {
              shares: [{ end: "2026-06-27", val: 0 }],
            },
          },
        },
      },
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("company_tickers.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTickers),
        });
      }
      if (url.includes("CIK0000320193.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCompanyFactsZeroShares),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    const result = await fetchSecEdgarFacts("AAPL");
    expect(result.bvps).toBeNull();
  });
});

describe("fetchSecEdgarCompanyFacts", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("extracts the last 2 fiscal years from a real SEC EDGAR companyfacts response", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("CIK0000320193.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(AAPL_COMPANY_FACTS_FIXTURE),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    const result = await fetchSecEdgarCompanyFacts("0000320193");
    expect(result).not.toBeNull();
    expect(result!.cik).toBe("0000320193");
    expect(result!.years).toHaveLength(2);

    const [fy2025, fy2024] = result!.years;
    expect(fy2025.fiscalYear).toBe(2025);
    expect(fy2025.periodEnd).toBe("2025-09-27");
    expect(fy2025.netIncome).toBe(112010000000);
    expect(fy2025.totalAssets).toBe(359241000000);
    expect(fy2025.operatingCashFlow).toBe(111482000000);
    expect(fy2025.longTermDebt).toBe(78328000000);
    expect(fy2025.currentAssets).toBe(147957000000);
    expect(fy2025.currentLiabilities).toBe(165631000000);
    expect(fy2025.sharesOutstanding).toBe(14773260000);
    expect(fy2025.revenues).toBe(416161000000);
    // Derived: GrossProfit isn't reported directly by Apple, so it must be
    // computed as Revenues - CostOfGoodsAndServicesSold.
    expect(fy2025.grossProfit).toBe(416161000000 - 220960000000);

    expect(fy2024.fiscalYear).toBe(2024);
    expect(fy2024.periodEnd).toBe("2024-09-28");
    expect(fy2024.netIncome).toBe(93736000000);
    expect(fy2024.grossProfit).toBe(391035000000 - 210352000000);
  });

  it("returns null when the response has no us-gaap facts", async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ facts: {} }) }),
    ) as any;

    const result = await fetchSecEdgarCompanyFacts("0000000001");
    expect(result).toBeNull();
  });

  it("returns null on HTTP failure", async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as any;

    const result = await fetchSecEdgarCompanyFacts("0000000001");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    global.fetch = vi.fn().mockImplementation(() => Promise.reject(new Error("network down"))) as any;

    const result = await fetchSecEdgarCompanyFacts("0000000001");
    expect(result).toBeNull();
  });

  describe("getCikForTicker - Failure TTL & Backoff (Item 5)", () => {
    beforeEach(() => {
      _resetCikCacheForTesting();
    });

    afterEach(() => {
      _resetCikCacheForTesting();
      vi.useRealTimers();
    });

    it("does not flood network with N requests during outage within 5-minute failure backoff window", async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      global.fetch = fetchSpy as any;

      // 1st attempt: fails with 404 (non-retryable, 1 network attempt)
      const res1 = await getCikForTicker("AAPL");
      expect(res1).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // 2nd, 3rd, 4th attempts immediately after: must back off without making network calls
      const res2 = await getCikForTicker("MSFT");
      const res3 = await getCikForTicker("GOOGL");
      expect(res2).toBeNull();
      expect(res3).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Still exactly 1 network call!
    });

    it("retries network request after failure backoff TTL expires", async () => {
      let now = 1000000;
      vi.spyOn(Date, "now").mockImplementation(() => now);

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ "0": { cik_str: 320193, ticker: "AAPL" } }),
        });
      }) as any;

      // 1st call fails
      const res1 = await getCikForTicker("AAPL");
      expect(res1).toBeNull();
      expect(callCount).toBe(1);

      // Advance by 4 minutes (< 5 min TTL): backoff active
      now += 4 * 60 * 1000;
      const res2 = await getCikForTicker("AAPL");
      expect(res2).toBeNull();
      expect(callCount).toBe(1);

      // Advance past 5 minutes TTL: retry succeeds
      now += 2 * 60 * 1000;
      const res3 = await getCikForTicker("AAPL");
      expect(res3).toBe("0000320193");
      expect(callCount).toBe(2);
    });
  });
});
