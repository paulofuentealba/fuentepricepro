import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { UserSettings } from "@/lib/useUserSettings";
import type { AssetType } from "@/lib/domain";

/**
 * Explicit slice of UserSettings consumed by the AskEngine.
 * Adheres strictly to Rule 1: Reuses UserSettings SSOT, no parallel configuration types.
 */
export type AskEngineSettings = Pick<
  UserSettings,
  | "smartAllocationTargets"
  | "excludeAboveCeiling"
  | "excludeYieldTraps"
  | "maxConcentrationPerAsset"
  | "maxConcentrationPerClass"
>;

export interface AskContext {
  positions: ValuedWatchlistItem[];
  availableAmount: number;
  settings: AskEngineSettings;
  /** ISO timestamp string representing the reference time for calculations (replaces Date.now()). */
  asOf: string;
}

/**
 * Context provided to a strategy containing only pre-filtered eligible positions.
 */
export interface AskStrategyContext {
  eligiblePositions: ValuedWatchlistItem[];
  availableAmount: number;
  settings: AskEngineSettings;
  asOf: string;
}

/**
 * Candidate recommended by a strategy.
 *
 * Sizing Precedence Rule:
 * 1. If `suggestedQuantity` (> 0) is provided, engine uses it directly.
 * 2. Else if `allocatedAmount` (> 0) is provided, engine converts via `Math.floor(allocatedAmount / livePrice)`.
 * 3. If both are provided, `suggestedQuantity` takes precedence.
 * 4. If neither is provided (or <= 0), quantity is 0 and candidate is omitted.
 */
export interface StrategyCandidate {
  ticker: string;
  suggestedQuantity?: number;
  allocatedAmount?: number;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
}

export interface Allocation {
  ticker: string;
  amountBRL: number;
  quantity: number;
  percentOfTotal: number;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
}

export interface ExcludedAsset {
  ticker: string;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
}

export interface Consequence {
  kind: "income" | "gap" | "metric";
  valueKey: string;
  value: number | string;
}

export type AskResultState =
  | "success"
  | "targets_not_configured"
  | "insufficient_funds"
  | "no_eligible_assets";

export interface AskResult {
  state: AskResultState;
  allocations: Allocation[];
  leftover: number;
  excluded: ExcludedAsset[];
  consequences: Consequence[];
}

export interface Strategy {
  id: string;
  labelKey: string;
  /**
   * If true (default), the engine requires smartAllocationTargets to be configured with positive sum.
   */
  requiresTargets?: boolean;
  run: (ctx: AskStrategyContext) => StrategyCandidate[];
}
