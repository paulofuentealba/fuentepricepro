import {
  applyTransactionToHolding,
  type PositionHoldingState,
  type Transaction,
} from "@/lib/transactions";
import type { AssetType } from "@/lib/domain";
import type { RealizedGainEvent } from "../types";

/**
 * Pure function to calculate realized capital gains/losses on sell transactions (Item 2.1b).
 *
 * Replays transactions in chronological order using the single source of truth for
 * weighted average price (`applyTransactionToHolding` from `transactionsLogic.ts`).
 *
 * For each sale transaction:
 * - Captures the weighted average price IMMEDIATELY BEFORE the sale is applied.
 * - `proceeds = (pricePerShare * quantity) - fees` (alienação líquida de taxas).
 * - `costBasis = averagePriceBeforeSale * quantity`.
 * - `gain = proceeds - costBasis` (negative indicates a realized loss).
 * - Then updates the holding state (which resets averagePrice to 0 if position fully closes).
 *
 * NOTE: This foundational calculation does NOT apply exemption limits (e.g. R$ 20k for stocks)
 * or loss compensation. Those rules are applied in subsequent tax calculation steps (Prompt 140+).
 */
export function calculateRealizedGains(
  transactions: Transaction[],
  _assetType?: AssetType,
): RealizedGainEvent[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Sort ascending by date for chronological replay
  const sorted = [...transactions].sort((a, b) => a.date - b.date);

  const holdingsByTicker = new Map<string, PositionHoldingState>();
  const events: RealizedGainEvent[] = [];

  for (const tx of sorted) {
    const currentState = holdingsByTicker.get(tx.ticker) || {
      quantity: 0,
      averagePrice: 0,
    };

    if (tx.type === "buy" || tx.type === "corporate_action") {
      const nextState = applyTransactionToHolding(currentState, tx);
      holdingsByTicker.set(tx.ticker, nextState);
    } else if (tx.type === "sell") {
      // CRITICAL: Capture averagePrice BEFORE applying the sell to the state
      const avgPriceBeforeSale = currentState.averagePrice;
      const fees = tx.fees || 0;
      const proceeds = (tx.pricePerShare * tx.quantity) - fees;
      const costBasis = avgPriceBeforeSale * tx.quantity;
      const gain = proceeds - costBasis;

      events.push({
        ticker: tx.ticker,
        saleDate: tx.date,
        quantity: tx.quantity,
        salePrice: tx.pricePerShare,
        proceeds,
        costBasis,
        gain,
        ...(fees > 0 ? { fees } : {}),
      });

      // Update holding state for remaining shares (resets avgPrice to 0 if quantity reaches 0)
      const nextState = applyTransactionToHolding(currentState, tx);
      holdingsByTicker.set(tx.ticker, nextState);
    }
  }

  return events;
}
