import type { AssetType } from "../domain";

import { isBrTicker, classifyBr } from "../classify";
import { fetchHgBrasilClassification } from "./hgBrasilClassification.server";

export { isBrTicker, classifyBr };

/**
 * Asynchronously classifies Brazilian tickers using HG Brasil's canonical B3 classification
 * backed by memory and Firestore caching, falling back to local heuristic `classifyBr`.
 */
export async function classifyBrAsync(
  symbol: string,
  apiType?: string,
): Promise<AssetType> {
  const clean = symbol.toUpperCase().replace(/\.SA$/, "").trim();
  if (!clean) return "STOCK_BR";

  try {
    const hgType = await fetchHgBrasilClassification(clean);
    if (hgType) {
      return hgType;
    }
  } catch (err) {
    console.error(`[classifyBrAsync] HG Brasil classification failed for ${clean}:`, err);
  }

  return classifyBr(clean, apiType);
}

export function classifyYahoo(q: {
  symbol: string;
  quoteType?: string;
  longname?: string;
  shortname?: string;
}): AssetType {
  const t = (q.quoteType || "").toUpperCase();
  const name = `${q.longname || ""} ${q.shortname || ""}`.toUpperCase();
  if (t === "ETF") return "ETF";
  if (t === "MUTUALFUND") return "ETF";
  // Brazilian tickers end with .SA — check FIRST to avoid misclassifying Brazilian REITs (FIIs) as US REITs
  if (q.symbol.endsWith(".SA")) return classifyBr(q.symbol.replace(".SA", ""));
  if (/REIT|REALTY|REAL ESTATE/.test(name)) return "REIT";
  return "STOCK_US";
}

