import { describe, it, expect } from "vitest";
import {
  ASSET_CACHE_TTL_MS,
  DADOS_DE_MERCADO_CACHE_TTL_MS,
  HG_BRASIL_QUOTA_CACHE_TTL_MS,
  FRED_CACHE_TTL_MS,
  ASSET_CLASSIFICATION_CACHE_TTL_MS,
  SEC_EDGAR_CIK_CACHE_TTL_MS,
  SEC_EDGAR_FAILURE_TTL_MS,
  YAHOO_AUTH_TTL_MS,
} from "../cacheConfig.server";

describe("cacheConfig.server SSOT", () => {
  it("defines exact named TTL values consistent with system caching policies", () => {
    // 5 minutes for asset quotes
    expect(ASSET_CACHE_TTL_MS).toBe(5 * 60 * 1000);
    expect(ASSET_CACHE_TTL_MS).toBe(300_000);

    // 6 hours for Dados de Mercado and HG Brasil quota preservation
    expect(DADOS_DE_MERCADO_CACHE_TTL_MS).toBe(6 * 60 * 60 * 1000);
    expect(DADOS_DE_MERCADO_CACHE_TTL_MS).toBe(21_600_000);
    expect(HG_BRASIL_QUOTA_CACHE_TTL_MS).toBe(6 * 60 * 60 * 1000);
    expect(HG_BRASIL_QUOTA_CACHE_TTL_MS).toBe(21_600_000);

    // 24 hours for daily macro/regulatory data
    expect(FRED_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(FRED_CACHE_TTL_MS).toBe(86_400_000);
    expect(SEC_EDGAR_CIK_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(SEC_EDGAR_CIK_CACHE_TTL_MS).toBe(86_400_000);

    // 30 days for structural asset classifications
    expect(ASSET_CLASSIFICATION_CACHE_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(ASSET_CLASSIFICATION_CACHE_TTL_MS).toBe(2_592_000_000);

    // Backoff & session TTLs
    expect(SEC_EDGAR_FAILURE_TTL_MS).toBe(5 * 60 * 1000);
    expect(YAHOO_AUTH_TTL_MS).toBe(30 * 60 * 1000);
  });

  it("maintains proper temporal hierarchy between volatile quotes, daily macro and structural classifications", () => {
    // Quote TTL < Scraper/Quota TTL < Daily Macro TTL < Classification TTL
    expect(ASSET_CACHE_TTL_MS).toBeLessThan(HG_BRASIL_QUOTA_CACHE_TTL_MS);
    expect(HG_BRASIL_QUOTA_CACHE_TTL_MS).toBeLessThan(FRED_CACHE_TTL_MS);
    expect(FRED_CACHE_TTL_MS).toBeLessThan(ASSET_CLASSIFICATION_CACHE_TTL_MS);
  });
});
