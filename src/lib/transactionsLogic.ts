import { isBrTicker, classifyBr } from "./classify";
import type { AssetType, Currency } from "./domain";
import { getAssetValuation } from "./calculations";

export interface ThesisSnapshot {
  consensusPrice: number | null;
  bazinPrice: number | null;
  grahamPrice: number | null;
  gordonPrice: number | null;
  purchasePrice: number;
  safetyMarginVsConsensus: number | null;
  payoutRatio: number | null;
  dividendYield: number | null;
  dividendCagr5y: number | null;
  piotroskiScore: number | null;
  isYieldTrap: boolean | null;
  valuationVersion: string;
  capturedAt: number;
  unavailableReason?: string | null;
}

export interface CanonicalThesisSnapshotParams {
  ticker: string;
  purchasePrice: number;
  targetYield?: number | null;
  annualDividend?: number | null;
  currentPrice?: number | null;
  eps?: number | null;
  bvps?: number | null;
  dividendCagr5y?: number | null;
  payoutRatio?: number | null;
  piotroskiScore?: number | null;
  currency?: Currency | null;
  type?: AssetType | null;
  terminalGrowthRate?: number | null;
  capturedAt?: number;
  fallbackCeilingPrice?: number | null;
}

/**
 * Single Source of Truth (SSOT) builder for ThesisSnapshot (Regras 1 e 4 do AGENTS.md).
 * Executes canonical getAssetValuation and computes frozen consensus, margin of safety,
 * and purchase-price dividend yield cleanly without duplication across modals and import flows.
 */
export function createCanonicalThesisSnapshot({
  ticker,
  purchasePrice,
  targetYield,
  annualDividend,
  currentPrice,
  eps,
  bvps,
  dividendCagr5y,
  payoutRatio,
  piotroskiScore,
  currency,
  type,
  terminalGrowthRate,
  capturedAt = Date.now(),
  fallbackCeilingPrice,
}: CanonicalThesisSnapshotParams): ThesisSnapshot {
  const resolvedType = type || classifyBr(ticker);
  const resolvedCurrency =
    currency || (isBrTicker(ticker) ? "BRL" : "USD");
  const resolvedTarget =
    typeof targetYield === "number" && targetYield > 0 ? targetYield : 6;
  const resolvedAnnualDiv =
    typeof annualDividend === "number" && annualDividend >= 0 ? annualDividend : 0;
  const resolvedPrice =
    typeof currentPrice === "number" && currentPrice > 0
      ? currentPrice
      : purchasePrice > 0
        ? purchasePrice
        : 1;

  let baseValuation: ReturnType<typeof getAssetValuation> | null = null;
  let calculationError = false;

  try {
    baseValuation = getAssetValuation({
      targetYield: resolvedTarget,
      currentPrice: resolvedPrice,
      avgDividend: resolvedAnnualDiv,
      eps: eps ?? null,
      bvps: bvps ?? null,
      dividendCagr: dividendCagr5y ?? null,
      terminalGrowthRate: terminalGrowthRate ?? undefined,
      currency: resolvedCurrency,
      type: resolvedType,
    });
  } catch {
    calculationError = true;
  }

  const consensusPrice = baseValuation?.fuenteConsensus ?? fallbackCeilingPrice ?? null;
  const safetyMarginVsConsensus =
    consensusPrice != null && purchasePrice > 0
      ? ((consensusPrice - purchasePrice) / purchasePrice) * 100
      : null;

  const dy =
    purchasePrice > 0 && resolvedAnnualDiv > 0
      ? (resolvedAnnualDiv / purchasePrice) * 100
      : (baseValuation?.dividendYield ?? null);

  let unavailableReason: string | null = null;
  if (consensusPrice == null) {
    unavailableReason = calculationError ? "VALUATION_ERROR" : "CONSENSUS_UNAVAILABLE";
  }

  return {
    consensusPrice,
    bazinPrice: baseValuation?.methods?.bazin ?? null,
    grahamPrice:
      baseValuation?.methods?.graham ?? baseValuation?.methods?.lynch ?? null,
    gordonPrice: baseValuation?.methods?.gordon ?? null,
    purchasePrice,
    safetyMarginVsConsensus,
    payoutRatio: payoutRatio ?? null,
    dividendYield: dy,
    dividendCagr5y: dividendCagr5y ?? null,
    piotroskiScore: piotroskiScore ?? null,
    isYieldTrap: baseValuation?.yieldTrapWarning ? true : false,
    valuationVersion: "fuente-v1",
    capturedAt,
    unavailableReason,
  };
}

