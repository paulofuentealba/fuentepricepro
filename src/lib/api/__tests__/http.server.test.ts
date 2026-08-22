import { describe, it, expect } from "vitest";
import { sanitizeLogMessage } from "../http.server";

describe("http.server - sanitizeLogMessage (Item 7)", () => {
  it("redacts 'key' parameter from HG Brasil URLs and messages", () => {
    const rawUrl = "https://api.hgbrasil.com/v2/finance/dividends?tickers=B3:PETR4&key=SECRET_KEY_12345";
    const sanitized = sanitizeLogMessage(rawUrl);
    expect(sanitized).toBe("https://api.hgbrasil.com/v2/finance/dividends?tickers=B3:PETR4&key=[REDACTED]");
    expect(sanitized).not.toContain("SECRET_KEY_12345");
  });

  it("redacts 'api_key' parameter from FRED URLs and messages", () => {
    const rawUrl = "https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=abcdef1234567890&file_type=json";
    const sanitized = sanitizeLogMessage(rawUrl);
    expect(sanitized).toBe("https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=[REDACTED]&file_type=json");
    expect(sanitized).not.toContain("abcdef1234567890");
    // Non-sensitive params must remain visible
    expect(sanitized).toContain("series_id=DGS10");
    expect(sanitized).toContain("file_type=json");
  });

  it("redacts token, secret, and auth query parameters", () => {
    const raw = "Fetch failed: https://example.com/api?token=tok_998877&secret=sec_445566&auth=Bearer123&user=john";
    const sanitized = sanitizeLogMessage(raw);
    expect(sanitized).toBe("Fetch failed: https://example.com/api?token=[REDACTED]&secret=[REDACTED]&auth=[REDACTED]&user=john");
    expect(sanitized).not.toContain("tok_998877");
    expect(sanitized).not.toContain("sec_445566");
    expect(sanitized).not.toContain("Bearer123");
    expect(sanitized).toContain("user=john");
  });

  it("safely handles strings without sensitive parameters and non-string inputs", () => {
    expect(sanitizeLogMessage("HTTP 500 Internal Server Error")).toBe("HTTP 500 Internal Server Error");
    expect(sanitizeLogMessage("")).toBe("");
    expect(sanitizeLogMessage(undefined as any)).toBeUndefined();
    expect(sanitizeLogMessage(null as any)).toBeNull();
  });
});
