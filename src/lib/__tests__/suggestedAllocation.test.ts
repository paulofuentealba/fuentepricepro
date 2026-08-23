import { describe, it, expect } from "vitest";
import {
  computeSuggestedAllocation,
  computeMarginBiasMultipliers,
  PROFILE_BASE_ALLOCATION,
  STRATEGY_BIAS_MULTIPLIERS,
  ASSET_TYPES_ORDER,
} from "../suggestedAllocation";
import type { WatchlistItem } from "../watchlist";
import type { InvestorProfile, ProfileGoal, ProfileReaction } from "../investor-profile";
import type { StrategyKey } from "../allocation";

function mkItem(type: WatchlistItem["type"], safetyMargin: number): WatchlistItem {
  return {
    id: `item-${type}`,
    ticker: `T-${type}`,
    name: "Test Asset",
    type,
    currency: "BRL",
    currentPrice: 100,
    annualDividend: 10,
    targetYield: 6,
    ceilingPrice: 150,
    safetyMargin,
    quantity: 10,
    averagePrice: 90,
    paymentMonths: [1, 2, 3],
    payoutRatio: 0.5,
    customTaxRate: null,
    sector: null,
    addedAt: Date.now(),
    investingSince: Date.now(),
  };
}

describe("suggestedAllocation", () => {
  describe("PROFILE_BASE_ALLOCATION & STRATEGY_BIAS_MULTIPLIERS integrity", () => {
    it("ensures all base templates contain all 8 AssetType keys and sum to 100", () => {
      for (const [key, template] of Object.entries(PROFILE_BASE_ALLOCATION)) {
        for (const type of ASSET_TYPES_ORDER) {
          expect(template[type], `Template ${key} missing key ${type}`).toBeDefined();
          expect(typeof template[type]).toBe("number");
        }
        const sum = Object.values(template).reduce((a, b) => a + b, 0);
        expect(sum, `Template ${key} sum should be 100`).toBe(100);
      }
    });

    it("ensures all static strategy bias multipliers contain all 8 AssetType keys", () => {
      for (const [strat, biasMap] of Object.entries(STRATEGY_BIAS_MULTIPLIERS)) {
        for (const type of ASSET_TYPES_ORDER) {
          expect(biasMap[type], `Strategy ${strat} missing key ${type}`).toBeDefined();
          expect(typeof biasMap[type]).toBe("number");
        }
      }
    });
  });

  describe("computeSuggestedAllocation", () => {
    it("scenario 1: conservative income profile without strategies -> returns conservative base sum 100", () => {
      const profile: Partial<InvestorProfile> = {
        reaction: "sell",
        goal: "income",
        completedAt: Date.now(),
      };
      const result = computeSuggestedAllocation(profile, []);
      
      for (const type of ASSET_TYPES_ORDER) {
        expect(result[type]).toBeDefined();
      }
      const sum = Object.values(result).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
      expect(result.FIXED_INCOME).toBe(35);
      expect(result.FII).toBe(25);
    });

    it("scenario 2: moderate growth profile with yield strategy -> yields sum 100", () => {
      const profile: Partial<InvestorProfile> = {
        reaction: "hold",
        goal: "growth",
        completedAt: Date.now(),
      };
      const result = computeSuggestedAllocation(profile, ["yield"]);
      
      const sum = Object.values(result).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
      // Yield strategy boosts FII and FIAGRO
      expect(result.FII).toBeGreaterThan(0);
    });

    it("scenario 3: aggressive growth profile with 2 strategies (yield + snowball) -> yields sum 100", () => {
      const profile: Partial<InvestorProfile> = {
        reaction: "buy",
        goal: "growth",
        completedAt: Date.now(),
      };
      const result = computeSuggestedAllocation(profile, ["yield", "snowball"]);
      
      const sum = Object.values(result).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
      expect(result.FIXED_INCOME).toBe(0);
    });

    it("scenario 4: skipped/null profile -> falls back to moderate income and sums 100", () => {
      const resultSkipped = computeSuggestedAllocation({ skipped: true }, ["defensive"]);
      const sumSkipped = Object.values(resultSkipped).reduce((a, b) => a + b, 0);
      expect(sumSkipped).toBe(100);
      // Defensive strategy boosts FIXED_INCOME
      expect(resultSkipped.FIXED_INCOME).toBeGreaterThan(15);

      const resultNull = computeSuggestedAllocation(null, ["yield"]);
      const sumNull = Object.values(resultNull).reduce((a, b) => a + b, 0);
      expect(sumNull).toBe(100);
    });
  });

  describe("computeMarginBiasMultipliers", () => {
    it("calculates dynamic margin bias from watchlist safety margins", () => {
      const items: WatchlistItem[] = [
        mkItem("STOCK_BR", 50), // 50% discount -> 1 + min(0.5, 0.5) = 1.5
        mkItem("FII", 20), // 20% discount -> 1 + min(0.2, 0.5) = 1.2
        mkItem("REIT", -10), // negative safety margin -> ignored (1.0)
      ];

      const mults = computeMarginBiasMultipliers(items);

      expect(mults.STOCK_BR).toBeCloseTo(1.5);
      expect(mults.FII).toBeCloseTo(1.2);
      expect(mults.REIT).toBe(1.0);
      expect(mults.FIXED_INCOME).toBe(1.0);
    });

    it("uses dynamic margin strategy inside computeSuggestedAllocation and sums to 100", () => {
      const items: WatchlistItem[] = [
        mkItem("STOCK_BR", 40),
        mkItem("STOCK_US", 30),
      ];

      const result = computeSuggestedAllocation(null, ["margin"], items);
      const sum = Object.values(result).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
      expect(result.STOCK_BR).toBeGreaterThan(0);
    });
  });

  describe("Hare-Niemeyer Rounding Parity across all 36 Profile & Strategy Permutations", () => {
    const reactions: ProfileReaction[] = ["sell", "hold", "buy"];
    const goals: ProfileGoal[] = ["income", "growth", "both"];
    const strategiesCombinations: StrategyKey[][] = [
      [],
      ["yield"],
      ["defensive"],
      ["yield", "snowball"],
    ];

    const testMatrix: {
      reaction: ProfileReaction;
      goal: ProfileGoal;
      strategies: StrategyKey[];
    }[] = [];

    for (const reaction of reactions) {
      for (const goal of goals) {
        for (const strats of strategiesCombinations) {
          testMatrix.push({ reaction, goal, strategies: strats });
        }
      }
    }

    it.each(testMatrix)(
      "Reaction: $reaction | Goal: $goal | Strategies: $strategies -> sums to exactly 100 with non-negative integers",
      ({ reaction, goal, strategies }) => {
        const profile: Partial<InvestorProfile> = {
          reaction,
          goal,
          completedAt: Date.now(),
        };

        const allocation = computeSuggestedAllocation(profile, strategies);

        // 1. Verify all 8 asset types are non-negative integers
        for (const type of ASSET_TYPES_ORDER) {
          const val = allocation[type];
          expect(Number.isInteger(val), `Bucket ${type} must be an integer (got ${val})`).toBe(true);
          expect(val, `Bucket ${type} must be non-negative`).toBeGreaterThanOrEqual(0);
          expect(val, `Bucket ${type} cannot exceed 100`).toBeLessThanOrEqual(100);
        }

        // 2. Verify exact 100% sum
        const total = Object.values(allocation).reduce((acc, curr) => acc + curr, 0);
        expect(total).toBe(100);
      }
    );
  });
});
