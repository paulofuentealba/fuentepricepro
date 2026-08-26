import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { AskEngineSettings, ExcludedAsset } from "./types";

export interface ExclusionResult {
  eligible: ValuedWatchlistItem[];
  excluded: ExcludedAsset[];
}

/**
 * Pure function that filters positions based on explicit user criteria.
 * Guarantees zero silent exclusions: every removed asset is recorded in `excluded` with a structured reason.
 */
export function applyExclusions(
  positions: ValuedWatchlistItem[],
  settings: AskEngineSettings,
): ExclusionResult {
  const eligible: ValuedWatchlistItem[] = [];
  const excluded: ExcludedAsset[] = [];

  const excludeAboveCeiling = settings.excludeAboveCeiling ?? false;
  const excludeYieldTraps = settings.excludeYieldTraps ?? false;

  for (const pos of positions) {
    if (!pos || typeof pos.ticker !== "string") {
      continue;
    }

    const livePrice = pos.livePrice ?? pos.currentPrice ?? 0;

    // 1. Invalid or missing price
    if (!Number.isFinite(livePrice) || livePrice <= 0) {
      excluded.push({
        ticker: pos.ticker,
        reasonKey: "askEngine.reasons.excludedInvalidPrice",
      });
      continue;
    }

    const ceiling = pos.valuation?.activeCeiling ?? pos.ceilingPrice ?? 0;
    const margin = pos.valuation?.margin ?? pos.safetyMargin ?? 0;

    // 2. User Criterion: Exclude assets above consensus / ceiling price
    if (excludeAboveCeiling) {
      const isAboveCeiling = (ceiling > 0 && livePrice > ceiling) || margin < 0;
      if (isAboveCeiling) {
        excluded.push({
          ticker: pos.ticker,
          reasonKey: "askEngine.reasons.excludedAboveCeiling",
          reasonParams: {
            price: Number(livePrice.toFixed(2)),
            ceiling: Number(ceiling.toFixed(2)),
            margin: Number(margin.toFixed(2)),
          },
        });
        continue;
      }
    }

    // 3. User Criterion: Exclude yield trap warnings
    if (excludeYieldTraps) {
      const isTrap = pos.valuation?.yieldTrapWarning === true;
      if (isTrap) {
        excluded.push({
          ticker: pos.ticker,
          reasonKey: "askEngine.reasons.excludedYieldTrap",
        });
        continue;
      }
    }

    // Passed all active criteria
    eligible.push(pos);
  }

  return { eligible, excluded };
}
