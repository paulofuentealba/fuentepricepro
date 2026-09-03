import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { getPositionValue } from "@/lib/calculations";
import { convertCurrency } from "@/lib/currency";

export interface LargestPosition {
  item: ValuedWatchlistItem;
  marketValue: number;
}

/**
 * Pure selector: derives the single largest open position from
 * `valuedItems` (as returned by `useValuedPortfolio()`), ranked by market
 * value converted to a common currency (BRL) so mixed BRL/USD portfolios
 * compare real value, not raw native-currency magnitude. `marketValue` on
 * the returned item stays in the item's own currency (the conversion is
 * only used as the ranking key) — see `getPositionValue`, the SSOT for
 * position value, which also applies FIXED_INCOME accrual.
 *
 * Closed positions (`isClosedPosition === true`) and positions with zero or
 * negative market value are excluded — they are not a "position" a user
 * would recognize as their biggest holding.
 *
 * Returns `null` when there is no eligible item (empty portfolio).
 */
export function getLargestPosition(
  valuedItems: ValuedWatchlistItem[],
  exchangeRate?: number,
  macroRates?: Parameters<typeof getPositionValue>[1],
): LargestPosition | null {
  let best: LargestPosition | null = null;
  let bestRankingValue = -Infinity;

  for (const item of valuedItems) {
    if (item.isClosedPosition) continue;

    const marketValue = getPositionValue(item, macroRates);
    if (!Number.isFinite(marketValue) || marketValue <= 0) continue;

    const rankingValue = convertCurrency(marketValue, item.currency, "BRL", exchangeRate);
    if (rankingValue > bestRankingValue) {
      best = { item, marketValue };
      bestRankingValue = rankingValue;
    }
  }

  return best;
}
