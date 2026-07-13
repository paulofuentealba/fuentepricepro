import type { AssetType } from "./domain";

export function avgDividend(divs: readonly number[]): number {
  if (!divs.length) return 0;
  return divs.reduce((s, v) => s + v, 0) / divs.length;
}

export function ceilingPrice(avgDiv: number, targetYieldPct: number): number {
  if (!targetYieldPct) return 0;
  return avgDiv / (targetYieldPct / 100);
}

export function safetyMargin(ceiling: number, current: number): number {
  if (typeof current !== 'number' || current <= 0) return 0;
  return ((ceiling - current) / current) * 100;
}

/** US withholding tax applied to dividends paid to non-US foreign investors. */
export const US_DIVIDEND_TAX_RATE = 0.30;

export function isUsAsset(type: AssetType, currency?: string): boolean {
  if (type === "STOCK_US" || type === "REIT") return true;
  if (type === "ETF" && currency === "USD") return true;
  return false;
}

export function dividendTaxRate(type: AssetType, currency?: string, customTaxRate?: number | null): number {
  if (typeof customTaxRate === "number" && customTaxRate >= 0) return customTaxRate / 100;
  return isUsAsset(type, currency) ? US_DIVIDEND_TAX_RATE : 0;
}

/** Apply withholding tax to a gross dividend amount. */
export function netAfterTax(gross: number, type: AssetType, currency?: string, customTaxRate?: number | null): number {
  return gross * (1 - dividendTaxRate(type, currency, customTaxRate));
}


