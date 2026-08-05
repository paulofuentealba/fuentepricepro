import type { Asset, AssetType } from "./domain";
import type { WatchlistItem } from "./watchlist";

export function avgDividend(divs: readonly number[]): number {
  if (!divs.length) return 0;
  return divs.reduce((s, v) => s + v, 0) / divs.length;
}

/**
 * Calculates the base annual dividend consistently across the application (SSOT).
 * Computes average across the requested timeframe based ONLY on years with actual data.
 */
export function getCanonicalAnnualDividend(asset: Asset, timeframe: number = 3): number {
  const history = (asset.dividendHistory ?? []).filter((p) => Number.isFinite(p.amount));
  const sorted = [...history].sort((a, b) => b.year - a.year);
  let selected: number[];
  if (sorted.length >= timeframe) {
    // Has enough historical data (at least 'timeframe' years)
    selected = sorted.slice(0, timeframe).map((p) => p.amount);
  } else {
    // If not enough historical years, fallback to dividends3y which has been curated to only include existing data
    selected = [...asset.dividends3y];
  }
  return avgDividend(selected);
}

export function ceilingPrice(avgDiv: number, targetYieldPct: number): number {
  if (!targetYieldPct) return 0;
  return avgDiv / (targetYieldPct / 100);
}

export function safetyMargin(ceiling: number, current: number): number {
  if (typeof current !== "number" || current <= 0) return 0;
  return ((ceiling - current) / current) * 100;
}

/** US withholding tax applied to dividends paid to non-US foreign investors. */
export const US_DIVIDEND_TAX_RATE = 0.3;
/** Brazilian withholding tax applied to JCP (Juros sobre Capital Próprio). */
export const JCP_TAX_RATE = 0.15;

export function isUsAsset(type: AssetType, currency?: string): boolean {
  if (type === "STOCK_US" || type === "REIT") return true;
  if (type === "ETF" && currency === "USD") return true;
  return false;
}

export function dividendTaxRate(
  type: AssetType,
  currency?: string,
  customTaxRate?: number | null,
  isJCP?: boolean,
): number {
  if (typeof customTaxRate === "number" && customTaxRate >= 0) return customTaxRate / 100;
  if (isJCP) return JCP_TAX_RATE;
  return isUsAsset(type, currency) ? US_DIVIDEND_TAX_RATE : 0;
}

/** Apply withholding tax to a gross dividend amount. */
export function netAfterTax(
  gross: number,
  type: AssetType,
  currency?: string,
  customTaxRate?: number | null,
  isJCP?: boolean,
): number {
  return gross * (1 - dividendTaxRate(type, currency, customTaxRate, isJCP));
}

// --- Epic 1: Advanced Valuation (Fuente Consensus) ---

export function grahamPrice(lpa: number, vpa: number): number | null {
  if (typeof lpa !== "number" || typeof vpa !== "number") return null;
  if (lpa <= 0 || vpa <= 0) return null;
  return Math.sqrt(22.5 * lpa * vpa);
}

export const DEFAULT_SELIC = 0.105; // 10.5% as Selic Anchor

export function gordonPrice(
  d1: number,
  k: number = DEFAULT_SELIC,
  g: number = 0.04,
): number | null {
  if (typeof d1 !== "number" || typeof k !== "number" || typeof g !== "number") return null;
  if (k <= g) return null;
  return d1 / (k - g);
}

export function consensusPrice(prices: (number | null | undefined)[]): number | null {
  const validPrices = prices.filter(
    (p): p is number => typeof p === "number" && p > 0 && isFinite(p),
  );
  if (validPrices.length === 0) return null;
  const sum = validPrices.reduce((acc, curr) => acc + curr, 0);
  return sum / validPrices.length;
}

/**
 * Universal valuation engine.
 * Calculates all models and the consensus margin of safety in one place.
 */
