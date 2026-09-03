import type { AssetType } from "./domain";
import { normalizeTicker } from "./ticker";

const BR_TICKER_RE = /^[A-Z]{4}\d{1,2}$/;

export function isBrTicker(t: string): boolean {
  return BR_TICKER_RE.test(normalizeTicker(t));
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

/**
 * B3 ticker suffix table (fallback heuristic, used only when `apiType` is absent):
 *   11        -> FII (unless prefix is a known Stock Unit, see B3_STOCK_UNIT_PREFIXES)
 *   34 / 35   -> NOT handled by this fallback today (relies on `apiType === "bdr"` from the
 *                API instead) — verified as a known gap, not fixed in this round. A BDR of a
 *                stock (e.g. AAPL34) without `apiType` falls through to STOCK_BR below.
 *   39        -> ETF (BDR of a foreign ETF, e.g. BIVB39 = BDR of IVV). Checked BEFORE the
 *                generic fallback so it never lands on STOCK_BR by default.
 * Any ticker ending in "11" that is genuinely an ETF or fund (e.g. IVVB11, BOVA11) is also a
 * known gap of this fallback when `apiType` is missing — it will read as FII. This is an
 * accepted tradeoff of the heuristic (see doc comment above) and unchanged in this round.
 */
export function classifyBr(symbol: string, apiType?: string): AssetType {
  if (apiType) {
    const t = apiType.toLowerCase();
    if (t === "fund" || t === "fii") return "FII";
    if (t === "stock" || t === "equity") return "STOCK_BR";
    if (t === "etf") return "ETF";
    if (t === "bdr") return "STOCK_US";
  }

  const s = normalizeTicker(symbol);

  if (s.endsWith("39")) {
    return "ETF";
  }

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
  const clean = normalizeTicker(ticker);
  if (!clean) return null;

  // BDRs (34 or 35) → chart-1 (orange/brown in light, purple/blue in dark)
  if (/^[A-Z]{4}(34|35)$/.test(clean)) {
    return {
      label: "BDR",
      className: "bg-chart-1/15 text-chart-1 border-chart-1/30",
    };
  }
  // Units (11 with Stock type or in B3_STOCK_UNIT_PREFIXES) → chart-2 (cyan in light, green in dark)
  if (
    clean.endsWith("11") &&
    (type === "STOCK_BR" || B3_STOCK_UNIT_PREFIXES.has(clean.slice(0, -2)))
  ) {
    return {
      label: "UNIT",
      className: "bg-chart-2/15 text-chart-2 border-chart-2/30",
    };
  }
  // Fractional Lot (...F) → chart-3 (blue/purple in light, yellow/orange in dark)
  if (/^[A-Z]{4}\d{1,2}F$/.test(clean)) {
    return {
      label: "Fracionário",
      className: "bg-chart-3/15 text-chart-3 border-chart-3/30",
    };
  }
  // ON Stock (...3) → chart-4 (yellow/green in light, purple/pink in dark)
  if (/^[A-Z]{4}3$/.test(clean)) {
    return {
      label: "ON",
      className: "bg-chart-4/15 text-chart-4 border-chart-4/30",
    };
  }
  // PN Stock (...4, 5, 6, 7, 8) → chart-5 (yellow/orange in light, red in dark)
  if (/^[A-Z]{4}[4-8]$/.test(clean)) {
    return {
      label: "PN",
      className: "bg-chart-5/15 text-chart-5 border-chart-5/30",
    };
  }

  return null;
}

