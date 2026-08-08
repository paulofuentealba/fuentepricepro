import { fetchWithRetry } from "./http.server";

export interface SecEdgarFactsResult {
  bvps: number | null;
}

const SEC_USER_AGENT = 'FuentePricePro contato@fuentepricepro.com';

// Cache in-memory for CIKs
// In a highly scaled environment, move this to Firestore/Redis.
let cikCache: Record<string, string> | null = null;
let cikCacheTimestamp = 0;
const CIK_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getCikForTicker(ticker: string): Promise<string | null> {
  const now = Date.now();

  // Refresh cache if it's empty or expired
  if (!cikCache || now - cikCacheTimestamp > CIK_CACHE_TTL_MS) {
    try {
      const response = await fetchWithRetry(
        'https://www.sec.gov/files/company_tickers.json',
        { headers: { 'User-Agent': SEC_USER_AGENT } },
        { timeoutMs: 5000, retries: 1 }
      );

      if (!response.ok) {
        console.warn(`[SEC EDGAR] Failed to fetch company tickers. Status: ${response.status}`);
        return null;
      }

      const data = await response.json() as Record<string, { cik_str: number, ticker: string }>;
      const newCache: Record<string, string> = {};

      for (const key in data) {
        const item = data[key];
        newCache[item.ticker.toUpperCase()] = String(item.cik_str).padStart(10, '0');
      }

      cikCache = newCache;
      cikCacheTimestamp = now;
    } catch (error) {
      console.error('[SEC EDGAR] Error fetching company tickers:', error);
      return null;
    }
  }

  return cikCache[ticker.toUpperCase()] || null;
}

export async function fetchSecEdgarFacts(ticker: string): Promise<SecEdgarFactsResult> {
  try {
    const cik = await getCikForTicker(ticker);
    
    if (!cik) {
      return { bvps: null };
    }

    const response = await fetchWithRetry(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      { headers: { 'User-Agent': SEC_USER_AGENT } },
      { timeoutMs: 2500, retries: 1 }
    );

    if (!response.ok) {
      console.warn(`[SEC EDGAR] Failed to fetch facts for ${ticker} (CIK: ${cik}). Status: ${response.status}`);
      return { bvps: null };
    }

    const factsData = await response.json() as any;
    const usGaap = factsData?.facts?.['us-gaap'];
    const dei = factsData?.facts?.dei;

    if (!usGaap) {
      return { bvps: null };
    }

    // Extract StockholdersEquity
    const equityUnits = usGaap['StockholdersEquity']?.units?.USD || [];
    if (equityUnits.length === 0) {
      return { bvps: null };
    }

    // Sort by end date descending to get the most recent fact
    equityUnits.sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime());
    const mostRecentEquity = equityUnits[0].val;

    // Extract SharesOutstanding
    // Prefer EntityCommonStockSharesOutstanding from DEI if available, otherwise fallback to us-gaap CommonStockSharesOutstanding
    let sharesUnits = dei?.['EntityCommonStockSharesOutstanding']?.units?.shares || [];
    
    if (sharesUnits.length === 0) {
      sharesUnits = usGaap['CommonStockSharesOutstanding']?.units?.shares || [];
    }
    
    if (sharesUnits.length === 0) {
      return { bvps: null };
    }

    // Sort by end date descending
    sharesUnits.sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime());
    const mostRecentShares = sharesUnits[0].val;

    if (!mostRecentShares || mostRecentShares === 0) {
      return { bvps: null };
    }

    const bvps = mostRecentEquity / mostRecentShares;

    return { bvps };
  } catch (error) {
    console.error(`[SEC EDGAR] Unexpected error fetching facts for ${ticker}:`, error);
    // Never fail the main request because of this enrichment
    return { bvps: null };
  }
}
