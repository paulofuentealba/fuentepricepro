import type { AssetType } from "./domain";
import type { StrategyKey } from "./allocation";
import type { WatchlistItem } from "./watchlist";
import { calculateProfileTier, type InvestorProfile, type ProfileCountry } from "./investor-profile";

export const ASSET_TYPES_ORDER: AssetType[] = [
  "STOCK_BR",
  "STOCK_US",
  "FII",
  "REIT",
  "ETF",
  "FII_INFRA",
  "FIAGRO",
  "FIXED_INCOME",
];

/** Builds a `Record<AssetType, number>` with every type set to `fill` (default 0). */
function zeroedByType(fill: number = 0): Record<AssetType, number> {
  return ASSET_TYPES_ORDER.reduce(
    (acc, type) => {
      acc[type] = fill;
      return acc;
    },
    {} as Record<AssetType, number>,
  );
}

/**
 * Base allocation templates per profile tier & sublabel (in percentage points).
 * Sum of each template is exactly 100%.
 */
export const PROFILE_BASE_ALLOCATION: Record<string, Record<AssetType, number>> = {
  conservative_income: {
    STOCK_BR: 10,
    STOCK_US: 8,
    FII: 25,
    REIT: 0,
    ETF: 7,
    FII_INFRA: 8,
    FIAGRO: 7,
    FIXED_INCOME: 35,
  },
  conservative_growth: {
    STOCK_BR: 13,
    STOCK_US: 12,
    FII: 20,
    REIT: 5,
    ETF: 10,
    FII_INFRA: 5,
    FIAGRO: 5,
    FIXED_INCOME: 30,
  },
  moderate_income: {
    STOCK_BR: 20,
    STOCK_US: 12,
    FII: 25,
    REIT: 5,
    ETF: 8,
    FII_INFRA: 8,
    FIAGRO: 7,
    FIXED_INCOME: 15,
  },
  moderate_growth: {
    STOCK_BR: 22,
    STOCK_US: 18,
    FII: 20,
    REIT: 10,
    ETF: 10,
    FII_INFRA: 5,
    FIAGRO: 5,
    FIXED_INCOME: 10,
  },
  aggressive_income: {
    STOCK_BR: 28,
    STOCK_US: 17,
    FII: 20,
    REIT: 10,
    ETF: 10,
    FII_INFRA: 5,
    FIAGRO: 5,
    FIXED_INCOME: 5,
  },
  aggressive_growth: {
    STOCK_BR: 32,
    STOCK_US: 23,
    FII: 15,
    REIT: 10,
    ETF: 10,
    FII_INFRA: 5,
    FIAGRO: 5,
    FIXED_INCOME: 0,
  },
};

/**
 * Strategy Bias Multipliers for all 8 AssetTypes explicitly defined.
 */
export const STRATEGY_BIAS_MULTIPLIERS: Record<StrategyKey, Record<AssetType, number>> = {
  yield: {
    STOCK_BR: 1.0,
    STOCK_US: 0.9,
    FII: 1.3,
    REIT: 1.2,
    ETF: 0.8,
    FII_INFRA: 1.2,
    FIAGRO: 1.3,
    FIXED_INCOME: 0.7,
  },
  snowball: {
    STOCK_BR: 1.2,
    STOCK_US: 1.0,
    FII: 1.3,
    REIT: 1.0,
    ETF: 0.9,
    FII_INFRA: 1.1,
    FIAGRO: 1.1,
    FIXED_INCOME: 0.8,
  },
  defensive: {
    STOCK_BR: 0.8,
    STOCK_US: 0.7,
    FII: 1.2,
    REIT: 0.8,
    ETF: 1.1,
    FII_INFRA: 1.2,
    FIAGRO: 1.0,
    FIXED_INCOME: 1.5,
  },
  gapFiller: {
    STOCK_BR: 1.0,
    STOCK_US: 1.0,
    FII: 1.0,
    REIT: 1.0,
    ETF: 1.0,
    FII_INFRA: 1.0,
    FIAGRO: 1.0,
    FIXED_INCOME: 1.0,
  },
  margin: {
    STOCK_BR: 1.0,
    STOCK_US: 1.0,
    FII: 1.0,
    REIT: 1.0,
    ETF: 1.0,
    FII_INFRA: 1.0,
    FIAGRO: 1.0,
    FIXED_INCOME: 1.0,
  },
};

/**
 * Calculates dynamic bias multipliers for the 'margin' (Margin Focus) strategy
 * based on the average safety margin per asset type in the watchlist.
 */
