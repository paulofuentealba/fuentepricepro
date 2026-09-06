import { describe, it, expect } from "vitest";
import { migrateLegacyAllocationKeys, type UserSettings } from "../useUserSettings";

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    targetYield: 6,
    displayCurrency: "BRL",
    smartAllocationTargets: {
      STOCK_BR: 0,
      STOCK_US: 0,
      FII: 0,
      REIT: 0,
      ETF: 0,
      FIXED_INCOME: 0,
    },
    ...overrides,
  };
}

describe("migrateLegacyAllocationKeys", () => {
  it("returns the same reference when there is nothing to migrate", () => {
    const settings = makeSettings();
    expect(migrateLegacyAllocationKeys(settings)).toBe(settings);
  });

  it("sums FII_INFRA and FIAGRO weights into FII and removes the legacy keys", () => {
    const settings = makeSettings({
      smartAllocationTargets: {
        STOCK_BR: 40,
        FII: 20,
        FII_INFRA: 10,
        FIAGRO: 10,
        REIT: 0,
        ETF: 0,
        FIXED_INCOME: 20,
      },
    });

    const migrated = migrateLegacyAllocationKeys(settings);

    expect(migrated.smartAllocationTargets).toEqual({
      STOCK_BR: 40,
      FII: 40, // 20 + 10 + 10
      REIT: 0,
      ETF: 0,
      FIXED_INCOME: 20,
    });
  });

  it("adopts the legacy classTargetYields value for FII when FII itself was never set (FII_INFRA takes precedence)", () => {
    const settings = makeSettings({
      classTargetYields: { FII_INFRA: 8, FIAGRO: 9 },
    });

    const migrated = migrateLegacyAllocationKeys(settings);

    expect(migrated.classTargetYields).toEqual({ FII: 8 });
  });

  it("adopts FIAGRO's yield when only FIAGRO is set", () => {
    const settings = makeSettings({
      classTargetYields: { FIAGRO: 9 },
    });

    const migrated = migrateLegacyAllocationKeys(settings);

    expect(migrated.classTargetYields).toEqual({ FII: 9 });
  });

  it("keeps FII's own classTargetYields value if already configured, discarding the legacy ones", () => {
    const settings = makeSettings({
      classTargetYields: { FII: 12, FII_INFRA: 8, FIAGRO: 9 },
    });

    const migrated = migrateLegacyAllocationKeys(settings);

    expect(migrated.classTargetYields).toEqual({ FII: 12 });
  });

  it("migrates smartAllocationTargets and classTargetYields independently in one pass", () => {
    const settings = makeSettings({
      smartAllocationTargets: {
        STOCK_BR: 50,
        FII: 30,
        FII_INFRA: 10,
        FIAGRO: 10,
        REIT: 0,
        ETF: 0,
        FIXED_INCOME: 0,
      },
      classTargetYields: { FII_INFRA: 7 },
    });

    const migrated = migrateLegacyAllocationKeys(settings);

    expect(migrated.smartAllocationTargets.FII).toBe(50);
    expect(migrated.smartAllocationTargets).not.toHaveProperty("FII_INFRA");
    expect(migrated.smartAllocationTargets).not.toHaveProperty("FIAGRO");
    expect(migrated.classTargetYields).toEqual({ FII: 7 });
  });

  it("ignores negative legacy weights instead of subtracting from FII", () => {
    const settings = makeSettings({
      smartAllocationTargets: {
        FII: 20,
        FII_INFRA: -5,
        FIAGRO: 10,
      },
    });

    const migrated = migrateLegacyAllocationKeys(settings);

    expect(migrated.smartAllocationTargets.FII).toBe(30); // 20 + 0 (ignored) + 10
    expect(migrated.allocationKeysMigrated).toBe(true);
  });

  it("never re-sums legacy weights on subsequent passes if allocationKeysMigrated is true", () => {
    // Pass 1: Initial migration
    const initial = makeSettings({
      smartAllocationTargets: {
        FII: 20,
        FII_INFRA: 10,
        FIAGRO: 5,
      },
    });
    const pass1 = migrateLegacyAllocationKeys(initial);
    expect(pass1.smartAllocationTargets.FII).toBe(35); // 20 + 10 + 5
    expect(pass1.allocationKeysMigrated).toBe(true);

    // Pass 2: Suppose Firestore or a stale cache re-injected legacy keys
    const reInjected = {
      ...pass1,
      smartAllocationTargets: {
        ...pass1.smartAllocationTargets,
        FII_INFRA: 10,
        FIAGRO: 5,
      },
    };
    const pass2 = migrateLegacyAllocationKeys(reInjected);
    // FII MUST stay 35, NOT increase to 50!
    expect(pass2.smartAllocationTargets.FII).toBe(35);
    expect(pass2.smartAllocationTargets).not.toHaveProperty("FII_INFRA");
    expect(pass2.smartAllocationTargets).not.toHaveProperty("FIAGRO");
  });
});
