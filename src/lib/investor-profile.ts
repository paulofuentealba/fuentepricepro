export type ProfileGoal = "income" | "growth" | "both";
export type ProfileHorizon = "short" | "mid" | "long";
export type ProfileReaction = "sell" | "hold" | "buy";
export type ProfileExperience = "beginner" | "mid" | "advanced";

export type ProfileTier = "conservative" | "moderate" | "aggressive";
export type ProfileSublabel = "income" | "growth";

export interface InvestorProfile {
  version: number;
  completedAt: number | null;
  goal: ProfileGoal | null;
  horizon: ProfileHorizon | null;
  reaction: ProfileReaction | null;
  experience: ProfileExperience | null;
  skipped: boolean;
}

export const DEFAULT_INVESTOR_PROFILE: InvestorProfile = {
  version: 1,
  completedAt: null,
  goal: null,
  horizon: null,
  reaction: null,
  experience: null,
  skipped: false,
};

/**
 * Pure function to calculate investor profile tier and focus sublabel.
 * - reaction === 'sell' -> Conservative
 * - reaction === 'buy' && goal === 'growth' -> Aggressive
 * - Otherwise -> Moderate
 *
 * Sublabel:
 * - goal === 'growth' -> Focused on Growth
 * - Otherwise -> Focused on Income
 */
export function calculateProfileTier(profile?: Partial<InvestorProfile> | null): {
  tier: ProfileTier;
  sublabel: ProfileSublabel;
} {
  const p = profile ?? {};
  let tier: ProfileTier = "moderate";

  if (p.reaction === "sell") {
    tier = "conservative";
  } else if (p.reaction === "buy" && p.goal === "growth") {
    tier = "aggressive";
  } else {
    tier = "moderate";
  }

  const sublabel: ProfileSublabel = p.goal === "growth" ? "growth" : "income";

  return { tier, sublabel };
}

/**
 * Pure function to determine the initial step to resume the questionnaire based on existing answers.
 * Returns:
 * - 0: Welcome step (if empty or already completed)
 * - 1: Goal step (if goal is missing)
 * - 2: Horizon step (if horizon is missing)
 * - 3: Reaction step (if reaction is missing)
 * - 4: Experience step (if experience is missing)
 * - 5: Result step (if all 4 questions answered)
 */
export function determineResumptionStep(profile?: Partial<InvestorProfile> | null): number {
  if (!profile || profile.completedAt) return 0;
  if (!profile.goal && !profile.horizon && !profile.reaction && !profile.experience) {
    return 0;
  }
  if (!profile.goal) return 1;
  if (!profile.horizon) return 2;
  if (!profile.reaction) return 3;
  if (!profile.experience) return 4;
  return 5;
}
