import type { AssetType } from "@/lib/domain";
import { getDisplayAssetType } from "@/lib/formatters";
import type { AskStrategyContext, Strategy, StrategyCandidate } from "../types";

/**
 * Strategy: Balance Targets (Reequilíbrio de Metas)
 *
 * Pure strategy that identifies asset classes furthest below the user's
 * configured `smartAllocationTargets`, ranking top assets in those classes
 * by safety margin.
 */
export function runBalanceTargets(ctx: AskStrategyContext): StrategyCandidate[] {
  const { eligiblePositions, availableAmount, settings } = ctx;

  if (!eligiblePositions || eligiblePositions.length === 0 || availableAmount <= 0) {
    return [];
  }

  const targets = settings.smartAllocationTargets || ({} as Record<AssetType, number>);

  // 1. Calculate current portfolio value and current allocation per class
  const classCurrentValue: Partial<Record<AssetType, number>> = {};
  let totalCurrentValue = 0;

  for (const pos of eligiblePositions) {
    const livePrice = pos.livePrice ?? pos.currentPrice ?? 0;
    const qty = pos.quantity ?? 0;
    const value = qty * livePrice;
    // FII_INFRA/FIAGRO are grouped into FII for allocation-target purposes (same SSOT grouping
    // as usePortfolioRisk); AssetType itself stays distinct for Watchlist/Realidade Fiscal.
    const type = getDisplayAssetType(pos.type);

    classCurrentValue[type] = (classCurrentValue[type] || 0) + value;
    totalCurrentValue += value;
  }

  // 2. Compute target deficit per class
  // Projected total portfolio value after current investment
  const projectedTotal = totalCurrentValue + availableAmount;

  // Sum of target weights (typically 100)
  const totalTargetWeight = Object.values(targets).reduce(
    (sum: number, w) => sum + (typeof w === "number" && w > 0 ? w : 0),
    0,
  );

  if (totalTargetWeight <= 0) {
    return [];
  }

  interface ClassDeficit {
    type: AssetType;
    targetPct: number;
    currentValue: number;
    targetValue: number;
    deficit: number;
  }

  const deficits: ClassDeficit[] = [];

  for (const [typeKey, weight] of Object.entries(targets)) {
    const type = typeKey as AssetType;
    const w = typeof weight === "number" && weight > 0 ? weight : 0;
    if (w <= 0) continue;

    const targetPct = w / totalTargetWeight;
    const targetValue = projectedTotal * targetPct;
    const currentValue = classCurrentValue[type] || 0;
    const deficit = targetValue - currentValue;

    deficits.push({
      type,
      targetPct,
      currentValue,
      targetValue,
      deficit,
    });
  }

  // Sort classes by highest deficit first.
  // Deterministic tie-breaker by class name.
  deficits.sort((a, b) => {
    const diff = b.deficit - a.deficit;
    if (Math.abs(diff) > 1e-6) return diff;
    return a.type.localeCompare(b.type);
  });

  const candidates: StrategyCandidate[] = [];
  let remainingBudget = availableAmount;

  // 3. For each prioritized class, select top eligible assets
  for (const classDeficit of deficits) {
    if (remainingBudget <= 0) break;

    const classPositions = eligiblePositions.filter(
      (p) => getDisplayAssetType(p.type) === classDeficit.type,
    );
    if (classPositions.length === 0) continue;

    // Rank assets within the class by highest safety margin first, breaking ties by ticker alphabetically
    const sortedPositions = [...classPositions].sort((a, b) => {
      const marginA = a.valuation?.margin ?? a.safetyMargin ?? 0;
      const marginB = b.valuation?.margin ?? b.safetyMargin ?? 0;
      const diff = marginB - marginA;
      if (Math.abs(diff) > 1e-4) return diff;
      return a.ticker.localeCompare(b.ticker);
    });

    // Budget assigned to this class (up to its deficit or remaining budget)
    const classBudget = classDeficit.deficit > 0
      ? Math.min(classDeficit.deficit, remainingBudget)
      : remainingBudget;

    let classBudgetRemaining = classBudget;

    for (const pos of sortedPositions) {
      if (classBudgetRemaining <= 0 || remainingBudget <= 0) break;
      const price = pos.livePrice ?? pos.currentPrice ?? 0;
      if (price <= 0 || price > classBudgetRemaining) continue;

      const qty = Math.floor(classBudgetRemaining / price);
      if (qty <= 0) continue;

      const spent = qty * price;
      classBudgetRemaining -= spent;
      remainingBudget -= spent;

      const margin = pos.valuation?.margin ?? pos.safetyMargin ?? 0;

      candidates.push({
        ticker: pos.ticker,
        suggestedQuantity: qty,
        reasonKey: "askEngine.reasons.farthestBelowTarget",
        reasonParams: {
          classType: pos.type,
          margin: Number(margin.toFixed(1)),
        },
      });
    }
  }

  return candidates;
}

export const balanceTargetsStrategy: Strategy = {
  id: "balanceTargets",
  labelKey: "askEngine.strategies.balanceTargets",
  requiresTargets: true,
  run: runBalanceTargets,
};
