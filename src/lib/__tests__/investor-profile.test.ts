import { describe, expect, it } from "vitest";
import { calculateProfileTier, DEFAULT_INVESTOR_PROFILE } from "../investor-profile";

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

describe("calculateProfileTier — full 4-question model", () => {
  it("sums the 4 answers into conservative/moderate/aggressive", () => {
    // total = 1+1+1+1 = 4 -> conservative
    const low = calculateProfileTier({
      horizon: "under1",
      reaction: "sell",
      experience: "beginner",
      goal: "preserve",
    });
    expect(low.tier).toBe("conservative");

    // total = 3+3+3+3 = 12 -> moderate (upper bound of the moderate band)
    const mid = calculateProfileTier({
      horizon: "threeToFive",
      reaction: "hold",
      experience: "intermediate",
      goal: "both",
    });
    expect(mid.tier).toBe("moderate");
    expect(mid.sublabel).toBe("income");

    // total = 4+4+4+4 = 16 -> aggressive
    const high = calculateProfileTier({
      horizon: "over5",
      reaction: "buy",
      experience: "advanced",
      goal: "growth",
    });
    expect(high.tier).toBe("aggressive");
    expect(high.sublabel).toBe("growth");
  });

  it("applies the 'reserva de emergência' rule: horizon under1 always forces conservative", () => {
    const res = calculateProfileTier({
      horizon: "under1",
      reaction: "buy",
      experience: "advanced",
      goal: "growth",
    });
    expect(res.tier).toBe("conservative");
  });

  it("applies the 'trava de conhecimento' rule: beginner + max risk downgrades one tier", () => {
    // Without the override this would score 4+4+1+4 = 13 -> aggressive
    const res = calculateProfileTier({
      horizon: "over5",
      reaction: "buy",
      experience: "beginner",
      goal: "growth",
    });
    expect(res.tier).toBe("moderate");
  });

  it("falls back to the legacy 2-field path when horizon/experience are missing", () => {
    const res = calculateProfileTier({ reaction: "sell", goal: "growth" });
    expect(res.tier).toBe("conservative");
    expect(res.sublabel).toBe("growth");
  });
});