/**
 * Builds a ThesisSnapshot from a WatchlistItem or fetched Asset metadata.
 */
export function buildThesisSnapshotFromItemOrAsset({
  ticker,
  purchasePrice,
  watchlistItem,
  assetData,
  capturedAt,
}: {
  ticker: string;
  purchasePrice: number;
  watchlistItem?: any | null;
  assetData?: any | null;
  capturedAt?: number;
}): ThesisSnapshot {
  const type = watchlistItem?.type || assetData?.type;
  const currency = watchlistItem?.currency || assetData?.currency;
  const targetYield = watchlistItem?.targetYield;
  const annualDividend = watchlistItem?.annualDividend ?? assetData?.annualDividend;
  const currentPrice = assetData?.currentPrice ?? watchlistItem?.currentPrice;
  const fallbackCeilingPrice = watchlistItem?.ceilingPrice;

  const eps =
    watchlistItem?.epsCurrent ??
    watchlistItem?.metrics?.eps ??
    assetData?.epsCurrent ??
    assetData?.metrics?.eps ??
    null;
  const bvps =
    watchlistItem?.metrics?.bvps ?? assetData?.metrics?.bvps ?? null;
  const dividendCagr5y =
    watchlistItem?.dividendCagr5y ??
    watchlistItem?.metrics?.dividendCagr5y ??
    assetData?.metrics?.dividendCagr5y ??
    null;
  const payoutRatio =
    watchlistItem?.payoutRatio ??
    watchlistItem?.metrics?.payoutRatio ??
    assetData?.metrics?.payoutRatio ??
    null;
  const piotroskiScore =
    watchlistItem?.piotroskiScore ??
    watchlistItem?.metrics?.piotroskiScore ??
    assetData?.metrics?.piotroskiScore ??
    null;

  return createCanonicalThesisSnapshot({
    ticker,
    purchasePrice,
    targetYield,
    annualDividend,
    currentPrice,
    eps,
    bvps,
    dividendCagr5y,
    payoutRatio,
    piotroskiScore,
    currency,
    type,
    fallbackCeilingPrice,
    capturedAt,
  });
}

export type AccountType = "taxable" | "roth_ira" | "traditional_ira_401k";

export interface Transaction {
  id: string;
  ticker: string;
  /**
   * `corporate_action` marks a split/grouping adjustment: it multiplies the
   * running quantity by `factor` and divides the average price by `factor`,
   * preserving total invested capital. It carries no cash flow.
   */
  type: "buy" | "sell" | "corporate_action";
  date: number; // timestamp
  quantity: number;
  pricePerShare: number;
  /** Multiplier for `corporate_action` transactions (split: ratio, grouping: 1/ratio). */
  factor?: number | null;
  fees?: number | null; // corretagem/taxas, a Receita manda incluir no custo
  notes?: string | null;
  broker?: string | null;
  thesisSnapshot?: ThesisSnapshot | null;
  /** Account segregation (e.g. Taxable Brokerage vs Roth IRA vs Traditional IRA/401k) */
  accountType?: AccountType | null;
}

export interface PositionHoldingState {
  quantity: number;
  averagePrice: number;
}

