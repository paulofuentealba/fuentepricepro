import { recalculateHoldingFromTransactions, type Transaction } from "../transactionsLogic";

export interface ConsolidatedPosition {
  ticker: string;
  quantity: number;
  averageCost: number;
  totalInvested: number;
  firstBuyDate: number | null;
  lastBuyDate: number | null;
  isClosed: boolean;
  transactionCount: number;
  updatedAt: number;
}

/**
 * Pure, idempotent function to calculate consolidated position read model for a single ticker.
 * Single Source of Truth: Reuses `recalculateHoldingFromTransactions` so there is 0 divergence
 * between server-side positions and client-side calculations.
 */
export function calculateConsolidatedPosition(
  ticker: string,
  transactions: Transaction[],
  now: number = Date.now(),
): ConsolidatedPosition {
  const normalizedTicker = ticker.trim().toUpperCase();
  const filteredTxs = transactions.filter(
    (tx) => tx.ticker.trim().toUpperCase() === normalizedTicker,
  );

  if (filteredTxs.length === 0) {
    return {
      ticker: normalizedTicker,
      quantity: 0,
      averageCost: 0,
      totalInvested: 0,
      firstBuyDate: null,
      lastBuyDate: null,
      isClosed: true,
      transactionCount: 0,
      updatedAt: now,
    };
  }

  const sortedTxs = [...filteredTxs].sort((a, b) => a.date - b.date);
  const holding = recalculateHoldingFromTransactions(sortedTxs);

  const buyTxs = sortedTxs.filter((tx) => tx.type === "buy");
  const firstBuyDate = buyTxs.length > 0 ? buyTxs[0].date : null;
  const lastBuyDate = sortedTxs[sortedTxs.length - 1].date;
  const isClosed = holding.quantity <= 0;

  const totalInvested = isClosed ? 0 : holding.quantity * holding.averagePrice;

  return {
    ticker: normalizedTicker,
    quantity: holding.quantity,
    averageCost: holding.averagePrice,
    totalInvested,
    firstBuyDate,
    lastBuyDate,
    isClosed,
    transactionCount: sortedTxs.length,
    updatedAt: now,
  };
}

/**
 * Reconciles all transactions for a user and groups them into a Map of ConsolidatedPositions.
 * Idempotent: Can be run repeatedly with guaranteed deterministic output.
 */
export function reconcileAllPositions(
  transactions: Transaction[],
  now: number = Date.now(),
): Map<string, ConsolidatedPosition> {
  const positionsByTicker = new Map<string, ConsolidatedPosition>();
  const txByTicker = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const ticker = tx.ticker.trim().toUpperCase();
    const list = txByTicker.get(ticker) || [];
    list.push(tx);
    txByTicker.set(ticker, list);
  }

  for (const [ticker, txs] of txByTicker.entries()) {
    const position = calculateConsolidatedPosition(ticker, txs, now);
    positionsByTicker.set(ticker, position);
  }

  return positionsByTicker;
}
