import { describe, it, expect, vi, beforeEach } from "vitest";

// Reset module registry before each test to clear the module-level cache
// (cachedTreasury10Y) in fred.server.ts. Without this, a successful fetch in
// one test populates the in-memory cache and subsequent tests return the
// cached value instead of their mocked response.
vi.mock("../http.server", () => ({
  fetchWithTimeout: vi.fn(),
}));

const TWENTY_FIVE_HOURS_MS = 25 * 60 * 60 * 1000;

describe("fred.server — fetchUsTreasury10Y", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 4.25 (DEFAULT_US_TREASURY_10Y) when no FRED API key is set", async () => {
    // Re-import with a fresh module instance so cache is cold
    const { fetchUsTreasury10Y, DEFAULT_US_TREASURY_10Y } = await import("../fred.server");
    const originalEnv = process.env.FRED_API_KEY;
    delete process.env.FRED_API_KEY;

    const result = await fetchUsTreasury10Y(undefined);

    expect(result).toBe(DEFAULT_US_TREASURY_10Y);
    expect(result).toBe(4.25);

    // Restore env
    if (originalEnv !== undefined) process.env.FRED_API_KEY = originalEnv;
  });

  it("returns the parsed yield when FRED API responds with valid observations", async () => {
    const { fetchWithTimeout } = await import("../http.server");
    const { fetchUsTreasury10Y } = await import("../fred.server");
    const mockFetch = vi.mocked(fetchWithTimeout);

    const fredPayload = {
      observations: [
        { date: "2024-01-12", value: "4.73" },
        { date: "2024-01-11", value: "4.70" },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fredPayload,
    } as Response);

    const result = await fetchUsTreasury10Y("FAKE_API_KEY");

    expect(result).toBe(4.73);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("DGS10"),
      {},
      3000,
    );
  });

  it("returns DEFAULT_US_TREASURY_10Y when FRED API responds with HTTP error (non-ok)", async () => {
    const { fetchWithTimeout } = await import("../http.server");
    const { fetchUsTreasury10Y, DEFAULT_US_TREASURY_10Y } = await import("../fred.server");
    const mockFetch = vi.mocked(fetchWithTimeout);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    const result = await fetchUsTreasury10Y("FAKE_API_KEY");

    expect(result).toBe(DEFAULT_US_TREASURY_10Y);
    expect(result).toBe(4.25);
  });

  it("returns DEFAULT_US_TREASURY_10Y when fetchWithTimeout throws (network timeout)", async () => {
    const { fetchWithTimeout } = await import("../http.server");
    const { fetchUsTreasury10Y, DEFAULT_US_TREASURY_10Y } = await import("../fred.server");
    const mockFetch = vi.mocked(fetchWithTimeout);

    mockFetch.mockRejectedValueOnce(new Error("AbortError: signal timed out"));

    const result = await fetchUsTreasury10Y("FAKE_API_KEY");

    expect(result).toBe(DEFAULT_US_TREASURY_10Y);
    expect(result).toBe(4.25);
  });
});
