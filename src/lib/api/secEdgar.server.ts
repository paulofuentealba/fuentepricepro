import { fetchWithRetry } from "./http.server";
import { reportIngestionStatus } from "./ingestionLog.server";

export interface SecFactUnit {
  end: string;
  val: number;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
  frame?: string;
}

export interface SecFactConcept {
  label?: string;
  description?: string;
  units?: {
    USD?: SecFactUnit[];
    shares?: SecFactUnit[];
    [unit: string]: SecFactUnit[] | undefined;
  };
}

export interface SecEdgarFactsResponse {
  cik?: number;
  entityName?: string;
  facts?: {
    "us-gaap"?: Record<string, SecFactConcept | undefined>;
    dei?: Record<string, SecFactConcept | undefined>;
    [taxonomy: string]: Record<string, SecFactConcept | undefined> | undefined;
  };
}

export interface SecEdgarFactsResult {
  bvps: number | null;
}

/** One fiscal year of raw XBRL facts needed for the Piotroski F-Score. Any field can be
 * `null` when the company doesn't report that tag (or a known fallback tag) for the year. */
export interface FiscalYearFacts {
  fiscalYear: number;
  periodEnd: string;
  netIncome: number | null;
  totalAssets: number | null;
  operatingCashFlow: number | null;
  longTermDebt: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  sharesOutstanding: number | null;
  grossProfit: number | null;
  revenues: number | null;
}

export interface SecEdgarCompanyFacts {
  cik: string;
  /** Most recent fiscal year first. Up to 2 entries. */
  years: FiscalYearFacts[];
}

const SEC_USER_AGENT = 'FuentePricePro contato@fuentepricepro.com';