/**
 * Pure state reducer applying a single transaction to an existing position holding state.
 * Implements Brazilian tax/accounting rules for weighted average price:
 * - Buys: increase quantity and compute new weighted average price (including fees in cost basis).
 * - Sells: decrease quantity without altering average price; resets averagePrice to 0 if quantity reaches 0.
 * - Corporate actions: scale quantity and inversely scale averagePrice by factor.
 */
export function applyTransactionToHolding(
  state: PositionHoldingState,
  tx: Transaction,
): PositionHoldingState {
  let { quantity, averagePrice } = state;

  if (tx.type === "buy") {
    const currentTotalCost = averagePrice * quantity;
    const txCost = (tx.pricePerShare * tx.quantity) + (tx.fees || 0);
    quantity += tx.quantity;
    if (quantity > 0) {
      averagePrice = (currentTotalCost + txCost) / quantity;
    }
  } else if (tx.type === "sell") {
    quantity -= tx.quantity;
    if (quantity <= 0) {
      quantity = 0;
      averagePrice = 0; // Reset average price when position is fully closed
    }
  } else if (tx.type === "corporate_action") {
    const factor = tx.factor ?? 1;
    if (Number.isFinite(factor) && factor > 0) {
      // Split/grouping: scale quantity and inverse-scale average price so
      // total invested capital stays identical. Applied in chronological
      // order alongside buys/sells.
      const isBr = tx.ticker ? isBrTicker(tx.ticker) : false;
      if (isBr) {
        if (factor < 1) {
          // Grouping (inplit) on B3: whole shares kept, leftovers go to auction
          quantity = Math.floor(quantity * factor + 1e-7);
        } else {
          // Split on B3: whole shares
          quantity = Math.round(quantity * factor);
        }
      } else {
        quantity *= factor;
      }
      averagePrice /= factor;
      if (quantity < 0) quantity = 0;
    }
  }

  // Floating point precision sanitation
  const isBr = tx.ticker ? isBrTicker(tx.ticker) : false;
  if (isBr) {
    quantity = Math.round(quantity);
  } else {
    quantity = Math.round(quantity * 1e8) / 1e8;
  }
  averagePrice = Math.round(averagePrice * 1e4) / 1e4;

  return { quantity, averagePrice };
}

/**
 * Calculates current quantity and average price purely from a list of transactions.
 * Assumes Brazilian Revenue rule:
 * - Weighted average for buys.
 * - Sells only reduce quantity, do not affect average price.
 * - Fees on buys are added to the cost basis.
 */
export function recalculateHoldingFromTransactions(transactions: Transaction[]): { quantity: number; averagePrice: number } {
  const sorted = [...transactions].sort((a, b) => a.date - b.date);

  let state: PositionHoldingState = { quantity: 0, averagePrice: 0 };
  for (const tx of sorted) {
    state = applyTransactionToHolding(state, tx);
  }

  return state;
}

/**
 * Returns the quantity of an asset held at a specific point in time in the past.
 * Delegates to `recalculateHoldingFromTransactions` (the SSOT holding reducer)
 * over the subset of transactions up to `date`, so buy/sell/corporate_action
 * rules never drift between "current holding" and "holding as of a date".
 */
export function getQuantityAtDate(transactions: Transaction[], date: number): number {
  const pastTx = transactions.filter((tx) => tx.date <= date);
  return recalculateHoldingFromTransactions(pastTx).quantity;
}

/**
 * Calculates the earliest buy transaction date for an asset (investingSince).
 * Returns null if no buy transactions exist.
 */
export function recalculateInvestingSinceFromTransactions(transactions: Transaction[]): number | null {
  const buyTxs = transactions.filter((tx) => tx.type === "buy" && typeof tx.date === "number" && Number.isFinite(tx.date) && tx.date > 0);
  if (buyTxs.length === 0) return null;
  return Math.min(...buyTxs.map((tx) => tx.date));
}
