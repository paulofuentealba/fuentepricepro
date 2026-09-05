import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { getPositionValue, netAfterTax } from "@/lib/calculations";

/**
 * Weighted-average net Yield on Cost across all owned positions (quantity > 0 with a known
 * average price), weighted by each position's current market value.
 *
 * Only owned positions contribute — watchlist-only items (quantity === 0) have no cost basis
 * and are excluded, matching the "Yield on Cost" concept (return on what you actually paid).
 */
export function computeWeightedYieldOnCost(
  items: ValuedWatchlistItem[],
  macroRates?: { cdi: number; ipca: number },
): number {
  let weightedSum = 0;
  let totalValue = 0;

  for (const item of items) {
    if (item.isClosedPosition) continue;
    if (!(item.quantity > 0)) continue;

    const avgPrice =
      typeof item.averagePrice === "number" && Number.isFinite(item.averagePrice) && item.averagePrice > 0
        ? item.averagePrice
        : null;
    if (avgPrice == null) continue;

    const value = getPositionValue(item, macroRates);
    if (value <= 0) continue;

    const netAnnualDividendPerShare = netAfterTax(
      item.annualDividend || 0,
      item.type,
      item.currency,
      item.customTaxRate,
    );
    const yieldOnCostPct = (netAnnualDividendPerShare / avgPrice) * 100;

    weightedSum += yieldOnCostPct * value;
    totalValue += value;
  }

  return totalValue > 0 ? weightedSum / totalValue : 0;
}
