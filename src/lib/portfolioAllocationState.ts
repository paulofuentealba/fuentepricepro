import type { AssetType } from "@/lib/domain";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { getDisplayAssetType } from "@/lib/formatters";
import { convertCurrency } from "@/lib/currency";

export interface SubClassAllocation {
  rawType: AssetType | string;
  currentValue: number;
  currentPct: number;
}

export interface ClassAllocationState {
  type: AssetType;
  /** 0-1, the class's share of smartAllocationTargets' total weight. */
  targetPct: number;
  currentValue: number;
  totalCurrentValue: number;
  /** 0-1, currentValue / totalCurrentValue (0 when the portfolio is empty). */
  currentPct: number;
  /** Decomposição detalhada dos ativos da classe na carteira (ex: FII, FIAGRO, FII_INFRA; ETF US, ETF BR). */
  subAllocations?: SubClassAllocation[];
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
  /** When provided, converts each position's value to BRL before summing (the correct behavior
   * — matches useFIProgress's canonical totalCapitalBRL). Omitted here to keep balanceTargets.ts
   * byte-for-byte behavior-identical to before this extraction; the Screener passes a real rate. */
  fxRate?: number,
  /** When true, includes classes even if their target weight is 0 (useful for portfolio display). */
  includeZeroTargets: boolean = false,
): Map<AssetType, ClassAllocationState> {
  const classCurrentValue: Partial<Record<AssetType, number>> = {};
  const classSubValues: Partial<Record<AssetType, Record<string, number>>> = {};
  let totalCurrentValue = 0;

  for (const pos of positions) {
    if (pos.isClosedPosition) continue;
    const qty = pos.quantity ?? 0;
    if (qty <= 0) continue;
    const livePrice = pos.livePrice ?? pos.currentPrice ?? 0;
    const rawValue = qty * livePrice;
    const value = fxRate != null ? convertCurrency(rawValue, pos.currency, "BRL", fxRate) : rawValue;
    const type = getDisplayAssetType(pos.type);
    classCurrentValue[type] = (classCurrentValue[type] || 0) + value;
    totalCurrentValue += value;

    let subKey: string = pos.type;
    if (pos.type === "ETF") {
      subKey = pos.currency === "USD" ? "ETF_US" : "ETF_BR";
    }
    if (!classSubValues[type]) {
      classSubValues[type] = {};
    }
    classSubValues[type]![subKey] = (classSubValues[type]![subKey] || 0) + value;
  }

  const totalTargetWeight = Object.values(targets || {}).reduce(
    (sum: number, w) => sum + (typeof w === "number" && w > 0 ? w : 0),
    0,
  );

  const result = new Map<AssetType, ClassAllocationState>();
  if (totalTargetWeight <= 0 && !includeZeroTargets) return result;

  for (const [typeKey, weight] of Object.entries(targets || {})) {
    const type = typeKey as AssetType;
    const w = typeof weight === "number" && weight > 0 ? weight : 0;
    if (w <= 0 && !includeZeroTargets) continue;

    const currentValue = classCurrentValue[type] || 0;
    const subMap = classSubValues[type] || {};
    const subAllocations: SubClassAllocation[] = Object.entries(subMap)
      .map(([rawType, val]) => ({
        rawType,
        currentValue: val,
        currentPct: totalCurrentValue > 0 ? val / totalCurrentValue : 0,
      }))
      .sort((a, b) => b.currentValue - a.currentValue);

    result.set(type, {
      type,
      targetPct: totalTargetWeight > 0 ? w / totalTargetWeight : 0,
      currentValue,
      totalCurrentValue,
      currentPct: totalCurrentValue > 0 ? currentValue / totalCurrentValue : 0,
      subAllocations,
    });
  }

  return result;
}
