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
  thesisSnapshot?: ThesisSnapshot | null;
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
      quantity *= factor;
      averagePrice /= factor;
      if (quantity < 0) quantity = 0;
    }
  }

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
 */
export function getQuantityAtDate(transactions: Transaction[], date: number): number {
  const pastTx = transactions.filter((tx) => tx.date <= date);
  const sorted = [...pastTx].sort((a, b) => a.date - b.date);

  let quantity = 0;
  for (const tx of sorted) {
    if (tx.type === "buy") {
      quantity += tx.quantity;
    } else if (tx.type === "sell") {
      quantity -= tx.quantity;
      if (quantity < 0) quantity = 0;
    } else if (tx.type === "corporate_action") {
      const factor = tx.factor ?? 1;
      if (Number.isFinite(factor) && factor > 0) {
        quantity *= factor;
        if (quantity < 0) quantity = 0;
      }
    }
  }

  return quantity;
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
