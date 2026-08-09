import { describe, it, expect } from "vitest";
import { resolveFeatureGate, DEFAULT_FEATURE_GATES } from "../featureGates";

describe("resolveFeatureGate (Pure Unit Tests)", () => {
  describe("Free Tier Behavior", () => {
    it("returns default freeAssetLimit (Infinity, fail-open) when gatesConfig is null or undefined", () => {
      expect(resolveFeatureGate("free", null, "freeAssetLimit")).toBe(Number.POSITIVE_INFINITY);
      expect(resolveFeatureGate("free", undefined, "freeAssetLimit")).toBe(Number.POSITIVE_INFINITY);
    });

    it("returns custom freeAssetLimit when specified in gatesConfig", () => {
      expect(resolveFeatureGate("free", { freeAssetLimit: 12 }, "freeAssetLimit")).toBe(12);
    });

    it("returns true for unknown/undefined boolean feature gates (fail-open default)", () => {
      expect(resolveFeatureGate("free", null, "customGate")).toBe(true);
      expect(resolveFeatureGate("free", {}, "customGate")).toBe(true);
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
    it("preserves default gates config object as fail-open (freeAssetLimit = Infinity)", () => {
      expect(DEFAULT_FEATURE_GATES.freeAssetLimit).toBe(Number.POSITIVE_INFINITY);
    });

    it("handles partial config objects without crashing", () => {
      const partialConfig = { someOtherGate: true } as any;
      expect(resolveFeatureGate("free", partialConfig, "freeAssetLimit")).toBe(Number.POSITIVE_INFINITY);
      expect(resolveFeatureGate("pro", partialConfig, "freeAssetLimit")).toBe(Number.POSITIVE_INFINITY);
    });
  });
});
