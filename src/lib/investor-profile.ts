// "income"/"both" kept for backward compatibility with profiles saved before the 4-question
// model — "preserve"/"protect" are the two income-flavored options the new "Objetivo Principal"
// question exposes instead of the old single "income" bucket.
export type ProfileGoal = "income" | "preserve" | "protect" | "both" | "growth";
// Renamed to the 4-bucket horizon used by the new question. Both ProfileHorizon and
// ProfileExperience were unused outside this file/InvestorProfileFlow before this change, so
// there are no legacy stored values to preserve.
export type ProfileHorizon = "under1" | "oneToThree" | "threeToFive" | "over5";
// "sellPart" is new — sits between "sell" (resgata tudo) and "hold" on the 4-point risk scale.
export type ProfileReaction = "sell" | "sellPart" | "hold" | "buy";
export type ProfileExperience = "beginner" | "basic" | "intermediate" | "advanced";
export type ProfileCountry = "BR" | "US";

export type ProfileTier = "conservative" | "moderate" | "aggressive";
export type ProfileSublabel = "income" | "growth";

export interface InvestorProfile {
  version: number;
  completedAt: number | null;
  /** Where the user invests — drives onboarding copy/currency framing only, never the numeric
   * allocation matrix (single SSOT matrix in suggestedAllocation.ts regardless of country). */
  country: ProfileCountry | null;
  goal: ProfileGoal | null;
  horizon: ProfileHorizon | null;
  reaction: ProfileReaction | null;
  experience: ProfileExperience | null;
  skipped: boolean;
}

export const DEFAULT_INVESTOR_PROFILE: InvestorProfile = {
  version: 1,
  completedAt: null,
  country: null,
  goal: null,
  horizon: null,
  reaction: null,
  experience: null,
  skipped: false,
};

const HORIZON_POINTS: Record<ProfileHorizon, number> = {
  under1: 1,
  oneToThree: 2,
  threeToFive: 3,
  over5: 4,
};

const REACTION_POINTS: Record<ProfileReaction, number> = {
  sell: 1,
  sellPart: 2,
  hold: 3,
  buy: 4,
};

const EXPERIENCE_POINTS: Record<ProfileExperience, number> = {
  beginner: 1,
  basic: 2,
  intermediate: 3,
  advanced: 4,
};

const GOAL_POINTS: Record<ProfileGoal, number> = {
  preserve: 1,
  income: 2, // legacy value, treated as the "protect" bucket for scoring purposes
  protect: 2,
  both: 3,
  growth: 4,
};

const TIER_ORDER: ProfileTier[] = ["conservative", "moderate", "aggressive"];

function scoreToTier(total: number): ProfileTier {
  if (total <= 7) return "conservative";
  if (total <= 12) return "moderate";
  return "aggressive";
}

function downgradeTier(tier: ProfileTier): ProfileTier {
  const idx = TIER_ORDER.indexOf(tier);
  return TIER_ORDER[Math.max(0, idx - 1)];
}

/**
 * Pure function to calculate investor profile tier and focus sublabel.
 *
 * Two paths, both pure and deterministic:
 *
 * 1. Full 4-question model (horizon + reaction + experience + goal all answered — the new
 *    6-screen onboarding flow): sums 1-4 points per question (4-16 total) into the 3 existing
 *    tiers, then applies 2 business-rule overrides from the suitability doc:
 *    - "Regra de Reserva de Emergência": horizon === 'under1' forces Conservative.
 *    - "Trava de Conhecimento": experience === 'beginner' + reaction === 'buy' (max risk
 *      tolerance) downgrades the computed tier by one step.
 *
 * 2. Legacy 2-field path (only reaction/goal answered — old profiles, and any caller that
 *    doesn't supply horizon/experience): unchanged branching kept byte-for-byte so existing
 *    saved profiles and computeSuggestedAllocation() callers keep the exact same result.
 *    - reaction === 'sell' -> Conservative
 *    - reaction === 'buy' && goal === 'growth' -> Aggressive
 *    - Otherwise -> Moderate
 *
 * Sublabel (both paths):
 * - goal === 'growth' -> Focused on Growth
 * - Otherwise -> Focused on Income
 */
export function calculateProfileTier(profile?: Partial<InvestorProfile> | null): {
  tier: ProfileTier;
  sublabel: ProfileSublabel;
  /** Raw 4-16 point sum — only present when the full 4-question model applies. Intended for
   * visual affordances (e.g. a gauge needle position), not for display as a raw number. */
  total?: number;
} {
  const p = profile ?? {};
  const sublabel: ProfileSublabel = p.goal === "growth" ? "growth" : "income";

  if (p.horizon && p.experience && p.reaction && p.goal) {
    const total =
      HORIZON_POINTS[p.horizon] +
      REACTION_POINTS[p.reaction] +
      EXPERIENCE_POINTS[p.experience] +
      GOAL_POINTS[p.goal];

    let tier = scoreToTier(total);
    if (p.horizon === "under1") {
      tier = "conservative";
    } else if (p.experience === "beginner" && p.reaction === "buy") {
      tier = downgradeTier(tier);
    }

    return { tier, sublabel, total };
  }

  let tier: ProfileTier = "moderate";
  if (p.reaction === "sell") {
    tier = "conservative";
  } else if (p.reaction === "buy" && p.goal === "growth") {
    tier = "aggressive";
  }

  return { tier, sublabel };
}
