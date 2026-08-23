/**
 * Single Source of Truth (SSOT) for backend ingestion and oracle cache TTLs.
 * Centralizes all cache durations to ensure consistent, auditable caching policies.
 */

/**
 * Server memory & Firestore cache TTL for live asset quotes and valuation indicators (5 minutes).
 * Kept short because asset market prices and live yields fluctuate during market hours.
 */
export const ASSET_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * In-memory and Firestore cache TTL for Dados de Mercado scraper results (6 hours).
 * Scraped financial statements and indicators change at most once per business day.
 */
export const DADOS_DE_MERCADO_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * In-memory quote cache TTL for HG Brasil API requests (6 hours).
 * Preserves limited HG Brasil monthly API query quotas while keeping quotes reasonable.
 */
export const HG_BRASIL_QUOTA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * In-memory cache TTL for FRED (Federal Reserve Economic Data) macro queries (24 hours).
 * Macro indicators like the US 10-Year Treasury Yield are published once daily.
 */
export const FRED_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Memory and Firestore cache TTL for B3 / HG Brasil asset classification taxonomies (30 days).
 * Asset kinds (FII, FIAGRO, Stock, REIT) and sector definitions are structural and change very rarely.
 */
export const ASSET_CLASSIFICATION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * In-memory cache TTL for SEC EDGAR company-to-CIK mapping catalogue (24 hours).
 * SEC company ticker directories are updated on a daily cadence by SEC.gov.
 */
export const SEC_EDGAR_CIK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Failure backoff TTL for SEC EDGAR requests (5 minutes).
 * Prevents hammering the SEC endpoint upon transient failures.
 */
export const SEC_EDGAR_FAILURE_TTL_MS = 5 * 60 * 1000;

/**
 * Session crumb & cookie authentication TTL for Yahoo Finance scraper (30 minutes).
 * Yahoo crumbs expire periodically and require renegotiation.
 */
export const YAHOO_AUTH_TTL_MS = 30 * 60 * 1000;
