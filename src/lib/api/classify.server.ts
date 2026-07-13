import type { AssetType } from "../domain";

const BR_TICKER_RE = /^[A-Z]{4}\d{1,2}$/;

export function isBrTicker(t: string): boolean {
  return BR_TICKER_RE.test(t.toUpperCase().replace(/\.SA$/, ""));
}

export function classifyBr(symbol: string): AssetType {
  const s = symbol.toUpperCase();
  if (s.endsWith("11")) return "FII";
  return "STOCK_BR";
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
  if (/REIT|REALTY|REAL ESTATE/.test(name)) return "REIT";
  if (q.symbol.endsWith(".SA")) return classifyBr(q.symbol.replace(".SA", ""));
  return "STOCK_US";
}
