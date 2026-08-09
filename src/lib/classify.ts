import type { AssetType } from "./domain";

const BR_TICKER_RE = /^[A-Z]{4}\d{1,2}$/;

export function isBrTicker(t: string): boolean {
  return BR_TICKER_RE.test(t.toUpperCase().replace(/\.SA$/, ""));
}

/**
 * FALLBACK HEURISTIC for B3 asset classification.
 * IMPORTANT: This is a fallback executed ONLY when `apiType` is absent or unhandled.
 * Primary classification relies on `apiType` provided by Brapi/Yahoo APIs.
 *
 * Source for B3 Stock Units (tickers ending in 11 that represent ON+PN share deposit certificates, NOT FII/ETF/FIAGRO):
 * Source: B3 (Bolsa, Brasil, Balcão) - Empresas Listadas / Certificados de Depósito de Ações (Units).
 * Checked date: August 2026.
 * Note: This list should be reviewed periodically when new units are issued or converted.
 */
export const B3_STOCK_UNIT_PREFIXES = new Set([
  // Active B3 Stock Units
  "TAEE", // Taesa (TAEE11)
  "KLBN", // Klabin (KLBN11)
  "SANB", // Santander Brasil (SANB11)
  "BPAC", // BTG Pactual (BPAC11)
  "ENGI", // Energisa (ENGI11)
  "ALUP", // Alupar (ALUP11)
  "SAPR", // Sanepar (SAPR11)
  "IGTI", // Iguatemi (IGTI11)

  // Historical B3 Stock Units (converted/delisted but maintained for historical dataset fallback)
  "CPLE", // Copel (CPLE11 - converted to Novo Mercado in 2023)
  "SULA", // SulAmérica (SULA11 - merged into Rede D'Or in 2022)
  "BIDI", // Banco Inter (BIDI11 - migrated to Nasdaq in 2022)
  "TIET", // AES Tietê (TIET11 - reorganized as AESB3 in 2021)
  "MODL", // Banco Modal (MODL11 - merged into XP in 2022)
  "AURE", // Auren Energia (AURE11 - IPO transition unit in 2022)
  "STBP", // Santos Brasil (STBP11 - converted to Novo Mercado STBP3 in 2016)
  "BMGB", // Banco BMG (BMGB11 - IPO unit in 2019, converted to BMGB4)
]);

export function classifyBr(symbol: string, apiType?: string): AssetType {
  if (apiType) {
    const t = apiType.toLowerCase();
    if (t === "fund" || t === "fii") return "FII";
    if (t === "stock" || t === "equity") return "STOCK_BR";
    if (t === "etf") return "ETF";
    if (t === "bdr") return "STOCK_US";
  }

  const s = symbol.toUpperCase().replace(/\.SA$/, "");
  if (s.endsWith("11")) {
    const prefix = s.slice(0, -2);
    if (!B3_STOCK_UNIT_PREFIXES.has(prefix)) {
      return "FII";
    }
  }

  return "STOCK_BR";
}

export function getShareClassBadge(
  ticker: string,
  type?: string,
): { label: string; className: string } | null {
  const clean = ticker.trim().toUpperCase().replace(/\.SA$/, "");
  if (!clean) return null;

  // BDRs (34 or 35)
  if (/^[A-Z]{4}(34|35)$/.test(clean)) {
    return {
      label: "BDR",
      className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    };
  }
  // Units (11 with Stock type or in B3_STOCK_UNIT_PREFIXES)
  if (
    clean.endsWith("11") &&
    (type === "STOCK_BR" || B3_STOCK_UNIT_PREFIXES.has(clean.slice(0, -2)))
  ) {
    return {
      label: "UNIT",
      className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    };
  }
  // Fractional Lot (...F)
  if (/^[A-Z]{4}\d{1,2}F$/.test(clean)) {
    return {
      label: "Fracionário",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    };
  }
  // ON Stock (...3)
  if (/^[A-Z]{4}3$/.test(clean)) {
    return {
      label: "ON",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  }
  // PN Stock (...4, 5, 6, 7, 8)
  if (/^[A-Z]{4}[4-8]$/.test(clean)) {
    return {
      label: "PN",
      className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    };
  }

  return null;
}

