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
  if (/REIT|REALTY|REAL ESTATE/.test(name)) return "REIT";
  if (q.symbol.endsWith(".SA")) return classifyBr(q.symbol.replace(".SA", ""));
  return "STOCK_US";
}
