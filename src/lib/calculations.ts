import type { Asset, AssetType } from "./domain";
import type { WatchlistItem } from "./watchlist";
import type { BenchmarkPoint } from "./benchmark";
import { getDisplayAssetType } from "./formatters";
import {
  SELIC_FALLBACK,
  SELIC_DECIMAL,
  IPCA_FALLBACK,
  MACRO_RATES_FALLBACK,
  US_TREASURY_10Y_FALLBACK,
  US_COST_OF_EQUITY_FALLBACK,
  US_TERMINAL_GROWTH_FALLBACK,
  NTN_B_FLOOR_FALLBACK,
  REIT_TREASURY_SPREAD_FALLBACK,
} from "./macroDefaults";

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
    selected = [...(asset.dividends3y ?? [])];
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

/** Yield on Cost: gross annual dividend per share as a percentage of average purchase price. */
export function yieldOnCost(
  annualDividend: number,
  averagePrice: number | null | undefined,
): number | null {
  if (averagePrice == null || averagePrice <= 0) return null;
  return (annualDividend / averagePrice) * 100;
}

export type TargetYieldSource = "item" | "class" | "global";

export interface ResolvedTargetYield {
  effectiveYield: number;
  source: TargetYieldSource;
}

/**
 * Market reference yields per asset class for informational display.
 * Purely for visual guidance in UI — NOT silently applied as saved user defaults.
 */
export const CLASS_MARKET_REFERENCE_YIELDS: Record<AssetType, number> = {
  STOCK_BR: 6.0,
  STOCK_US: 4.0,
  FII: 8.0,
  REIT: 4.0,
  ETF: 4.0,
  FII_INFRA: 8.0,
  FIAGRO: 8.0,
  FIXED_INCOME: 10.0,
};

/**
 * Pure function resolving target yield according to the 3-level hierarchy:
 * 1º Nível (Específico do Ativo): item.targetYield manual se customizado no ativo individual (> 0).
 * 2º Nível (Classe do Ativo): classTargetYields[item.type] se configurado (> 0).
 * 3º Nível (Global / Fallback): settings.targetYield global (default 6.0%).
 */
