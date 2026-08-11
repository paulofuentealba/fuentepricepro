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

export function consensusPrice(prices: (number | null | undefined)[]): number | null {
  const validPrices = prices.filter(
    (p): p is number => typeof p === "number" && p > 0 && isFinite(p),
  );
  if (validPrices.length === 0) return null;
  const sum = validPrices.reduce((acc, curr) => acc + curr, 0);
  return sum / validPrices.length;
}

/**
 * Minimum margin spread (k - g) required for Gordon Growth Model.
 * Prevents mathematical singularity explosions when discount rate (Selic) is near CAGR.
 * Default: 2.0 percentage points (0.02).
 */
export const GORDON_MIN_DISCOUNT_MARGIN = 0.02;

/**
 * PENDENTE DE VALIDAÇÃO DE MODELAGEM FINANCEIRA - Aguarda confirmação de Paulo
 * Terminal growth rate for 2-stage Gordon Growth Model (H-Model).
 */
export const GORDON_TERMINAL_GROWTH_RATE = 0.03; // 3.0%

/**
 * PENDENTE DE VALIDAÇÃO DE MODELAGEM FINANCEIRA - Aguarda confirmação de Paulo
 * Horizon in years for the high-growth transition period.
 */
export const GORDON_HIGH_GROWTH_YEARS = 5; // 5 years

/**
 * PENDENTE DE VALIDAÇÃO DE MODELAGEM FINANCEIRA - Aguarda confirmação de Paulo
 * Maximum allowable YoY growth volatility (sample std dev) before flagging Gordon confidence as "low".
 */
export const GORDON_MAX_GROWTH_VOLATILITY = 0.35; // 35%

export function calculateDividendGrowthVolatility(
  history?: readonly { year: number; amount: number }[]
): number | null {
  if (!history || history.length < 3) return null;
  const sorted = [...history]
    .filter((p) => Number.isFinite(p.amount) && p.amount > 0)
    .sort((a, b) => a.year - b.year);
  if (sorted.length < 3) return null;

  const yoyGrowths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].amount;
    const curr = sorted[i].amount;
    if (prev > 0) {
      yoyGrowths.push((curr - prev) / prev);
    }
  }
  if (yoyGrowths.length < 2) return null;

  const mean = yoyGrowths.reduce((sum, v) => sum + v, 0) / yoyGrowths.length;
  const variance =
    yoyGrowths.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (yoyGrowths.length - 1);
  return Math.sqrt(variance);
}

export function gordonPrice(
  d0: number,
  k: number = DEFAULT_SELIC,
  gInitial?: number | null,
  gTerminal: number = GORDON_TERMINAL_GROWTH_RATE,
  years: number = GORDON_HIGH_GROWTH_YEARS
): number | null {
  if (typeof d0 !== "number" || typeof k !== "number" || d0 <= 0) return null;

  // Single-stage fallback if gInitial is null or undefined
  if (gInitial == null) {
    if (k - 0 < GORDON_MIN_DISCOUNT_MARGIN) return null;
    return d0 / k;
  }

  // Singularity guard applies to gTerminal
  if (k - gTerminal < GORDON_MIN_DISCOUNT_MARGIN) return null;

  // H-Model 2-Stage Gordon Valuation
  const h = years / 2; // Half-life (2.5 years for 5-year horizon)
  const terminalValue = (d0 * (1 + gTerminal)) / (k - gTerminal);
  const transitionValue = (d0 * h * (gInitial - gTerminal)) / (k - gTerminal);
  return terminalValue + transitionValue;
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
  dividendHistory,
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
  dividendHistory?: readonly { year: number; amount: number }[];
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
      gordonConfidence: null,
      consensus: null,
      activeCeiling: currentPrice,
      margin: 0,
      dividendYield: 0,
      positive: true,
      isUnavailable: true,
    };
  }

  if (currentPrice <= 0 || avgDividend <= 0) {
    return {
      bazin: null,
      graham: null,
      gordon: null,
      gordonConfidence: null,
      consensus: null,
      activeCeiling: currentPrice > 0 ? currentPrice : 0,
      margin: 0,
      dividendYield: 0,
      positive: true,
      isUnavailable: true,
    };
  }

  // Apply WHT (Withholding Tax) to dividends for US assets
  const isUS = isUsAsset(type, currency);
  const netAvgDividend = isUS ? avgDividend * (1 - US_DIVIDEND_TAX_RATE) : avgDividend;
  // 1. Bazin Model
  const bazin = targetYield > 0 ? netAvgDividend / (targetYield / 100) : null;

  // 2. Graham Model: Math.sqrt(22.5 * EPS * BVPS)
  const graham = eps && bvps && eps > 0 && bvps > 0 ? Math.sqrt(22.5 * eps * bvps) : null;

  // 3. Gordon Model (2-Stage H-Model with Fallback & Volatility Check)
  const k = selicPct / 100;
  const gInitial = dividendCagr != null ? dividendCagr / 100 : null;
  const gordon = gordonPrice(netAvgDividend, k, gInitial);

  const growthVolatility = calculateDividendGrowthVolatility(dividendHistory);
  let gordonConfidence: "high" | "low" | null = null;
  if (gordon !== null) {
    gordonConfidence =
      growthVolatility != null && growthVolatility > GORDON_MAX_GROWTH_VOLATILITY
        ? "low"
        : "high";
  }

  // 4. Consensus & Margin (Robust Median across valid models)
  const validModels = [bazin, graham, gordon].filter((v): v is number => v !== null && v > 0);
  let consensus: number | null = null;
  if (validModels.length > 0) {
    const sorted = [...validModels].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    consensus =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  const isUnavailable = consensus === null && bazin === null;
  const activeCeiling = consensus !== null ? consensus : bazin || 0;
  const margin = (currentPrice > 0 && !isUnavailable) ? (activeCeiling / currentPrice - 1) * 100 : 0;
  const dividendYield = currentPrice > 0 ? (netAvgDividend / currentPrice) * 100 : 0;

  return {
    bazin,
    graham,
    gordon,
    gordonConfidence,
    consensus,
    activeCeiling,
    margin,
    dividendYield,
    positive: margin >= 0,
    isUnavailable,
  };
}

