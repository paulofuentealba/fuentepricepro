import { describe, it, expect } from "vitest";
import { validateFeatureGatesPayload, mapAuthUserToAdminRow } from "../admin";

describe("validateFeatureGatesPayload", () => {
  it("accepts a payload with only known boolean keys", () => {
    const result = validateFeatureGatesPayload({ cashflowUnlocked: false, strategiesUnlocked: true });
    expect(result).toEqual({ cashflowUnlocked: false, strategiesUnlocked: true });
  });

  it("accepts a valid freeAssetLimit", () => {
    const result = validateFeatureGatesPayload({ freeAssetLimit: 8 });
    expect(result).toEqual({ freeAssetLimit: 8 });
  });

  it("rejects unknown keys", () => {
    expect(() => validateFeatureGatesPayload({ unknownField: true })).toThrow(/campo desconhecido/);
  });

  it("rejects a non-numeric freeAssetLimit", () => {
    expect(() => validateFeatureGatesPayload({ freeAssetLimit: "8" as any })).toThrow(/freeAssetLimit/);
  });

  it("rejects a negative freeAssetLimit", () => {
    expect(() => validateFeatureGatesPayload({ freeAssetLimit: -1 })).toThrow(/freeAssetLimit/);
  });

  it("rejects a non-boolean value for a boolean gate key", () => {
    expect(() => validateFeatureGatesPayload({ cashflowUnlocked: "yes" as any })).toThrow(/booleano/);
  });

  it("accepts an empty payload", () => {
    expect(validateFeatureGatesPayload({})).toEqual({});
  });
});

describe("mapAuthUserToAdminRow (data minimization boundary)", () => {
  const authUser = {
    uid: "abc123",
    displayName: "Paulo Fuentealba",
    email: "paulo@example.com",
    metadata: { creationTime: "2024-01-01T00:00:00Z", lastSignInTime: "2026-08-01T00:00:00Z" },
    providerData: [{ providerId: "google.com" }],
    // Extra fields that must NOT leak through, simulating a fuller Firebase Auth record.
    customClaims: { isAdmin: true },
    phoneNumber: "+5511999999999",
  } as any;

  it("returns exactly the 6 allowed fields, and nothing else", () => {
    const row = mapAuthUserToAdminRow(authUser, "pro");

    expect(Object.keys(row).sort()).toEqual(
      ["createdAt", "displayName", "email", "lastLoginAt", "providerId", "subscriptionStatus"].sort(),
    );
    expect(row).not.toHaveProperty("uid");
    expect(row).not.toHaveProperty("customClaims");
    expect(row).not.toHaveProperty("phoneNumber");
  });

  it("maps values correctly", () => {
    const row = mapAuthUserToAdminRow(authUser, "pro");
    expect(row).toEqual({
      displayName: "Paulo Fuentealba",
      email: "paulo@example.com",
      subscriptionStatus: "pro",
      createdAt: "2024-01-01T00:00:00Z",
      lastLoginAt: "2026-08-01T00:00:00Z",
      providerId: "google.com",
    });
  });

  it("falls back to null for missing optional fields", () => {
    const row = mapAuthUserToAdminRow(
      { displayName: null, email: null, metadata: {}, providerData: [] },
      null,
    );
    expect(row).toEqual({
      displayName: null,
      email: null,
      subscriptionStatus: null,
      createdAt: null,
      lastLoginAt: null,
      providerId: null,
    });
  });
});