// Cache in-memory for CIKs
// In a highly scaled environment, move this to Firestore/Redis.
let cikCache: Record<string, string> | null = null;
let cikCacheTimestamp = 0;
const CIK_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getCikForTicker(ticker: string): Promise<string | null> {
  const now = Date.now();

  // Refresh cache if it's empty or expired
  if (!cikCache || now - cikCacheTimestamp > CIK_CACHE_TTL_MS) {
    try {
      const response = await fetchWithRetry(
        'https://www.sec.gov/files/company_tickers.json',
        "secEdgar",
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

/** Returns null and reports FAILED when a US ticker (no .SA suffix) has no SEC CIK.
 *  BR tickers are silently skipped — they are not expected to be in the SEC database. */
function reportCikNotFound(ticker: string): null {
  const isBr = ticker.toUpperCase().endsWith(".SA") ||
    (/^[A-Z]{4}[0-9]{1,2}[FB]?$/).test(ticker.toUpperCase());
  if (!isBr) {
    reportIngestionStatus("secEdgar", "FAILED", "CIK not found for US ticker", ticker);
  }
  return null;
}

export async function fetchSecEdgarFacts(ticker: string): Promise<SecEdgarFactsResult> {
  try {
    const cik = await getCikForTicker(ticker);
    
    if (!cik) {
      return reportCikNotFound(ticker) ?? { bvps: null };
    }

    const response = await fetchWithRetry(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      "secEdgar",
      { headers: { 'User-Agent': SEC_USER_AGENT } },
      { timeoutMs: 2500, retries: 1 }
    );

    if (!response.ok) {
      console.warn(`[SEC EDGAR] Failed to fetch facts for ${ticker} (CIK: ${cik}). Status: ${response.status}`);
      return { bvps: null };
    }

    const factsData = (await response.json()) as SecEdgarFactsResponse;
    const usGaap = factsData?.facts?.["us-gaap"];
    const dei = factsData?.facts?.dei;

    if (!usGaap) {
      reportIngestionStatus("secEdgar", "INVALID", "missing facts['us-gaap']", ticker);
      return { bvps: null };
    }

    // Extract StockholdersEquity
    const equityUnits = usGaap["StockholdersEquity"]?.units?.USD || [];
    if (equityUnits.length === 0) {
      reportIngestionStatus("secEdgar", "INVALID", "missing StockholdersEquity", ticker);
      return { bvps: null };
    }

    // Sort by end date descending to get the most recent fact
    equityUnits.sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
    const mostRecentEquity = equityUnits[0].val;

    // Extract SharesOutstanding
    // Prefer EntityCommonStockSharesOutstanding from DEI if available, otherwise fallback to us-gaap CommonStockSharesOutstanding
    let sharesUnits = dei?.["EntityCommonStockSharesOutstanding"]?.units?.shares || [];

    if (sharesUnits.length === 0) {
      sharesUnits = usGaap["CommonStockSharesOutstanding"]?.units?.shares || [];
    }

    if (sharesUnits.length === 0) {
      reportIngestionStatus("secEdgar", "INVALID", "missing SharesOutstanding", ticker);
      return { bvps: null };
    }

    // Sort by end date descending
    sharesUnits.sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
    const mostRecentShares = sharesUnits[0].val;

    if (!mostRecentShares || mostRecentShares === 0) {
      return { bvps: null };
    }

    const bvps = mostRecentEquity / mostRecentShares;

    reportIngestionStatus("secEdgar", "PASSED", undefined, ticker);
    return { bvps };
  } catch (error) {
    console.error(`[SEC EDGAR] Unexpected error fetching facts for ${ticker}:`, error);
    // Never fail the main request because of this enrichment
    return { bvps: null };
  }
}

interface XbrlFact {
  start?: string;
  end: string;
  val: number;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
}

/**
 * Picks up to `count` annual (10-K, full fiscal year) facts from a raw XBRL
 * units array, deduplicated by period `end` date (a company's own prior-year
 * comparatives appear in multiple filings — keep the one from the most
 * recently filed report). Duration facts (income statement / cash flow tags,
 * which carry `start`+`end`) are further filtered to ~1-year periods so
 * quarterly or restated-multi-year spans aren't picked up by mistake.
 */
function annualFacts(
  units: XbrlFact[] | undefined,
  opts: { instant: boolean },
  count = 2,
): XbrlFact[] {
  if (!Array.isArray(units)) return [];
  let candidates = units.filter(
    (u) => u.form === "10-K" && u.fp === "FY" && typeof u.val === "number",
  );
  if (!opts.instant) {
    candidates = candidates.filter((u) => {
      if (!u.start) return false;
      const days = (new Date(u.end).getTime() - new Date(u.start).getTime()) / 86_400_000;
      return days >= 300 && days <= 380;
    });
  }
  const byEnd = new Map<string, XbrlFact>();
  for (const u of candidates) {
    const existing = byEnd.get(u.end);
    if (!existing || (u.filed ?? "") > (existing.filed ?? "")) byEnd.set(u.end, u);
  }
  return Array.from(byEnd.values())
    .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())
    .slice(0, count);
}

/**
 * Tries each tag in `tagNames`, returning the series whose most recent fact is
 * the most recent overall — not just the first tag with any data. Some
 * companies stop using an older tag after an XBRL taxonomy/ASC change (e.g.
 * Apple reported `Revenues` through fiscal 2018, then switched to
 * `RevenueFromContractWithCustomerExcludingAssessedTax`); picking "first tag
 * with any data" would silently return years-stale figures instead of
 * falling through to the tag the company currently uses.
 */
function pickTag(
  usGaap: Record<string, { units?: Record<string, XbrlFact[]> }> | undefined,
  tagNames: string[],
  unit: "USD" | "shares",
  opts: { instant: boolean },
  count = 2,
): XbrlFact[] {
  let best: XbrlFact[] = [];
  for (const tag of tagNames) {
    const facts = annualFacts(usGaap?.[tag]?.units?.[unit], opts, count);
    if (facts.length === 0) continue;
    if (best.length === 0 || new Date(facts[0].end).getTime() > new Date(best[0].end).getTime()) {
      best = facts;
    }
  }
  return best;
}

function valueAtEnd(series: XbrlFact[], end: string): number | null {
  return series.find((f) => f.end === end)?.val ?? null;
}

/**
 * Fetches SEC EDGAR's `companyfacts` XBRL API and extracts the raw fields
 * needed to compute a Piotroski F-Score for the last 2 complete fiscal
 * years. Each field is independently `null` when the company doesn't
 * report that tag (or a known fallback) for a given year — callers must
 * not assume any field is present.
 *
 * Known coverage gaps: (1) a `null` `longTermDebt` is indistinguishable
 * from a company that has zero long-term debt and simply doesn't report
 * the tag; (2) fiscal years are anchored to whichever of
 * NetIncomeLoss/Assets/AssetsCurrent has data first, and other tags are
 * matched by exact period-end date — a mid-series fiscal calendar change
 * could misalign one field for one year (rare in practice).
 */
export async function fetchSecEdgarCompanyFacts(cik: string): Promise<SecEdgarCompanyFacts | null> {
  try {
    const response = await fetchWithRetry(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      "secEdgar",
      { headers: { "User-Agent": SEC_USER_AGENT } },
      { timeoutMs: 4000, retries: 1 },
    );

    if (!response.ok) {
      console.warn(`[SEC EDGAR] Failed to fetch companyfacts for CIK ${cik}. Status: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      facts?: {
        "us-gaap"?: Record<string, { units?: Record<string, XbrlFact[]> }>;
        dei?: Record<string, { units?: Record<string, XbrlFact[]> }>;
      };
    };
    const usGaap = data.facts?.["us-gaap"];
    const dei = data.facts?.dei;

    if (!usGaap) {
      reportIngestionStatus("secEdgar", "INVALID", "missing facts['us-gaap']", cik);
      return null;
    }

    const netIncome = pickTag(usGaap, ["NetIncomeLoss"], "USD", { instant: false });
    const totalAssets = pickTag(usGaap, ["Assets"], "USD", { instant: true });
    const operatingCashFlow = pickTag(
      usGaap,
      [
        "NetCashProvidedByUsedInOperatingActivities",
        "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
      ],
      "USD",
      { instant: false },
    );
    const longTermDebt = pickTag(usGaap, ["LongTermDebtNoncurrent", "LongTermDebt"], "USD", {
      instant: true,
    });
    const currentAssets = pickTag(usGaap, ["AssetsCurrent"], "USD", { instant: true });
    const currentLiabilities = pickTag(usGaap, ["LiabilitiesCurrent"], "USD", { instant: true });

    let sharesOutstanding = pickTag(usGaap, ["CommonStockSharesOutstanding"], "shares", {
      instant: true,
    });
    if (sharesOutstanding.length === 0) {
      sharesOutstanding = annualFacts(dei?.["EntityCommonStockSharesOutstanding"]?.units?.shares, {
        instant: true,
      });
    }

    const revenues = pickTag(
      usGaap,
      ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax"],
      "USD",
      { instant: false },
    );

    let grossProfit = pickTag(usGaap, ["GrossProfit"], "USD", { instant: false });
    if (grossProfit.length === 0 && revenues.length > 0) {
      const cost = pickTag(usGaap, ["CostOfGoodsAndServicesSold", "CostOfRevenue"], "USD", {
        instant: false,
      });
      if (cost.length > 0) {
        grossProfit = revenues
          .map((rev) => {
            const match = cost.find((c) => c.end === rev.end);
            return match ? { end: rev.end, val: rev.val - match.val } : null;
          })
          .filter((x): x is XbrlFact => x !== null);
      }
    }

    // Anchor the fiscal years off whichever series has data first — most
    // companies report all of these, but pick a resilient order.
    const anchor =
      netIncome.length > 0 ? netIncome : totalAssets.length > 0 ? totalAssets : currentAssets;

    if (anchor.length === 0) {
      reportIngestionStatus("secEdgar", "INVALID", "no annual 10-K facts found", cik);
      return null;
    }

    const years: FiscalYearFacts[] = anchor.slice(0, 2).map((a) => ({
      fiscalYear: new Date(a.end).getUTCFullYear(),
      periodEnd: a.end,
      netIncome: valueAtEnd(netIncome, a.end),
      totalAssets: valueAtEnd(totalAssets, a.end),
      operatingCashFlow: valueAtEnd(operatingCashFlow, a.end),
      longTermDebt: valueAtEnd(longTermDebt, a.end),
      currentAssets: valueAtEnd(currentAssets, a.end),
      currentLiabilities: valueAtEnd(currentLiabilities, a.end),
      sharesOutstanding: valueAtEnd(sharesOutstanding, a.end),
      grossProfit: valueAtEnd(grossProfit, a.end),
      revenues: valueAtEnd(revenues, a.end),
    }));

    reportIngestionStatus("secEdgar", "PASSED", undefined, cik);
    return { cik, years };
  } catch (error) {
    console.error(`[SEC EDGAR] Unexpected error fetching companyfacts for CIK ${cik}:`, error);
    reportIngestionStatus(
      "secEdgar",
      "ERROR",
      error instanceof Error ? error.message : String(error),
      cik,
    );
    return null;
  }
}