export function calculateBvps(
  bvpsInput?: number | null,
  pbRatio?: number | null,
  currentPrice?: number | null,
): number | null {
  if (bvpsInput != null && bvpsInput > 0) return bvpsInput;
  if (pbRatio != null && pbRatio > 0 && currentPrice != null && currentPrice > 0) {
    return currentPrice / pbRatio;
  }
  return null;
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

// ---------- Piotroski F-Score (US-only, Fase 1) ----------

/** Raw fundamentals for a single fiscal year, as extracted from SEC EDGAR XBRL.
 * Any field may be `null` when the source doesn't report it for that year. */
export interface PiotroskiYearInput {
  netIncome: number | null;
  totalAssets: number | null;
  operatingCashFlow: number | null;
  longTermDebt: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  sharesOutstanding: number | null;
  grossProfit: number | null;
  revenues: number | null;
}

export interface PiotroskiResult {
  /** 0-9, or `null` when fewer than `PIOTROSKI_MIN_CRITERIA_AVAILABLE` of the 9
   * criteria could be calculated — a partial score (e.g. "3 out of 4 known
   * criteria") is misleading displayed as if it were "3 out of 9", so we
   * withhold it entirely below the threshold instead. */
  score: number | null;
  criteria: {
    positiveNetIncome: boolean | null;
    positiveOperatingCashFlow: boolean | null;
    roaImproving: boolean | null;
    cashFlowExceedsNetIncome: boolean | null;
    leverageDecreasing: boolean | null;
    currentRatioImproving: boolean | null;
    noNewShares: boolean | null;
    grossMarginImproving: boolean | null;
    assetTurnoverImproving: boolean | null;
  };
  /** How many of the 9 criteria had enough data (0-9). */
  criteriaAvailable: number;
}

/** Below this many available criteria, `score` is withheld (`null`) rather than
 * shown as a partial score out of 9. Chosen so a score is only ever shown when
 * a clear majority of the 9 criteria were actually computable. */
export const PIOTROSKI_MIN_CRITERIA_AVAILABLE = 6;

function boolIf<T>(value: T | null, predicate: (v: T) => boolean): boolean | null {
  return value === null ? null : predicate(value);
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

function ratioImproved(
  currentNumerator: number | null,
  currentDenominator: number | null,
  priorNumerator: number | null,
  priorDenominator: number | null,
  predicate: (current: number, prior: number) => boolean,
): boolean | null {
  const current = ratio(currentNumerator, currentDenominator);
  const prior = ratio(priorNumerator, priorDenominator);
  return current === null || prior === null ? null : predicate(current, prior);
}

/**
 * Piotroski F-Score: 9 binary fundamental-strength criteria, comparing the
 * current fiscal year against the prior one. Pure function — no I/O.
 */
export function calculatePiotroskiFScore(
  current: PiotroskiYearInput,
  prior: PiotroskiYearInput,
): PiotroskiResult {
  const criteria = {
    positiveNetIncome: boolIf(current.netIncome, (v) => v > 0),
    positiveOperatingCashFlow: boolIf(current.operatingCashFlow, (v) => v > 0),
    roaImproving: ratioImproved(
      current.netIncome,
      current.totalAssets,
      prior.netIncome,
      prior.totalAssets,
      (curr, prev) => curr > prev,
    ),
    cashFlowExceedsNetIncome:
      current.operatingCashFlow === null || current.netIncome === null
        ? null
        : current.operatingCashFlow > current.netIncome,
    leverageDecreasing: ratioImproved(
      current.longTermDebt,
      current.totalAssets,
      prior.longTermDebt,
      prior.totalAssets,
      (curr, prev) => curr < prev,
    ),
    currentRatioImproving: ratioImproved(
      current.currentAssets,
      current.currentLiabilities,
      prior.currentAssets,
      prior.currentLiabilities,
      (curr, prev) => curr > prev,
    ),
    noNewShares:
      current.sharesOutstanding === null || prior.sharesOutstanding === null
        ? null
        : current.sharesOutstanding <= prior.sharesOutstanding,
    grossMarginImproving: ratioImproved(
      current.grossProfit,
      current.revenues,
      prior.grossProfit,
      prior.revenues,
      (curr, prev) => curr > prev,
    ),
    assetTurnoverImproving: ratioImproved(
      current.revenues,
      current.totalAssets,
      prior.revenues,
      prior.totalAssets,
      (curr, prev) => curr > prev,
    ),
  };

  const values = Object.values(criteria);
  const criteriaAvailable = values.filter((v) => v !== null).length;
  const score =
    criteriaAvailable >= PIOTROSKI_MIN_CRITERIA_AVAILABLE
      ? values.reduce((sum, v) => sum + (v === true ? 1 : 0), 0)
      : null;

  return { score, criteria, criteriaAvailable };
}
