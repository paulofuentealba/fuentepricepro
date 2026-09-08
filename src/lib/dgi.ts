/**
 * Canonical Single Source of Truth for Dividend Growth Investing (DGI) designations:
 * - Dividend Kings: 50+ consecutive years of annual dividend increases.
 * - Dividend Aristocrats: S&P 500 companies with 25+ consecutive years of annual dividend increases.
 */

export type DgiTier = "king" | "aristocrat";

export interface DgiStatus {
  tier: DgiTier;
  minYears: number;
  badgeLabel: string;
}

// 50+ consecutive years of dividend increases
export const DIVIDEND_KINGS = new Set<string>([
  "ABBV",
  "ABM",
  "ADM",
  "AWR",
  "BDX",
  "BKH",
  "CINF",
  "CL",
  "CWT",
  "DOV",
  "ED",
  "EMR",
  "FRT",
  "FUL",
  "GPC",
  "GWW",
  "HRL",
  "ITW",
  "JNJ",
  "KMB",
  "KO",
  "LANC",
  "LEG",
  "LOW",
  "MGEE",
  "MMM",
  "MSA",
  "NDSN",
  "NFG",
  "NUE",
  "NWN",
  "PEP",
  "PG",
  "PH",
  "PPG",
  "RLI",
  "SCL",
  "SJW",
  "SPGI",
  "SWK",
  "SWX",
  "SYY",
  "TGT",
  "UVV",
  "WMT",
]);

// 25 - 49 consecutive years of dividend increases
export const DIVIDEND_ARISTOCRATS = new Set<string>([
  "AFL",
  "ALB",
  "AMCR",
  "AOS",
  "APD",
  "ATO",
  "BEN",
  "BRO",
  "CAH",
  "CAT",
  "CB",
  "CHD",
  "CHRW",
  "CLX",
  "CTAS",
  "CVX",
  "ECL",
  "ESS",
  "EXPD",
  "GD",
  "IBM",
  "LIN",
  "MCD",
  "MDT",
  "MKC",
  "NEE",
  "O",
  "ODFL",
  "PNR",
  "ROP",
  "ROST",
  "SHW",
  "TROW",
  "WBA",
  "WTRG",
  "XOM",
  "YUM",
]);

/**
 * Returns DGI classification for a ticker if eligible, or null.
 */
export function getDgiStatus(ticker: string): DgiStatus | null {
  if (!ticker) return null;
  const clean = ticker.toUpperCase().trim();

  if (DIVIDEND_KINGS.has(clean)) {
    return {
      tier: "king",
      minYears: 50,
      badgeLabel: "Dividend King (50+ yrs)",
    };
  }

  if (DIVIDEND_ARISTOCRATS.has(clean)) {
    return {
      tier: "aristocrat",
      minYears: 25,
      badgeLabel: "Dividend Aristocrat (25+ yrs)",
    };
  }

  return null;
}
