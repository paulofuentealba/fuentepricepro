import type { AssetType } from "../domain";

const BR_TICKER_RE = /^[A-Z]{4}\d{1,2}$/;

export function isBrTicker(t: string): boolean {
  return BR_TICKER_RE.test(t.toUpperCase().replace(/\.SA$/, ""));
}

export function classifyBr(symbol: string, apiType?: string): AssetType {
  if (apiType) {
    const t = apiType.toLowerCase();
    if (t === "fund" || t === "fii") return "FII";
    if (t === "stock" || t === "equity") return "STOCK_BR";
    if (t === "etf") return "ETF";
    if (t === "bdr") return "STOCK_US"; // Or whatever is appropriate for BDRs
  }
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