export function getAssetValuation({
  targetYield,
  currentPrice,
  avgDividend,
  eps,
  bvps,
  dividendCagr,
  selicPct = 10.5,
  currency,
  type,
  exchangeRate,
}: {
  targetYield: number;
  currentPrice: number;
  avgDividend: number;
  eps?: number | null;
  bvps?: number | null;
  dividendCagr?: number | null;
  selicPct?: number;
  currency: string;
  type: AssetType;
  exchangeRate?: number;
}) {
  // Bypass complex math for Fixed Income
  if (type === "FIXED_INCOME") {
    return {
      bazin: null,
      graham: null,
      gordon: null,
      consensus: null,
      activeCeiling: currentPrice,
      margin: 0,
      positive: true,
    };
  }

  // Apply WHT (Withholding Tax) to dividends for US assets
  const isUS = isUsAsset(type, currency);
  const netAvgDividend = isUS ? avgDividend * (1 - US_DIVIDEND_TAX_RATE) : avgDividend;
  // 1. Bazin Model
  const bazin = targetYield > 0 ? netAvgDividend / (targetYield / 100) : null;

  // 2. Graham Model: Math.sqrt(22.5 * EPS * BVPS)
  const graham = eps && bvps && eps > 0 && bvps > 0 ? Math.sqrt(22.5 * eps * bvps) : null;

  // 3. Gordon Model: NextYearDiv / (DiscountRate - CAGR)
  const k = selicPct / 100;
  const g = dividendCagr ? dividendCagr / 100 : 0; // assuming dividendCagr is in percentage like selicPct
  const nextYearDiv = netAvgDividend * (1 + g);
  const gordon = k > g ? nextYearDiv / (k - g) : null;

  // 4. Consensus & Margin
  const validModels = [bazin, graham, gordon].filter((v): v is number => v !== null && v > 0);
  const consensus =
    validModels.length > 0 ? validModels.reduce((a, b) => a + b, 0) / validModels.length : null;

  const activeCeiling = consensus !== null ? consensus : bazin || 0;
  const margin = currentPrice > 0 ? (activeCeiling / currentPrice - 1) * 100 : 0;

  return { bazin, graham, gordon, consensus, activeCeiling, margin, positive: margin >= 0 };
}

export function calculateFixedIncomeBalance(
  item: WatchlistItem,
  macroRates?: { cdi: number; ipca: number },
): { accruedBalance: number; profit: number } | null {
  if (
    item.type !== "FIXED_INCOME" ||
    !item.startDate ||
    item.averagePrice == null ||
    item.quantity <= 0
  ) {
    return null;
  }

  const rates = macroRates || { cdi: 10.5, ipca: 4.5 };
  const principal = item.averagePrice * item.quantity;
  const start = new Date(item.startDate).getTime();
  const now = Date.now();

  if (start > now) return { accruedBalance: principal, profit: 0 };

  const elapsedDays = (now - start) / (1000 * 60 * 60 * 24);

  let effectiveRate = 0;
  const itemRate = item.rate || 0;
  const indexer = item.indexer?.toUpperCase();

  if (indexer === "CDI") {
    effectiveRate = (rates.cdi / 100) * (itemRate / 100);
  } else if (indexer === "IPCA") {
    effectiveRate = rates.ipca / 100 + itemRate / 100;
  } else {
    // PRE or default
    effectiveRate = itemRate / 100;
  }

  const accruedBalance = principal * Math.pow(1 + effectiveRate, elapsedDays / 365);

  return {
    accruedBalance,
    profit: accruedBalance - principal,
  };
}

export function projectFixedIncomeValueAtMaturity(
  principal: number,
  indexer: string,
  rate: number,
  startDateStr: string,
  maturityDateStr: string,
  macroRates?: { cdi: number; ipca: number },
): { projectedBalance: number; projectedProfit: number } {
  const rates = macroRates || { cdi: 10.5, ipca: 4.5 };

  const start = new Date(startDateStr).getTime();
  const maturity = new Date(maturityDateStr).getTime();

  if (maturity <= start) return { projectedBalance: principal, projectedProfit: 0 };

  const totalDays = (maturity - start) / (1000 * 60 * 60 * 24);

  let effectiveRate = 0;
  const idx = indexer.toUpperCase();

  if (idx === "CDI") {
    effectiveRate = (rates.cdi / 100) * (rate / 100);
  } else if (idx === "IPCA") {
    effectiveRate = rates.ipca / 100 + rate / 100;
  } else {
    // PRE
    effectiveRate = rate / 100;
  }

  const projectedBalance = principal * Math.pow(1 + effectiveRate, totalDays / 365);

  return {
    projectedBalance,
    projectedProfit: projectedBalance - principal,
  };
}
