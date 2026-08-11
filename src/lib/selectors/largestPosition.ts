import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

export interface LargestPosition {
  item: ValuedWatchlistItem;
  marketValue: number;
}

/**
 * Pure selector: derives the single largest open position from
 * `valuedItems` (as returned by `useValuedPortfolio()`), ordered by market
 * value (`currentPrice * quantity`).
 *
 * Closed positions (`isClosedPosition === true`) and positions with zero or
 * negative market value are excluded — they are not a "position" a user
 * would recognize as their biggest holding.
 *
 * Returns `null` when there is no eligible item (empty portfolio).
 */
export function getLargestPosition(
  valuedItems: ValuedWatchlistItem[],
): LargestPosition | null {
  let best: LargestPosition | null = null;

  for (const item of valuedItems) {
    if (item.isClosedPosition) continue;

    const marketValue = item.currentPrice * item.quantity;
    if (!Number.isFinite(marketValue) || marketValue <= 0) continue;

    if (!best || marketValue > best.marketValue) {
      best = { item, marketValue };
    }
  }

  return best;
}
