import { describe, it, expect } from "vitest";
import {
  resolveTargetYield,
  CLASS_MARKET_REFERENCE_YIELDS,
  type ResolvedTargetYield,
} from "../calculations";
import type { AssetType } from "../domain";

describe("Target Yield Resolution Hierarchy (Prompt 131 / Item 1.1)", () => {
  it("resolves Level 1 (Item specific) when item has custom targetYield > 0, overriding class and global", () => {
    const item = {
      type: "STOCK_BR" as AssetType,
      targetYield: 7.5,
    };
    const settings = {
      targetYield: 6.0,
      classTargetYields: {
        STOCK_BR: 8.0,
      },
    };

    const resolved: ResolvedTargetYield = resolveTargetYield(item, settings);
    expect(resolved.effectiveYield).toBe(7.5);
    expect(resolved.source).toBe("item");
  });

  it("resolves Level 2 (Class target) when item has no targetYield, overriding global", () => {
    const item = {
      type: "FII" as AssetType,
      targetYield: null,
    };
    const settings = {
      targetYield: 6.0,
      classTargetYields: {
        FII: 8.5,
      },
    };

    const resolved: ResolvedTargetYield = resolveTargetYield(item, settings);
    expect(resolved.effectiveYield).toBe(8.5);
    expect(resolved.source).toBe("class");
  });

  it("resolves Level 3 (Global setting) when item and class are not configured", () => {
    const item = {
      type: "STOCK_US" as AssetType,
    };
    const settings = {
      targetYield: 5.5,
      classTargetYields: {
        STOCK_BR: 8.0,
      },
    };

    const resolved: ResolvedTargetYield = resolveTargetYield(item, settings);
    expect(resolved.effectiveYield).toBe(5.5);
    expect(resolved.source).toBe("global");
  });

  it("resolves Level 3 (Default 6.0%) when settings are completely undefined/null", () => {
    const item = {
      type: "ETF" as AssetType,
    };

    const resolved: ResolvedTargetYield = resolveTargetYield(item, null);
    expect(resolved.effectiveYield).toBe(6.0);
    expect(resolved.source).toBe("global");
  });

  it("treats absent/empty classTargetYields as unconfigured (falls through to global, not zero)", () => {
    const item = {
      type: "REIT" as AssetType,
    };
    const settings = {
      targetYield: 6.0,
      classTargetYields: {},
    };

    const resolved: ResolvedTargetYield = resolveTargetYield(item, settings);
    expect(resolved.effectiveYield).toBe(6.0);
    expect(resolved.source).toBe("global");
  });

  it("treats 0 or negative classTargetYields as invalid/unconfigured (falls through to global)", () => {
    const item = {
      type: "FIAGRO" as AssetType,
    };
    const settings = {
      targetYield: 6.0,
      classTargetYields: {
        FIAGRO: 0,
      },
    };

    const resolved: ResolvedTargetYield = resolveTargetYield(item, settings);
    expect(resolved.effectiveYield).toBe(6.0);
    expect(resolved.source).toBe("global");
  });

  it("contains valid market reference yields for all 8 asset classes", () => {
    const expectedClasses: AssetType[] = [
      "STOCK_BR",
      "STOCK_US",
      "FII",
      "REIT",
      "ETF",
      "FII_INFRA",
      "FIAGRO",
      "FIXED_INCOME",
    ];

    for (const assetClass of expectedClasses) {
      expect(CLASS_MARKET_REFERENCE_YIELDS[assetClass]).toBeDefined();
      expect(CLASS_MARKET_REFERENCE_YIELDS[assetClass]).toBeGreaterThan(0);
    }

    expect(CLASS_MARKET_REFERENCE_YIELDS.STOCK_BR).toBe(6.0);
    expect(CLASS_MARKET_REFERENCE_YIELDS.FII).toBe(8.0);
    expect(CLASS_MARKET_REFERENCE_YIELDS.STOCK_US).toBe(4.0);
  });

  it("updates getAssetValuation activeCeiling when classTargetYields changes", async () => {
    const { getAssetValuation } = await import("../calculations");

    const item = {
      type: "FII" as AssetType,
      currentPrice: 100.0,
      annualDividend: 10.0,
    };

    // 1. Default global 6% -> Bazin = 10 / 0.06 = 166.67
    const defaultSettings = { targetYield: 6.0 };
    const defaultYield = resolveTargetYield(item, defaultSettings).effectiveYield;
    const defaultValuation = getAssetValuation({
      targetYield: defaultYield,
      currentPrice: item.currentPrice,
      avgDividend: item.annualDividend,
      currency: "BRL",
      type: item.type,
    });
    expect(defaultValuation.bazin).toBeCloseTo(166.67, 1);

    // 2. Class Target Yield set to 10% -> Bazin = 10 / 0.10 = 100.0
    const customizedSettings = {
      targetYield: 6.0,
      classTargetYields: {
        FII: 10.0,
      },
    };
    const customizedYield = resolveTargetYield(item, customizedSettings).effectiveYield;
    const customizedValuation = getAssetValuation({
      targetYield: customizedYield,
      currentPrice: item.currentPrice,
      avgDividend: item.annualDividend,
      currency: "BRL",
      type: item.type,
    });
    expect(customizedValuation.bazin).toBeCloseTo(100.0, 1);
  });
});