export function resolveTargetYield(
  item: { type: AssetType; targetYield?: number | null } | { type: AssetType; customTargetYield?: number | null },
  settings?: { targetYield?: number; classTargetYields?: Partial<Record<AssetType, number>> | null } | null,
): ResolvedTargetYield {
  // 1º Nível (Específico do Ativo): item.targetYield manual se customizado no ativo individual (> 0)
  const itemYield = "targetYield" in item ? item.targetYield : (item as any).customTargetYield;
  if (typeof itemYield === "number" && itemYield > 0 && Number.isFinite(itemYield)) {
    return { effectiveYield: itemYield, source: "item" };
  }

  // 2º Nível (Classe do Ativo): classTargetYields[item.type] se configurado (> 0)
  // FII_INFRA/FIAGRO are grouped into FII here (same SSOT grouping used across the app).
  const classYield = settings?.classTargetYields?.[getDisplayAssetType(item.type)];
  if (typeof classYield === "number" && classYield > 0 && Number.isFinite(classYield)) {
    return { effectiveYield: classYield, source: "class" };
  }

  // 3º Nível (Global / Fallback): settings.targetYield global (default 6.0%)
  const globalYield =
    typeof settings?.targetYield === "number" && settings.targetYield > 0 && Number.isFinite(settings.targetYield)
      ? settings.targetYield
      : 6.0;

  return { effectiveYield: globalYield, source: "global" };
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

export const DEFAULT_SELIC = SELIC_DECIMAL; // 10.5% as Selic Anchor

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
 * Fallback terminal growth rate for the 2-stage Gordon Growth Model (H-Model),
 * used when the dynamic rate (IPCA médio dos últimos 5 anos, fetched via
 * `fetchIpcaFiveYearAverage` in `benchmark.server.ts`) is unavailable —
 * network failure, or a cold cache on first load before the query resolves.
 * Not a pending decision anymore: Paulo confirmed inflation-anchored terminal
 * growth as the model, this constant is just its safety net.
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

/**
 * Reconstructs the yearly closing price for each year present in
 * `dividendHistory` from `priceHistory` (as returned by
 * `fetchAssetPriceHistoryFn`/`assetPriceHistoryQueryOptions` — the same
 * series already built for the Comparador chart), and computes
 * `yield_ano = dividendo_ano / preço_de_fechamento_do_ano` for every year
 * where both a dividend and a price point are available.
 *
 * `priceHistory` points carry `cumulativeReturnPct` (return since the
 * series' first point), not an absolute price — see `BenchmarkPoint` /
 * `calculatePriceCumulativeReturn` in `benchmark.ts`. To recover an
 * absolute price we anchor the series to `currentPrice` (the live quote,
 * known separately): `basePrice = currentPrice / (1 + lastReturnPct/100)`,
 * then `price_t = basePrice * (1 + returnPct_t/100)` for any point `t`.
 *
 * Decision: uses each year's LAST available price point (closing price of
 * the year) rather than an intra-year average — simpler to derive from the
 * series (no need to bucket/average many daily points per year) and
 * matches how "yield at year-end" is usually read.
 *
 * Same `length >= 3` reliability guard as `calculateDividendGrowthVolatility`:
 * fewer than 3 years with both dividend and price data returns `null`
 * (indeterminate), never a misleadingly precise average from 1-2 points.
 */
export function calculateHistoricalYieldAverage(
  dividendHistory?: readonly { year: number; amount: number }[],
  priceHistory?: readonly BenchmarkPoint[],
  currentPrice?: number | null,
): number | null {
  if (!dividendHistory || dividendHistory.length < 3) return null;
  if (!priceHistory || priceHistory.length === 0) return null;
  if (typeof currentPrice !== "number" || !Number.isFinite(currentPrice) || currentPrice <= 0) {
    return null;
  }

  const sortedPrices = [...priceHistory]
    .filter((p) => p && typeof p.date === "string" && Number.isFinite(p.cumulativeReturnPct))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (sortedPrices.length === 0) return null;

  const lastReturnPct = sortedPrices[sortedPrices.length - 1].cumulativeReturnPct;
  const basePriceDenominator = 1 + lastReturnPct / 100;
  if (basePriceDenominator <= 0) return null;
  const basePrice = currentPrice / basePriceDenominator;
  if (!Number.isFinite(basePrice) || basePrice <= 0) return null;

  // Last price point available in each calendar year = that year's closing price.
  const closingPriceByYear = new Map<number, number>();
  for (const point of sortedPrices) {
    const year = Number.parseInt(point.date.slice(0, 4), 10);
    if (!Number.isFinite(year)) continue;
    const price = basePrice * (1 + point.cumulativeReturnPct / 100);
    if (price > 0) closingPriceByYear.set(year, price); // later points overwrite earlier ones (sorted asc)
  }

  // Expressed in percent (e.g. 5.2), same convention as `dividendYield` /
  // `targetYield` elsewhere in this module — NOT a raw 0-1 fraction.
  const yields: number[] = [];
  for (const { year, amount } of dividendHistory) {
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const closingPrice = closingPriceByYear.get(year);
    if (closingPrice == null || closingPrice <= 0) continue;
    yields.push((amount / closingPrice) * 100);
  }

  if (yields.length < 3) return null;
  return yields.reduce((sum, v) => sum + v, 0) / yields.length;
}

/**
 * Yield-trap check (Paulo, prompt 79): flags when the CURRENT dividend
 * yield is more than 2x the asset's own 5-year historical yield average —
 * a red flag that the "high yield" may be a shrinking price / unsustainable
 * payout rather than real income. Returns `null` (indeterminate) whenever
 * `historicalYieldAverage` is `null`, never a default `false` — we must
 * never claim "not a trap" without enough data to know.
 */
export function isYieldTrap(
  currentYield: number | null | undefined,
  historicalYieldAverage: number | null | undefined,
): boolean | null {
  if (
    typeof currentYield !== "number" ||
    !Number.isFinite(currentYield) ||
    typeof historicalYieldAverage !== "number" ||
    !Number.isFinite(historicalYieldAverage) ||
    historicalYieldAverage <= 0
  ) {
    return null;
  }
  return currentYield > historicalYieldAverage * 2;
}

/**
 * Shareholder Yield = (dividendsPaid + netBuybacks) / marketCap, where
 * netBuybacks is derived from the year-over-year change in shares
 * outstanding (no separate buyback $ figure is available): a decrease in
 * shares outstanding is a net buyback (positive contribution), an increase
 * is net issuance (negative contribution) — valued at `pricePerShare`.
 *
 * Data source (prompt 79 investigation): `fetchSecEdgarCompanyFacts` already
 * fetches `CommonStockSharesOutstanding` (used for the Piotroski F-Score)
 * for up to 2 fiscal years — US tickers only (SEC EDGAR has no BR coverage).
 * BR assets are out of scope for this metric in this round; callers should
 * pass `null` for BR tickers rather than fabricate a value.
 *
 * Returns `null` (not `0`) whenever any required input is missing/invalid —
 * never asserts a shareholder yield without real data behind it.
 *
 * @returns Shareholder yield in percentage (e.g. 5.2 for 5.2%), matching targetYield and dividendYield scale, or null if data is insufficient.
 */
export function calculateShareholderYield({
  dividendsPaidTotal,
  sharesOutstandingCurrent,
  sharesOutstandingPrior,
  pricePerShare,
  marketCap,
}: {
  dividendsPaidTotal: number | null | undefined;
  sharesOutstandingCurrent: number | null | undefined;
  sharesOutstandingPrior: number | null | undefined;
  pricePerShare: number | null | undefined;
  marketCap: number | null | undefined;
}): number | null {
  if (
    typeof dividendsPaidTotal !== "number" ||
    !Number.isFinite(dividendsPaidTotal) ||
    typeof sharesOutstandingCurrent !== "number" ||
    !Number.isFinite(sharesOutstandingCurrent) ||
    typeof sharesOutstandingPrior !== "number" ||
    !Number.isFinite(sharesOutstandingPrior) ||
    typeof pricePerShare !== "number" ||
    !Number.isFinite(pricePerShare) ||
    pricePerShare <= 0 ||
    typeof marketCap !== "number" ||
    !Number.isFinite(marketCap) ||
    marketCap <= 0
  ) {
    return null;
  }

  const netBuybackValue = (sharesOutstandingPrior - sharesOutstandingCurrent) * pricePerShare;
  return ((dividendsPaidTotal + netBuybackValue) / marketCap) * 100;
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
    if (k < GORDON_MIN_DISCOUNT_MARGIN) return null;
    const price = d0 / k;
    return price > 0 ? price : null;
  }

  // Singularity guard applies to gTerminal
  if (k - gTerminal < GORDON_MIN_DISCOUNT_MARGIN) return null;

  // H-Model 2-Stage Gordon Valuation
  const h = years / 2; // Half-life (2.5 years for 5-year horizon)
  const terminalValue = (d0 * (1 + gTerminal)) / (k - gTerminal);
  const transitionValue = (d0 * h * (gInitial - gTerminal)) / (k - gTerminal);
  const total = terminalValue + transitionValue;
  return total > 0 ? total : null;
}

/**
 * SSOT for the Fuente Consensus: the strict median across whichever
 * valuation models are applicable for a given asset type/currency (each
 * `valuateXxx` function passes its own subset — e.g. [bazin, graham, gordon]
 * for STOCK_BR, [bazin, gordon, pvpCeiling] for FII). Only positive, non-null
 * model outputs count; returns null when no model produced a usable value.
 */
