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

  let quantity = 0;
  let averagePrice = 0;

  for (const tx of sorted) {
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
  }

  return { quantity, averagePrice };
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
