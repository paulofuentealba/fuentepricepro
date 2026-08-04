import { describe, expect, it } from "vitest";
import {
  calculateProfileTier,
  determineResumptionStep,
  DEFAULT_INVESTOR_PROFILE,
} from "../investor-profile";

describe("calculateProfileTier", () => {
  it("classifies as Conservative when reaction is 'sell'", () => {
    const res1 = calculateProfileTier({ reaction: "sell", goal: "growth" });
    expect(res1.tier).toBe("conservative");
    expect(res1.sublabel).toBe("growth");

    const res2 = calculateProfileTier({ reaction: "sell", goal: "income" });
    expect(res2.tier).toBe("conservative");
    expect(res2.sublabel).toBe("income");
  });

  it("classifies as Aggressive when reaction is 'buy' and goal is 'growth'", () => {
    const res = calculateProfileTier({ reaction: "buy", goal: "growth" });
    expect(res.tier).toBe("aggressive");
    expect(res.sublabel).toBe("growth");
  });

  it("classifies as Moderate for any other combination", () => {
    // reaction: buy, goal: income -> Moderate
    const res1 = calculateProfileTier({ reaction: "buy", goal: "income" });
    expect(res1.tier).toBe("moderate");
    expect(res1.sublabel).toBe("income");

    // reaction: hold, goal: growth -> Moderate
    const res2 = calculateProfileTier({ reaction: "hold", goal: "growth" });
    expect(res2.tier).toBe("moderate");
    expect(res2.sublabel).toBe("growth");

    // reaction: hold, goal: both -> Moderate
    const res3 = calculateProfileTier({ reaction: "hold", goal: "both" });
    expect(res3.tier).toBe("moderate");
    expect(res3.sublabel).toBe("income");
  });

  it("handles null/undefined/empty profile gracefully", () => {
    const resEmpty = calculateProfileTier(null);
    expect(resEmpty.tier).toBe("moderate");
    expect(resEmpty.sublabel).toBe("income");

    const resDefault = calculateProfileTier(DEFAULT_INVESTOR_PROFILE);
    expect(resDefault.tier).toBe("moderate");
    expect(resDefault.sublabel).toBe("income");
  });
});

describe("determineResumptionStep", () => {
  it("returns step 0 (Welcome) when profile is empty or completed", () => {
    expect(determineResumptionStep(null)).toBe(0);
    expect(determineResumptionStep(DEFAULT_INVESTOR_PROFILE)).toBe(0);
    expect(determineResumptionStep({ ...DEFAULT_INVESTOR_PROFILE, completedAt: 123456789 })).toBe(0);
  });

  it("returns step 1 when goal is missing", () => {
    expect(determineResumptionStep({ goal: null, horizon: "mid" })).toBe(1);
  });

  it("returns step 2 when goal is present but horizon is missing", () => {
    expect(determineResumptionStep({ goal: "income", horizon: null })).toBe(2);
  });

  it("returns step 3 when goal and horizon are present, but reaction is missing", () => {
    expect(determineResumptionStep({ goal: "income", horizon: "long", reaction: null })).toBe(3);
  });

  it("returns step 4 when goal, horizon, reaction are present, but experience is missing", () => {
    expect(
      determineResumptionStep({ goal: "income", horizon: "long", reaction: "buy", experience: null })
    ).toBe(4);
  });

  it("returns step 5 (Result) when all 4 questions are answered", () => {
    expect(
      determineResumptionStep({ goal: "income", horizon: "long", reaction: "buy", experience: "advanced" })
    ).toBe(5);
  });
});
