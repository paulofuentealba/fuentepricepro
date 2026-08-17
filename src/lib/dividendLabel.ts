import type { AssetType } from "./domain";
import type { en } from "./i18n/dict.en";

/**
 * Standardizes the display label for dividend / income distributions
 * according to the specific legal and market nature of each asset class:
 * - STOCK_BR: "JCP" (if Juros sobre Capital Próprio) or "Dividendo"
 * - STOCK_US / REIT: "Dividend" (true corporate dividend)
 * - FII / FII_INFRA / FIAGRO: "Rendimento" (fund income distribution)
 * - ETF: "Distribuição" / "Distribution"
 */
export function getDividendTypeLabel(
  type: AssetType,
  isJCP?: boolean,
  t?: typeof en,
): string {
  if (isJCP) {
    return t?.watchlist?.jcp ?? "JCP";
  }

  if (type === "FII" || type === "FII_INFRA" || type === "FIAGRO") {
    return t?.watchlist?.rendimento ?? "Rendimento";
  }

  if (type === "ETF") {
    return t?.watchlist?.distribuicao ?? "Distribuição";
  }

  return t?.watchlist?.dividend ?? "Dividendo";
}