export function medianConsensus(models: (number | null)[]): number | null {
  const validModels = models.filter((v): v is number => v !== null && v > 0);
  if (validModels.length === 0) return null;
  const sorted = [...validModels].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * SSOT for Gordon-model confidence: "low" when the asset's dividend growth
 * history is too volatile for the perpetuity-growth assumption to be
 * trustworthy, "high" otherwise, and null whenever Gordon itself is null
 * (nothing to have confidence about).
 */
export function resolveGordonConfidence(
  gordon: number | null,
  dividendHistory: Parameters<typeof calculateDividendGrowthVolatility>[0],
): "high" | "low" | null {
  if (gordon === null) return null;
  const growthVolatility = calculateDividendGrowthVolatility(dividendHistory);
  return growthVolatility != null && growthVolatility > GORDON_MAX_GROWTH_VOLATILITY
    ? "low"
    : "high";
}

/**
 * Universal valuation engine.
 * Calculates all models and the consensus margin of safety in one place.
 */
// --- ADR-002: Valuation Contracts & Specialized Dispatcher ---

export interface ValuationAssumption {
  key: string;
  label: string;
  helperText: string;
  value: number;
  isCustomized: boolean;
  suggestedRange: { min: number; max: number };
  confidenceBadge: 1 | 2 | 3 | 4;
}

export interface ValuationResult {
  ticker: string;
  activeCeiling: number;
  margin: number;
  fuenteConsensus: number | null;
  methods: {
    bazin: number | null;
    graham: number | null;
    gordon: number | null;
    shareholderYield?: number | null;
    affoYield?: number | null;
    bogleModel?: number | null;
    /** Modified Peter Lynch fair value. Populated for STOCK_US and STOCK_BR;
     * null for FII/REIT/ETF, which have no per-share/per-quota EPS to feed the formula. */
    lynch?: number | null;
  };
  assumptions: ValuationAssumption[];
  investorProfile: "conservative" | "moderate" | "aggressive" | "custom";
  // Backward compatibility fields for existing UI consumers
  bazin: number | null;
  graham: number | null;
  gordon: number | null;
  lynch: number | null;
  gordonConfidence: "high" | "low" | null;
  consensus: number | null;
  dividendYield: number;
  positive: boolean;
  isUnavailable: boolean;
  yieldTrapWarning: ReturnType<typeof isYieldTrap>;
  shareholderYield: number | null;
}

export interface AssetValuationParams {
  ticker?: string;
  targetYield: number;
  currentPrice: number;
  avgDividend: number;
  eps?: number | null;
  bvps?: number | null;
  dividendCagr?: number | null;
  dividendHistory?: readonly { year: number; amount: number }[];
  selicPct?: number;
  terminalGrowthRate?: number;
  currency: string;
  type: AssetType;
  historicalYieldAverage?: number | null;
  shareholderYield?: number | null;
  customTaxRate?: number | null;
  isJCP?: boolean;
  roe?: number | null;
  payoutRatio?: number | null;
  grahamMultiplier?: number;
  usTreasury10Y?: number | null;
  affo?: number | null;
}

/**
 * Specialized Valuation for Brazilian Stocks (STOCK_BR)
 * Implements net JCP deduction (15% WHT), configurable Graham safety margin,
 * and 2-stage Gordon H-Model with ROE/Retention growth.
 */
export function valuateStockBR(params: AssetValuationParams): ValuationResult {
  const {
    ticker = "STOCK_BR",
    targetYield,
    currentPrice,
    avgDividend,
    eps,
    bvps,
    dividendCagr,
    dividendHistory,
    selicPct = SELIC_FALLBACK,
    terminalGrowthRate,
    currency,
    historicalYieldAverage,
    customTaxRate,
    isJCP,
    roe,
    payoutRatio,
    grahamMultiplier = 22.5,
  } = params;

  if (currentPrice <= 0 || avgDividend <= 0) {
    return {
      ticker,
      activeCeiling: currentPrice > 0 ? currentPrice : 0,
      margin: 0,
      fuenteConsensus: null,
      methods: {
        bazin: null,
        graham: null,
        gordon: null,
      },
      assumptions: [],
      investorProfile: "moderate",
      bazin: null,
      graham: null,
      gordon: null,
      lynch: null,
      gordonConfidence: null,
      consensus: null,
      dividendYield: 0,
      positive: true,
      isUnavailable: true,
      yieldTrapWarning: null,
      shareholderYield: null,
    };
  }

  // 1. Bazin with Net JCP Withholding Tax Deduction (15%)
  const netAvgDividend = netAfterTax(avgDividend, "STOCK_BR", currency, customTaxRate, isJCP);
  const bazin = targetYield > 0 ? netAvgDividend / (targetYield / 100) : null;

  // 2. Graham Model with Configurable Safety Multiplier
  const hasCvmAudit = eps != null && bvps != null && eps > 0 && bvps > 0;
  const graham = hasCvmAudit ? Math.sqrt(grahamMultiplier * eps * bvps) : null;

  // 3. Gordon Model (2-Stage H-Model with ROE Retention Growth)
  const k = selicPct / 100;
  let gInitial: number | null = null;
  if (dividendCagr != null) {
    gInitial = dividendCagr / 100;
  } else if (roe != null && roe > 0) {
    const retention = 1 - (payoutRatio ?? 50) / 100;
    gInitial = Math.max(0, Math.min(0.25, (roe / 100) * retention));
  }

  const gTerminal = terminalGrowthRate ?? GORDON_TERMINAL_GROWTH_RATE;
  const gordon = gordonPrice(netAvgDividend, k, gInitial, gTerminal);

  const gordonConfidence = resolveGordonConfidence(gordon, dividendHistory);

  // 4. Fuente Consensus (Strict Median of Applicable Methods for STOCK_BR)
  const consensus = medianConsensus([bazin, graham, gordon]);

  const isUnavailable = consensus === null && bazin === null;
  const activeCeiling = consensus !== null ? consensus : bazin || 0;
  const margin = currentPrice > 0 && !isUnavailable ? (activeCeiling / currentPrice - 1) * 100 : 0;
  const dividendYield = currentPrice > 0 ? (netAvgDividend / currentPrice) * 100 : 0;
  const yieldTrapWarning = isYieldTrap(dividendYield, historicalYieldAverage ?? null);

  // 5. Assumptions Array with Result-Oriented Copy & Confidence Badges
  const assumptions: ValuationAssumption[] = [
    {
      key: "targetYield",
      label: "Retorno anual em dividendos exigido (Bazin)",
      helperText: "Yield mínimo anual líquido exigido sobre o preço pago pelo ativo",
      value: targetYield,
      isCustomized: targetYield !== 6,
      suggestedRange: { min: 4, max: 12 },
      confidenceBadge: 4,
    },
    {
      key: "grahamMultiplier",
      label: "Multiplicador de segurança patrimonial (Graham)",
      helperText: "Limite clássico de P/L (15x) × P/VP (1.5x) para empresas lucrativas",
      value: grahamMultiplier,
      isCustomized: grahamMultiplier !== 22.5,
      suggestedRange: { min: 15, max: 30 },
      confidenceBadge: hasCvmAudit ? 4 : 2,
    },
    {
      key: "discountRate",
      label: "Taxa de desconto da economia (Selic)",
      helperText: "Custo de oportunidade soberano livre de risco ancorado na taxa Selic meta",
      value: selicPct,
      isCustomized: selicPct !== SELIC_FALLBACK,
      suggestedRange: { min: 8, max: 15 },
      confidenceBadge: 4,
    },
    {
      key: "terminalGrowth",
      label: "Crescimento perpétuo ancorado na inflação (IPCA 5a)",
      helperText: "Taxa de crescimento terminal da economia brasileira no modelo H-Model",
      value: Number((gTerminal * 100).toFixed(2)),
      isCustomized: terminalGrowthRate != null && terminalGrowthRate !== GORDON_TERMINAL_GROWTH_RATE,
      suggestedRange: { min: 2, max: 6 },
      confidenceBadge: 4,
    },
  ];

  return {
    ticker,
    activeCeiling,
    margin,
    fuenteConsensus: consensus,
    methods: {
      bazin,
      graham,
      gordon,
    },
    assumptions,
    investorProfile: "moderate",
    bazin,
    graham,
    gordon,
    lynch: null,
    gordonConfidence,
    consensus,
    dividendYield,
    positive: margin >= 0,
    isUnavailable,
    yieldTrapWarning,
    shareholderYield: null,
  };
}

/**
 * Specialized Valuation for US Stocks (STOCK_US)
 * Implements Total Shareholder Yield (dividends + buybacks from SEC EDGAR float variation),
 * Modified Peter Lynch Model (PEG + Dividend Yield), 30% WHT, and Multi-Stage Gordon for Dividend Aristocrats.
 */
export function valuateStockUS(params: AssetValuationParams): ValuationResult {
  const {
    ticker = "STOCK_US",
    targetYield,
    currentPrice,
    avgDividend,
    eps,
    dividendCagr,
    dividendHistory,
    currency = "USD",
    historicalYieldAverage,
    customTaxRate,
    shareholderYield,
    terminalGrowthRate = US_TERMINAL_GROWTH_FALLBACK, // 2.5% US long-term inflation anchor
  } = params;

  if (currentPrice <= 0 || avgDividend <= 0) {
    return {
      ticker,
      activeCeiling: currentPrice > 0 ? currentPrice : 0,
      margin: 0,
      fuenteConsensus: null,
      methods: {
        bazin: null,
        graham: null,
        gordon: null,
        shareholderYield: null,
        lynch: null,
      },
      assumptions: [],
      investorProfile: "moderate",
      bazin: null,
      graham: null,
      gordon: null,
      lynch: null,
      gordonConfidence: null,
      consensus: null,
      dividendYield: 0,
      positive: true,
      isUnavailable: true,
      yieldTrapWarning: null,
      shareholderYield: null,
    };
  }

  // 1. Net Dividend after US Withholding Tax (30% or custom)
  const netAvgDividend = netAfterTax(avgDividend, "STOCK_US", currency, customTaxRate);

  // 2. Bazin Model (US Adapted)
  const bazin = targetYield > 0 ? netAvgDividend / (targetYield / 100) : null;

  // 3. Total Shareholder Yield Ceiling
  // Combines dividend yield with SEC EDGAR buyback yield
  let shareholderYieldPrice: number | null = null;
  if (shareholderYield != null && shareholderYield > 0 && targetYield > 0) {
    shareholderYieldPrice = currentPrice * (shareholderYield / targetYield);
  }

  // 4. Modified Peter Lynch Fair Value: EPS * (Growth Rate + Dividend Yield)
  let lynchPrice: number | null = null;
  if (eps != null && eps > 0 && currentPrice > 0) {
    const rawDy = (netAvgDividend / currentPrice) * 100;
    const effectiveGrowth = dividendCagr != null && dividendCagr > 0 ? dividendCagr : 6.0;
    const lynchMultiplier = Math.min(25, Math.max(5, effectiveGrowth + rawDy));
    lynchPrice = eps * lynchMultiplier;
  }

  // 5. Multi-Stage Gordon for Dividend Aristocrats
  // US cost of equity ~8.5% (Treasury 10y ~4.25% + ERP ~4.25%)
  const usDiscountRate = US_COST_OF_EQUITY_FALLBACK;
  const gInitial = dividendCagr != null ? Math.min(0.15, dividendCagr / 100) : 0.06;
  const gTerminal = terminalGrowthRate ?? US_TERMINAL_GROWTH_FALLBACK;
  const gordon = gordonPrice(netAvgDividend, usDiscountRate, gInitial, gTerminal);

  const gordonConfidence = resolveGordonConfidence(gordon, dividendHistory);

  // 6. Fuente Consensus (Strict Median across valid STOCK_US methods)
  const consensus = medianConsensus([bazin, shareholderYieldPrice, lynchPrice, gordon]);

  const isUnavailable = consensus === null && bazin === null;
  const activeCeiling = consensus !== null ? consensus : bazin || 0;
  const margin = currentPrice > 0 && !isUnavailable ? (activeCeiling / currentPrice - 1) * 100 : 0;
  const dividendYield = currentPrice > 0 ? (netAvgDividend / currentPrice) * 100 : 0;
  const yieldTrapWarning = isYieldTrap(dividendYield, historicalYieldAverage ?? null);

  const assumptions: ValuationAssumption[] = [
    {
      key: "targetYield",
      label: "Retorno anual em dividendos exigido (Bazin US)",
      helperText: "Yield mínimo anual líquido exigido para ações americanas",
      value: targetYield,
      isCustomized: targetYield !== 4,
      suggestedRange: { min: 2, max: 8 },
      confidenceBadge: 4,
    },
    {
      key: "withholdingTax",
      label: "Imposto retido na fonte EUA (Withholding Tax)",
      helperText: "Alíquota de 30% retida na fonte na distribuição de proventos nos EUA",
      value: customTaxRate ?? 30,
      isCustomized: customTaxRate != null && customTaxRate !== 30,
      suggestedRange: { min: 15, max: 30 },
      confidenceBadge: 4,
    },
    {
      key: "shareholderYield",
      label: "Retorno total ao acionista (Dividendos + Recompras)",
      helperText: "Shareholder Yield apurado via variações de float no SEC EDGAR",
      value: shareholderYield ?? Number(dividendYield.toFixed(2)),
      isCustomized: false,
      suggestedRange: { min: 2, max: 12 },
      confidenceBadge: shareholderYield != null ? 4 : 2,
    },
    {
      key: "peterLynchGrowth",
      label: "Taxa de expansão ajustada (Peter Lynch Fair Value)",
      helperText: "Combinação de crescimento de lucros/proventos e yield",
      value: dividendCagr ?? 6,
      isCustomized: false,
      suggestedRange: { min: 3, max: 20 },
      confidenceBadge: dividendCagr != null ? 4 : 3,
    },
  ];

  return {
    ticker,
    activeCeiling,
    margin,
    fuenteConsensus: consensus,
    methods: {
      bazin,
      graham: null, // STOCK_US never computes the corporate Graham LPA/VPA formula
      gordon,
      shareholderYield: shareholderYieldPrice,
      lynch: lynchPrice,
    },
    assumptions,
    investorProfile: "moderate",
    bazin,
    graham: null,
    gordon,
    lynch: lynchPrice,
    gordonConfidence,
    consensus,
    dividendYield,
    positive: margin >= 0,
    isUnavailable,
    yieldTrapWarning,
    shareholderYield: shareholderYield ?? null,
  };
}

/**
 * Specialized Valuation for Brazilian Real Estate and Infrastructure Funds (FII, FII_INFRA, FIAGRO)
 * Implements Bazin Spread over NTN-B, Inflation Passthrough Gordon, and P/VP Asset Ceiling.
 * Explicitly forbids applying corporate LPA/VPA Graham formulas to fund structures.
 */
export function valuateFundoImobiliario(params: AssetValuationParams): ValuationResult {
  const {
    ticker = "FII",
    type,
    targetYield,
    currentPrice,
    avgDividend,
    bvps,
    dividendCagr,
    dividendHistory,
    currency = "BRL",
    historicalYieldAverage,
    selicPct = SELIC_FALLBACK,
    terminalGrowthRate = 0.045, // 4.5% IPCA 5y benchmark default
  } = params;

  if (currentPrice <= 0 || avgDividend <= 0) {
    return {
      ticker,
      activeCeiling: currentPrice > 0 ? currentPrice : 0,
      margin: 0,
      fuenteConsensus: null,
      methods: {
        bazin: null,
        graham: null,
        gordon: null,
      },
      assumptions: [],
      investorProfile: "moderate",
      bazin: null,
      graham: null,
      gordon: null,
      lynch: null,
      gordonConfidence: null,
      consensus: null,
      dividendYield: 0,
      positive: true,
      isUnavailable: true,
      yieldTrapWarning: null,
      shareholderYield: null,
    };
  }

  // 1. NTN-B Benchmark Rate & Subtype Risk Spread Calibration
  const ntnBBase = Math.max(NTN_B_FLOOR_FALLBACK, Number((selicPct - terminalGrowthRate * 100).toFixed(2)));
  let spread = 2.5; // default FII Tijolo
  let spreadRange = { min: 1.5, max: 3.5 };

  if (type === "FII_INFRA") {
    spread = 2.0; // 1.5% - 2.5% for tax-exempt infrastructure debentures
    spreadRange = { min: 1.5, max: 2.5 };
  } else if (type === "FIAGRO") {
    spread = 3.0; // 2.5% - 4.0% for agro-credit funds
    spreadRange = { min: 2.5, max: 4.0 };
  }

  const effectiveRequiredYield = targetYield > 0 ? targetYield : ntnBBase + spread;

  // 2. Bazin Model Anchored on NTN-B Spread
  const bazin = effectiveRequiredYield > 0 ? avgDividend / (effectiveRequiredYield / 100) : null;

  // 3. Gordon Model with Inflationary Passthrough & Singularity Guard
  const k = selicPct / 100;
  const gInitial = dividendCagr != null ? dividendCagr / 100 : null;
  const gTerminal = terminalGrowthRate ?? GORDON_TERMINAL_GROWTH_RATE;
  const gordon = gordonPrice(avgDividend, k, gInitial, gTerminal);

  const gordonConfidence = resolveGordonConfidence(gordon, dividendHistory);

  // 4. Dynamic P/VP Asset Ceiling (Max 2% premium over Net Asset Value to guard against credit agio)
  const pvpCeiling = bvps != null && bvps > 0 ? bvps * 1.02 : null;

  // 5. Fuente Consensus (Median across fund-applicable methods; Graham is strictly null)
  const consensus = medianConsensus([bazin, gordon, pvpCeiling]);

  const isUnavailable = consensus === null && bazin === null;
  const activeCeiling = consensus !== null ? consensus : bazin || 0;
  const margin = currentPrice > 0 && !isUnavailable ? (activeCeiling / currentPrice - 1) * 100 : 0;
  const dividendYield = currentPrice > 0 ? (avgDividend / currentPrice) * 100 : 0;
  const yieldTrapWarning = isYieldTrap(dividendYield, historicalYieldAverage ?? null);

  const assumptions: ValuationAssumption[] = [
    {
      key: "ntnBSpread",
      label: "Spread de risco exigido sobre a NTN-B",
      helperText: "Prêmio de risco acima do título soberano IPCA+ para o fundo",
      value: spread,
      isCustomized: false,
      suggestedRange: spreadRange,
      confidenceBadge: 4,
    },
    {
      key: "ntnBBaseRate",
      label: "Taxa real do título público NTN-B (IPCA+)",
      helperText: "Taxa de juro real livre de risco da economia brasileira",
      value: ntnBBase,
      isCustomized: false,
      suggestedRange: { min: 4.5, max: 7.5 },
      confidenceBadge: 4,
    },
    {
      key: "inflationPassthrough",
      label: "Repasse inflacionário dos contratos (IPCA/IGP-M)",
      helperText: "Capacidade média de reajuste dos proventos e contratos do fundo",
      value: Number((gTerminal * 100).toFixed(2)),
      isCustomized: false,
      suggestedRange: { min: 3, max: 6 },
      confidenceBadge: 4,
    },
    {
      key: "pvpMaxFair",
      label: "Teto de P/VP patrimonial (Sem ágio)",
      helperText: "Limite de preço sobre valor patrimonial (P/VP até 1.02x)",
      value: 1.02,
      isCustomized: false,
      suggestedRange: { min: 0.95, max: 1.05 },
      confidenceBadge: bvps != null && bvps > 0 ? 4 : 2,
    },
  ];

  return {
    ticker,
    activeCeiling,
    margin,
    fuenteConsensus: consensus,
    methods: {
      bazin,
      graham: null, // Corporate Graham explicitly forbidden for funds
      gordon,
    },
    assumptions,
    investorProfile: "moderate",
    bazin,
    graham: null,
    gordon,
    lynch: null,
    gordonConfidence,
    consensus,
    dividendYield,
    positive: margin >= 0,
    isUnavailable,
    yieldTrapWarning,
    shareholderYield: null,
  };
}

/**
 * Specialized Valuation for US Real Estate Investment Trusts (REIT)
 * Implements Bazin Spread over US Treasury 10Y, REIT-adapted Gordon with 4% growth cap,
 * and 30% withholding tax. Explicitly forbids Graham corporate formula and Selic discount rate.
 */
export function valuateREIT(params: AssetValuationParams): ValuationResult {
  const {
    ticker = "REIT",
    targetYield,
    currentPrice,
    avgDividend,
    dividendCagr,
    dividendHistory,
    currency = "USD",
    historicalYieldAverage,
    customTaxRate,
    usTreasury10Y = US_TREASURY_10Y_FALLBACK,
    affo,
  } = params;

  if (currentPrice <= 0 || avgDividend <= 0) {
    return {
      ticker,
      activeCeiling: currentPrice > 0 ? currentPrice : 0,
      margin: 0,
      fuenteConsensus: null,
      methods: {
        bazin: null,
        graham: null,
        gordon: null,
        affoYield: null,
        lynch: null,
      },
      assumptions: [],
      investorProfile: "moderate",
      bazin: null,
      graham: null,
      gordon: null,
      lynch: null,
      gordonConfidence: null,
      consensus: null,
      dividendYield: 0,
      positive: true,
      isUnavailable: true,
      yieldTrapWarning: null,
      shareholderYield: null,
    };
  }

  // 1. Net Dividend after 30% US Withholding Tax
  const netAvgDividend = netAfterTax(avgDividend, "REIT", currency, customTaxRate);

  const effectiveTreasury10Y = usTreasury10Y ?? US_TREASURY_10Y_FALLBACK;

  // 2. Bazin Model Anchored on US Treasury 10Y Spread (2.0% - 3.5%, suggested 2.75%)
  const spread = REIT_TREASURY_SPREAD_FALLBACK;
  const effectiveRequiredYield = targetYield > 0 ? targetYield : effectiveTreasury10Y + spread;
  const bazin = effectiveRequiredYield > 0 ? netAvgDividend / (effectiveRequiredYield / 100) : null;

  // 3. REIT-Adapted Gordon Growth Model (k = Treasury 10Y + 4% ERP; g capped at 4%)
  const k = (effectiveTreasury10Y + 4.0) / 100;
  const g = dividendCagr != null ? Math.min(0.04, Math.max(0, dividendCagr / 100)) : US_TERMINAL_GROWTH_FALLBACK;
  const effectiveK = Math.max(k, g + GORDON_MIN_DISCOUNT_MARGIN);
  const gordon = (netAvgDividend * (1 + g)) / (effectiveK - g);

  const gordonConfidence = resolveGordonConfidence(gordon, dividendHistory);

  // 4. AFFO Yield Ceiling (when AFFO per share is provided)
  let affoCeiling: number | null = null;
  if (affo != null && affo > 0 && effectiveRequiredYield > 0) {
    const netAffo = affo * (1 - (customTaxRate ?? 30) / 100);
    affoCeiling = netAffo / (effectiveRequiredYield / 100);
  }

  // 5. Fuente Consensus (Strict Median of REIT-specific methods; Graham is strictly null)
  const consensus = medianConsensus([bazin, gordon, affoCeiling]);

  const isUnavailable = consensus === null && bazin === null;
  const activeCeiling = consensus !== null ? consensus : bazin || 0;
  const margin = currentPrice > 0 && !isUnavailable ? (activeCeiling / currentPrice - 1) * 100 : 0;
  const dividendYield = currentPrice > 0 ? (netAvgDividend / currentPrice) * 100 : 0;
  const yieldTrapWarning = isYieldTrap(dividendYield, historicalYieldAverage ?? null);

  const assumptions: ValuationAssumption[] = [
    {
      key: "spreadOverTreasury",
      label: "Spread de Risco sobre US Treasury 10Y (REITs)",
      helperText: "Prêmio de risco exigido pelo mercado para REITs em relação aos títulos soberanos americanos",
      value: spread,
      isCustomized: false,
      suggestedRange: { min: 2.0, max: 3.5 },
      confidenceBadge: 4,
    },
    {
      key: "treasury10YRate",
      label: "Taxa de juros US Treasury 10Y (FRED)",
      helperText: "Taxa livre de risco da economia americana em USD",
      value: effectiveTreasury10Y,
      isCustomized: effectiveTreasury10Y !== US_TREASURY_10Y_FALLBACK,
      suggestedRange: { min: 3.5, max: 5.5 },
      confidenceBadge: 4,
    },
    {
      key: "withholdingTax",
      label: "Imposto retido na fonte EUA (Withholding Tax)",
      helperText: "Alíquota de 30% retida na fonte para REITs",
      value: customTaxRate ?? 30,
      isCustomized: customTaxRate != null && customTaxRate !== 30,
      suggestedRange: { min: 15, max: 30 },
      confidenceBadge: 4,
    },
    {
      key: "reitGrowthCap",
      label: "Crescimento sustentável imobiliário (Cap 4%)",
      helperText: "Taxa de expansão de proventos com trava prudencial para REITs",
      value: Number((g * 100).toFixed(2)),
      isCustomized: false,
      suggestedRange: { min: 1.5, max: 4.0 },
      confidenceBadge: 4,
    },
  ];

  return {
    ticker,
    activeCeiling,
    margin,
    fuenteConsensus: consensus,
    methods: {
      bazin,
      graham: null, // Corporate Graham explicitly forbidden for REITs
      gordon,
      affoYield: affoCeiling,
      lynch: null,
    },
    assumptions,
    investorProfile: "moderate",
    bazin,
    graham: null,
    gordon,
    lynch: null,
    gordonConfidence,
    consensus,
    dividendYield,
    positive: margin >= 0,
    isUnavailable,
    yieldTrapWarning,
    shareholderYield: null,
  };
}

/**
 * Specialized Valuation for Exchange-Traded Funds (ETF)
 * Implements Bogle/Fama-French Expected Return Model, Historical Dividend Yield Anchor,
 * and Implicit Equity Risk Premium (ERP) for accumulation index funds (IVVB11, WRLD11, QQQ, etc.).
 * Guarantees zero false "isUnavailable: true" states for non-distributing ETFs.
 */
export function valuateETF(params: AssetValuationParams): ValuationResult {
  const {
    ticker = "ETF",
    targetYield,
    currentPrice,
    avgDividend,
    dividendCagr,
    currency = "BRL",
    historicalYieldAverage,
    customTaxRate,
    selicPct = SELIC_FALLBACK,
    usTreasury10Y = US_TREASURY_10Y_FALLBACK,
  } = params;

  if (currentPrice <= 0) {
    return {
      ticker,
      activeCeiling: 0,
      margin: 0,
      fuenteConsensus: null,
      methods: {
        bazin: null,
        graham: null,
        gordon: null,
        bogleModel: null,
        lynch: null,
      },
      assumptions: [],
      investorProfile: "moderate",
      bazin: null,
      graham: null,
      gordon: null,
      lynch: null,
      gordonConfidence: null,
      consensus: null,
      dividendYield: 0,
      positive: true,
      isUnavailable: true,
      yieldTrapWarning: null,
      shareholderYield: null,
    };
  }

  const isUS = isUsAsset("ETF", currency);
  const netAvgDividend = avgDividend > 0
    ? netAfterTax(avgDividend, "ETF", currency, customTaxRate)
    : 0;

  const currentDy = currentPrice > 0 ? (netAvgDividend / currentPrice) * 100 : 0;
  const isAccumulation = avgDividend <= 0;

  // 1. Expected Returns & ERP Setup
  const effectiveTreasury10Y = usTreasury10Y ?? US_TREASURY_10Y_FALLBACK;
  // For Brazilian ETFs, the risk-free rate approximation uses the real interest rate (Selic minus inflation/IPCA_FALLBACK), bounded below by NTN_B_FLOOR_FALLBACK
  const riskFreeRate = isUS ? effectiveTreasury10Y : Math.max(NTN_B_FLOOR_FALLBACK, selicPct - IPCA_FALLBACK);
  const classErp = isUS ? 4.75 : 6.0; // 4.75% US S&P500 ERP, 6.0% IBOVESPA ERP
  const totalExpectedReturn = riskFreeRate + classErp;

  // 2. Bogle Expected Return Model: Retorno = DY + Crescimento Lucros
  const constituentGrowth = dividendCagr != null && dividendCagr > 0 ? dividendCagr : 7.0;
  let bogleModelCeiling: number;
  if (!isAccumulation) {
    const requiredReturn = targetYield > 0 ? targetYield : 8.0;
    const bogleExpectedYield = currentDy + constituentGrowth;
    bogleModelCeiling = currentPrice * (bogleExpectedYield / (requiredReturn + constituentGrowth * 0.5));
  } else {
    // For Accumulation ETFs (IVVB11, QQQ, WRLD11), fair value is anchored on ERP discounted relative to investor required return
    const requiredDiscount = targetYield > 0 ? targetYield + riskFreeRate : totalExpectedReturn;
    bogleModelCeiling = currentPrice * (totalExpectedReturn / requiredDiscount);
  }

  // 3. Historical Dividend Yield Bazin Model
  let bazinCeiling: number | null = null;
  if (!isAccumulation && targetYield > 0) {
    const effectiveDy = historicalYieldAverage ?? currentDy;
    bazinCeiling = (currentPrice * effectiveDy) / targetYield;
  } else if (isAccumulation) {
    // For accumulation, Bazin uses the implicit earnings yield
    bazinCeiling = bogleModelCeiling;
  }

  // 4. Fuente Consensus (Strict Median of ETF-applicable methods; Graham is strictly null)
  const consensus = medianConsensus([bazinCeiling, bogleModelCeiling]);

  const activeCeiling = consensus !== null ? consensus : bogleModelCeiling;
  const margin = currentPrice > 0 ? (activeCeiling / currentPrice - 1) * 100 : 0;
  const yieldTrapWarning = isYieldTrap(currentDy, historicalYieldAverage ?? null);

  const assumptions: ValuationAssumption[] = [
    {
      key: "historicalDividendYield",
      label: isAccumulation ? "Yield implícito de acumulação (Reinvestimento)" : "Dividend Yield médio ponderado do ETF",
      helperText: isAccumulation ? "ETF reinveste dividendos automaticamente na cota" : "Yield histórico apurado dos constituintes",
      value: isAccumulation ? totalExpectedReturn : Number(currentDy.toFixed(2)),
      isCustomized: false,
      suggestedRange: isAccumulation ? { min: 6, max: 14 } : { min: 2, max: 10 },
      confidenceBadge: isAccumulation ? 3 : 4,
    },
    {
      key: "constituentGrowth",
      label: "Crescimento histórico dos constituintes (Bogle Model)",
      helperText: "Expansão composta de lucros e dividendos do índice subjacente",
      value: constituentGrowth,
      isCustomized: false,
      suggestedRange: { min: 4, max: 12 },
      confidenceBadge: 4,
    },
    {
      key: "equityRiskPremium",
      label: isUS ? "Prêmio de risco acionário EUA (ERP S&P500)" : "Prêmio de risco acionário Brasil (ERP Ibovespa)",
      helperText: "Prêmio exigido sobre a taxa soberana para investimento em índice",
      value: classErp,
      isCustomized: false,
      suggestedRange: isUS ? { min: 4.0, max: 5.5 } : { min: 5.0, max: 7.5 },
      confidenceBadge: 4,
    },
    {
      key: "requiredReturn",
      label: "Retorno total anual exigido pelo investidor",
      helperText: "Taxa mínima aceitável de valorização composta e proventos",
      value: targetYield > 0 ? targetYield : 8.0,
      isCustomized: targetYield !== 8.0,
      suggestedRange: { min: 6, max: 14 },
      confidenceBadge: 4,
    },
  ];

  return {
    ticker,
    activeCeiling,
    margin,
    fuenteConsensus: consensus,
    methods: {
      bazin: bazinCeiling,
      graham: null, // Corporate Graham strictly forbidden for ETFs
      gordon: null, // Single-stock Gordon strictly forbidden for ETFs
      bogleModel: bogleModelCeiling,
      lynch: null,
    },
    assumptions,
    investorProfile: "moderate",
    bazin: bazinCeiling,
    graham: null,
    gordon: null,
    lynch: null,
    gordonConfidence: null,
    consensus,
    dividendYield: currentDy,
    positive: margin >= 0,
    isUnavailable: false, // Never mark accumulation ETFs as unavailable
    yieldTrapWarning,
    shareholderYield: null,
  };
}

/**
 * Universal valuation engine.
 * Acts as the centralized SSOT Dispatcher across all asset classes.
 */
export function getAssetValuation(params: AssetValuationParams): ValuationResult {
  const { type, currentPrice, avgDividend } = params;

  // Bypass complex math for Fixed Income
  if (type === "FIXED_INCOME") {
    return {
      ticker: params.ticker ?? "FIXED_INCOME",
      activeCeiling: currentPrice,
      margin: 0,
      fuenteConsensus: null,
      methods: {
        bazin: null,
        graham: null,
        gordon: null,
        lynch: null,
      },
      assumptions: [],
      investorProfile: "conservative",
      bazin: null,
      graham: null,
      gordon: null,
      lynch: null,
      gordonConfidence: null,
      consensus: null,
      dividendYield: 0,
      positive: true,
      isUnavailable: true,
      yieldTrapWarning: null,
      shareholderYield: null,
    };
  }

  if (type === "STOCK_BR") {
    return valuateStockBR(params);
  }

  if (type === "STOCK_US") {
    return valuateStockUS(params);
  }

  if (type === "FII" || type === "FII_INFRA" || type === "FIAGRO") {
    return valuateFundoImobiliario(params);
  }

  if (type === "REIT") {
    return valuateREIT(params);
  }

  if (type === "ETF") {
    return valuateETF(params);
  }

  // Default fallback for other asset classes (prior to their dedicated prompt specialization)
  const isUS = isUsAsset(type, params.currency) || params.currency === "USD";
  const netAvgDividend = netAfterTax(avgDividend, type, params.currency, params.customTaxRate);
  const bazin = params.targetYield > 0 ? netAvgDividend / (params.targetYield / 100) : null;
  const graham = params.eps && params.bvps && params.eps > 0 && params.bvps > 0 ? Math.sqrt(22.5 * params.eps * params.bvps) : null;
  const usDiscountRate = US_COST_OF_EQUITY_FALLBACK;
  const k = isUS ? usDiscountRate : (params.selicPct ?? SELIC_FALLBACK) / 100;
  const gInitial = params.dividendCagr != null ? params.dividendCagr / 100 : null;
  const gTerminal = params.terminalGrowthRate ?? (isUS ? US_TERMINAL_GROWTH_FALLBACK : GORDON_TERMINAL_GROWTH_RATE);
  const gordon = gordonPrice(
    netAvgDividend,
    k,
    gInitial,
    gTerminal,
  );

  const gordonConfidence = resolveGordonConfidence(gordon, params.dividendHistory);

  const consensus = medianConsensus([bazin, graham, gordon]);

  const isUnavailable = consensus === null && bazin === null;
  const activeCeiling = consensus !== null ? consensus : bazin || 0;
  const margin = currentPrice > 0 && !isUnavailable ? (activeCeiling / currentPrice - 1) * 100 : 0;
  const dividendYield = currentPrice > 0 ? (netAvgDividend / currentPrice) * 100 : 0;
  const yieldTrapWarning = isYieldTrap(dividendYield, params.historicalYieldAverage ?? null);

  return {
    ticker: params.ticker ?? type,
    activeCeiling,
    margin,
    fuenteConsensus: consensus,
    methods: {
      bazin,
      graham,
      gordon,
      shareholderYield: params.shareholderYield ?? null,
      lynch: null,
    },
    assumptions: [],
    investorProfile: "moderate",
    bazin,
    graham,
    gordon,
    lynch: null,
    gordonConfidence,
    consensus,
    dividendYield,
    positive: margin >= 0,
    isUnavailable,
    yieldTrapWarning,
    shareholderYield: params.shareholderYield ?? null,
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
    !Number.isFinite(item.averagePrice) ||
    item.averagePrice <= 0 ||
    item.quantity <= 0 ||
    !Number.isFinite(item.quantity)
  ) {
    return null;
  }

  const rates = macroRates || MACRO_RATES_FALLBACK;
  const principal = item.averagePrice * item.quantity;
  const start = new Date(item.startDate).getTime();
  const now = Date.now();

  if (!Number.isFinite(start) || start > now) {
    return { accruedBalance: principal, profit: 0 };
  }

  const elapsedDays = (now - start) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(elapsedDays) || elapsedDays < 0) {
    return { accruedBalance: principal, profit: 0 };
  }

  let effectiveRate = 0;
  const itemRate = typeof item.rate === "number" && Number.isFinite(item.rate) ? item.rate : 0;
  const indexer = item.indexer?.toUpperCase();

  if (indexer === "CDI") {
    effectiveRate = (rates.cdi / 100) * (itemRate / 100);
  } else if (indexer === "IPCA") {
    effectiveRate = (1 + rates.ipca / 100) * (1 + itemRate / 100) - 1;
  } else {
    // PRE or default
    effectiveRate = itemRate / 100;
  }

  if (!Number.isFinite(effectiveRate) || effectiveRate < 0) {
    return { accruedBalance: principal, profit: 0 };
  }

  const factor = Math.pow(1 + effectiveRate, elapsedDays / 365);
  const accruedBalance = Number.isFinite(factor) ? principal * factor : principal;

  return {
    accruedBalance,
    profit: accruedBalance - principal,
  };
}

