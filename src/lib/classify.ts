import type { AssetType } from "./domain";

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
    if (t === "bdr") return "STOCK_US";
  }
  const s = symbol.toUpperCase();
  if (
    s.endsWith("11") &&
    !s.startsWith("TAEE") &&
    !s.startsWith("KLBN") &&
    !s.startsWith("SANB") &&
    !s.startsWith("TIET") &&
    !s.startsWith("ALUP") &&
    !s.startsWith("SULA") &&
    !s.startsWith("ENGI") &&
    !s.startsWith("BIDI") &&
    !s.startsWith("BPAC")
  ) {
    return "FII";
  }
  return "STOCK_BR";
}
