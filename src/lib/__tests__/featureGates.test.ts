import { describe, it, expect } from "vitest";
import { resolveFeatureGate, DEFAULT_FEATURE_GATES } from "../featureGates";

describe("resolveFeatureGate (Pure Unit Tests)", () => {
  describe("Free Tier Behavior", () => {
    it("returns default freeAssetLimit (8) when gatesConfig is null or undefined", () => {
      expect(resolveFeatureGate("free", null, "freeAssetLimit")).toBe(8);
      expect(resolveFeatureGate("free", undefined, "freeAssetLimit")).toBe(8);
    });

    it("returns custom freeAssetLimit when specified in gatesConfig", () => {
      expect(resolveFeatureGate("free", { freeAssetLimit: 12 }, "freeAssetLimit")).toBe(12);
    });

    it("returns false for unknown/undefined boolean feature gates", () => {
      expect(resolveFeatureGate("free", null, "customGate")).toBe(false);
      expect(resolveFeatureGate("free", {}, "customGate")).toBe(false);
    });

    it("returns configured value for custom boolean gate if provided", () => {
      expect(resolveFeatureGate("free", { customGate: true }, "customGate")).toBe(true);
      expect(resolveFeatureGate("free", { customGate: false }, "customGate")).toBe(false);
    });
  });

  describe("Pro Tier Behavior", () => {
    it("returns Infinity for numeric limits regardless of gatesConfig value", () => {
      expect(resolveFeatureGate("pro", null, "freeAssetLimit")).toBe(Number.POSITIVE_INFINITY);
      expect(resolveFeatureGate("pro", { freeAssetLimit: 5 }, "freeAssetLimit")).toBe(Number.POSITIVE_INFINITY);
      expect(resolveFeatureGate("pro", { freeAssetLimit: 20 }, "freeAssetLimit")).toBe(Number.POSITIVE_INFINITY);
    });

    it("returns true for boolean feature gates for Pro users", () => {
      expect(resolveFeatureGate("pro", null, "customGate")).toBe(true);
      expect(resolveFeatureGate("pro", { customGate: false }, "customGate")).toBe(true);
    });
  });

  describe("Fail-safe & Edge Cases", () => {
    it("preserves default gates config object immutability", () => {
      expect(DEFAULT_FEATURE_GATES.freeAssetLimit).toBe(8);
    });

    it("handles partial config objects without crashing", () => {
      const partialConfig = { someOtherGate: true } as any;
      expect(resolveFeatureGate("free", partialConfig, "freeAssetLimit")).toBe(8);
      expect(resolveFeatureGate("pro", partialConfig, "freeAssetLimit")).toBe(Number.POSITIVE_INFINITY);
    });
  });
});