/**
 * Current market value of a position: `quantity * currentPrice`, except for
 * FIXED_INCOME positions, which use the accrued balance (compounded from
 * principal + rate) instead of a live quote. SSOT for position value — reused
 * by every aggregator that sums portfolio worth (net worth, FI progress,
 * risk/concentration) so FIXED_INCOME accrual is applied consistently.
 */
export function getPositionValue(
  item: WatchlistItem,
  macroRates?: { cdi: number; ipca: number },
): number {
  if (item.type === "FIXED_INCOME") {
    const accrual = calculateFixedIncomeBalance(item, macroRates);
    if (accrual && Number.isFinite(accrual.accruedBalance)) return accrual.accruedBalance;
    const avgPrice =
      typeof item.averagePrice === "number" && Number.isFinite(item.averagePrice) && item.averagePrice > 0
        ? item.averagePrice
        : 0;
    const qty =
      typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
        ? item.quantity
        : 0;
    return avgPrice * qty;
  }
  const qty =
    typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
      ? item.quantity
      : 0;
  const price =
    typeof item.currentPrice === "number" && Number.isFinite(item.currentPrice) && item.currentPrice > 0
      ? item.currentPrice
      : 0;
  return qty * price;
}

export function projectFixedIncomeValueAtMaturity(
  principal: number,
  indexer: string,
  rate: number,
  startDateStr: string,
  maturityDateStr: string,
  macroRates?: { cdi: number; ipca: number },
): { projectedBalance: number; projectedProfit: number } {
  const safePrincipal =
    typeof principal === "number" && Number.isFinite(principal) && principal > 0 ? principal : 0;
  if (safePrincipal <= 0) return { projectedBalance: 0, projectedProfit: 0 };

  const rates = macroRates || MACRO_RATES_FALLBACK;

  const start = new Date(startDateStr).getTime();
  const maturity = new Date(maturityDateStr).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(maturity) || maturity <= start) {
    return { projectedBalance: safePrincipal, projectedProfit: 0 };
  }

  const totalDays = (maturity - start) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(totalDays) || totalDays <= 0) {
    return { projectedBalance: safePrincipal, projectedProfit: 0 };
  }

  let effectiveRate = 0;
  const safeRate = typeof rate === "number" && Number.isFinite(rate) ? rate : 0;
  const idx = (indexer || "").toUpperCase();

  if (idx === "CDI") {
    effectiveRate = (rates.cdi / 100) * (safeRate / 100);
  } else if (idx === "IPCA") {
    effectiveRate = (1 + rates.ipca / 100) * (1 + safeRate / 100) - 1;
  } else {
    // PRE
    effectiveRate = safeRate / 100;
  }

  if (!Number.isFinite(effectiveRate) || effectiveRate < 0) {
    return { projectedBalance: safePrincipal, projectedProfit: 0 };
  }

  const factor = Math.pow(1 + effectiveRate, totalDays / 365);
  const projectedBalance = Number.isFinite(factor) ? safePrincipal * factor : safePrincipal;

  return {
    projectedBalance,
    projectedProfit: projectedBalance - safePrincipal,
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
      (curr, prev) => curr < prev || (curr === 0 && prev === 0),
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
