import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchSecEdgarFacts } from "../api/secEdgar.server";

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
