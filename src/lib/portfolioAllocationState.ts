import type { AssetType } from "@/lib/domain";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { getDisplayAssetType } from "@/lib/formatters";

export interface ClassAllocationState {
  type: AssetType;
  /** 0-1, the class's share of smartAllocationTargets' total weight. */
  targetPct: number;
  currentValue: number;
  totalCurrentValue: number;
  /** 0-1, currentValue / totalCurrentValue (0 when the portfolio is empty). */
  currentPct: number;
}

/**
 * Computes each configured class's current allocation vs. its target share of
 * `smartAllocationTargets` — the SSOT computation for "how far is each class from its goal".
 * Extracted from askEngine's balanceTargets strategy (Regra 1) so both the Ask Engine's
 * multi-candidate selection AND the Screener's single-candidate simulation share one
 * implementation instead of two that could drift apart.
 *
 * FII_INFRA/FIAGRO are grouped into FII via getDisplayAssetType, matching every other
 * allocation-target consumer (usePortfolioRisk, balanceTargets).
 */
export function computeClassAllocationState(
  positions: ValuedWatchlistItem[],
  targets: Partial<Record<AssetType, number>> | undefined,
): Map<AssetType, ClassAllocationState> {
  const classCurrentValue: Partial<Record<AssetType, number>> = {};
  let totalCurrentValue = 0;

  for (const pos of positions) {
    const livePrice = pos.livePrice ?? pos.currentPrice ?? 0;
    const qty = pos.quantity ?? 0;
    const value = qty * livePrice;
    const type = getDisplayAssetType(pos.type);
    classCurrentValue[type] = (classCurrentValue[type] || 0) + value;
    totalCurrentValue += value;
  }

  const totalTargetWeight = Object.values(targets || {}).reduce(
    (sum: number, w) => sum + (typeof w === "number" && w > 0 ? w : 0),
    0,
  );

  const result = new Map<AssetType, ClassAllocationState>();
  if (totalTargetWeight <= 0) return result;

  for (const [typeKey, weight] of Object.entries(targets || {})) {
    const type = typeKey as AssetType;
    const w = typeof weight === "number" && weight > 0 ? weight : 0;
    if (w <= 0) continue;

    const currentValue = classCurrentValue[type] || 0;
    result.set(type, {
      type,
      targetPct: w / totalTargetWeight,
      currentValue,
      totalCurrentValue,
      currentPct: totalCurrentValue > 0 ? currentValue / totalCurrentValue : 0,
    });
  }

  return result;
}