export function computeMarginBiasMultipliers(items: WatchlistItem[]): Record<AssetType, number> {
  const sums: Record<AssetType, number> = zeroedByType();
  const counts: Record<AssetType, number> = zeroedByType();

  for (const item of items) {
    if (typeof item.safetyMargin === "number" && item.safetyMargin > 0) {
      sums[item.type] = (sums[item.type] || 0) + item.safetyMargin;
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
  }

  const result: Record<AssetType, number> = zeroedByType(1.0);

  for (const type of ASSET_TYPES_ORDER) {
    if (counts[type] > 0) {
      const avgMargin = sums[type] / counts[type];
      result[type] = 1 + Math.min(avgMargin / 100, 0.5);
    }
  }

  return result;
}

/**
 * Pure function to compute target allocation percentages based on investor profile
 * and active strategies.
 * Returns a Record<AssetType, number> whose values sum to EXACTLY 100.
 */
export function computeSuggestedAllocation(
  profile?: Partial<InvestorProfile> | null,
  strategies: StrategyKey[] = [],
  items: WatchlistItem[] = [],
): Record<AssetType, number> {
  const { tier, sublabel } = calculateProfileTier(profile);
  const key = `${tier}_${sublabel}`;
  const base = PROFILE_BASE_ALLOCATION[key] || PROFILE_BASE_ALLOCATION.moderate_income;

  const marginMultipliers = computeMarginBiasMultipliers(items);

  const combinedMultiplier: Record<AssetType, number> = zeroedByType(1.0);

  if (strategies.length > 0) {
    for (const type of ASSET_TYPES_ORDER) {
      let mult = 1.0;
      for (const strat of strategies) {
        if (strat === "margin") {
          mult *= marginMultipliers[type];
        } else {
          mult *= (STRATEGY_BIAS_MULTIPLIERS[strat]?.[type] ?? 1.0);
        }
      }
      combinedMultiplier[type] = mult;
    }
  }

  const weighted: Record<AssetType, number> = zeroedByType();

  let totalWeight = 0;
  for (const type of ASSET_TYPES_ORDER) {
    const w = (base[type] || 0) * combinedMultiplier[type];
    weighted[type] = w;
    totalWeight += w;
  }

  if (totalWeight <= 0) {
    return { ...base };
  }

  const rounded: Record<AssetType, number> = zeroedByType();

  // Largest Remainder Method (Hare-Niemeyer Algorithm)
  // Guarantees exact sum of 100% while strictly minimizing rounding distortion across buckets.
  let sumFloors = 0;
  const remainders: { type: AssetType; remainder: number; orderIndex: number }[] = [];

  ASSET_TYPES_ORDER.forEach((type, orderIndex) => {
    const exact = (weighted[type] / totalWeight) * 100;
    const floor = Math.floor(exact);
    rounded[type] = floor;
    sumFloors += floor;
    remainders.push({
      type,
      remainder: exact - floor,
      orderIndex,
    });
  });

  const remainderCount = 100 - sumFloors;
  if (remainderCount > 0) {
    remainders.sort((a, b) => {
      const diff = b.remainder - a.remainder;
      if (Math.abs(diff) > 1e-9) return diff;
      return a.orderIndex - b.orderIndex;
    });

    for (let i = 0; i < remainderCount && i < remainders.length; i++) {
      rounded[remainders[i].type] += 1;
    }
  }

  return rounded;
}

/**
 * Asset classes with no equivalent for a US-based investor: FII, FII_INFRA and FIAGRO are
 * B3-listed real estate/agribusiness funds with Brazil-specific tax treatment, and STOCK_BR is
 * the B3 equity market itself — none of these are something a US onboarding flow should suggest.
 */
export const US_INELIGIBLE_CLASSES: AssetType[] = ["STOCK_BR", "FII", "FII_INFRA", "FIAGRO"];

/**
 * Country-aware post-processing for the onboarding "suggested allocation" preview only — does
 * NOT alter computeSuggestedAllocation()/PROFILE_BASE_ALLOCATION themselves, which stay the
 * single SSOT matrix consumed by GoalWizard/AskEngine for real (implicitly Brazil-eligible)
 * portfolios regardless of the investor's country.
 *
 * For country === 'US': zeroes out the 4 Brazil-only classes and redistributes their combined
 * percentage proportionally across the remaining eligible classes, using the same Largest
 * Remainder rounding as computeSuggestedAllocation so the result still sums to exactly 100.
 * For any other country (or null/undefined): returns the allocation unchanged.
 */
export function restrictAllocationToCountry(
  allocation: Record<AssetType, number>,
  country: ProfileCountry | null | undefined,
): Record<AssetType, number> {
  if (country !== "US") return allocation;

  const eligibleTypes = ASSET_TYPES_ORDER.filter((type) => !US_INELIGIBLE_CLASSES.includes(type));
  const eligibleSum = eligibleTypes.reduce((sum, type) => sum + (allocation[type] || 0), 0);

  const result = { ...allocation };
  for (const type of US_INELIGIBLE_CLASSES) result[type] = 0;

  if (eligibleSum <= 0) {
    // Degenerate case (shouldn't happen — every base template keeps FIXED_INCOME/STOCK_US
    // above 0): fall back to an equal split across eligible classes.
    const equalShare = Math.floor(100 / eligibleTypes.length);
    eligibleTypes.forEach((type, i) => {
      result[type] = i === 0 ? 100 - equalShare * (eligibleTypes.length - 1) : equalShare;
    });
    return result;
  }

  let sumFloors = 0;
  const remainders: { type: AssetType; remainder: number; orderIndex: number }[] = [];

  eligibleTypes.forEach((type, orderIndex) => {
    const exact = ((allocation[type] || 0) / eligibleSum) * 100;
    const floor = Math.floor(exact);
    result[type] = floor;
    sumFloors += floor;
    remainders.push({ type, remainder: exact - floor, orderIndex });
  });

  const remainderCount = 100 - sumFloors;
  if (remainderCount > 0) {
    remainders.sort((a, b) => {
      const diff = b.remainder - a.remainder;
      if (Math.abs(diff) > 1e-9) return diff;
      return a.orderIndex - b.orderIndex;
    });
    for (let i = 0; i < remainderCount && i < remainders.length; i++) {
      result[remainders[i].type] += 1;
    }
  }

  return result;
}
