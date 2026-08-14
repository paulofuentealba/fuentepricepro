import type { AssetType } from "../domain";

import { isBrTicker, classifyBr } from "../classify";

export { isBrTicker, classifyBr };

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
