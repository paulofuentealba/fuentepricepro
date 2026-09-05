import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

export type RecommendedActionKey = "buy" | "watch" | "avoid" | "yieldTrap" | "noData";

/**
 * Classifies an asset into a recommended-action bucket from its Fuente valuation margin.
 * Mirrors the verdict logic already used by ScreenerScreen.computeCardVerdict, generalized
 * for the Dashboard's Opportunity Matrix (multiple assets rendered as a table, not one hero card).
 */
export function computeRecommendedAction(item: ValuedWatchlistItem): RecommendedActionKey {
  const margin = item.valuation?.margin ?? item.safetyMargin ?? null;
  if (item.valuation?.isUnavailable || margin == null) return "noData";
  if (item.valuation?.yieldTrapWarning === true) return "yieldTrap";
  if (margin < 0) return "avoid";
  return margin >= 10 ? "buy" : "watch";
}
