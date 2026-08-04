import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { useInvestorProfile } from "@/lib/useInvestorProfile";
import {
  calculateProfileTier,
  type ProfileGoal,
  type ProfileHorizon,
  type ProfileReaction,
  type ProfileExperience,
} from "@/lib/investor-profile";
import { Button } from "@/components/ui/button";
import {
  Target,
  Coins,
  TrendingUp,
  Scale,
  Clock,
  Calendar,
  Hourglass,
  ArrowDownCircle,
  Minus,
  ArrowUpCircle,
  Sprout,
  BarChart3,
  Crown,
  Shield,
  Rocket,
  Check,
  ChevronRight,
  ArrowLeft,
  X,
} from "lucide-react";

interface InvestorProfileFlowProps {
  onComplete?: () => void;
  /** If true, rendered as full-screen modal overlay */
  isModal?: boolean;
}

export function InvestorProfileFlow({ onComplete, isModal = true }: InvestorProfileFlowProps) {
  const { t } = useI18n();
  const { profile, updateProfile } = useInvestorProfile();
  const O = t.onboarding;

  // Step 0: Welcome, 1: Goal, 2: Horizon, 3: Reaction, 4: Experience, 5: Result
  const [step, setStep] = useState<number>(0);

  // Resume partial progress if user opens questionnaire with existing partial answers
  useEffect(() => {
    if (profile.completedAt) {
      // Already completed -> start at step 0 if retaking
      return;
    }

    if (!profile.goal && !profile.horizon && !profile.reaction && !profile.experience) {
      setStep(0);
      return;
    }

    // Resume at first unanswered step
    if (!profile.goal) setStep(1);
    else if (!profile.horizon) setStep(2);
    else if (!profile.reaction) setStep(3);
    else if (!profile.experience) setStep(4);
    else setStep(5);
  }, []);

  const [selectedGoal, setSelectedGoal] = useState<ProfileGoal | null>(profile.goal);
  const [selectedHorizon, setSelectedHorizon] = useState<ProfileHorizon | null>(profile.horizon);
  const [selectedReaction, setSelectedReaction] = useState<ProfileReaction | null>(profile.reaction);
  const [selectedExperience, setSelectedExperience] = useState<ProfileExperience | null>(profile.experience);

  // Sync state if profile changes asynchronously
  useEffect(() => {
    if (profile.goal !== undefined) setSelectedGoal(profile.goal);
    if (profile.horizon !== undefined) setSelectedHorizon(profile.horizon);
    if (profile.reaction !== undefined) setSelectedReaction(profile.reaction);
    if (profile.experience !== undefined) setSelectedExperience(profile.experience);
  }, [profile]);

  const handleSkipAll = () => {
    updateProfile({ skipped: true, completedAt: null });
    if (onComplete) onComplete();
  };

  const handleFinish = () => {
    updateProfile({ completedAt: Date.now(), skipped: false });
    if (onComplete) onComplete();
  };

  const handleSelectGoal = (val: ProfileGoal) => {
    setSelectedGoal(val);
    updateProfile({ goal: val });
    setTimeout(() => setStep(2), 200);
  };

  const handleSelectHorizon = (val: ProfileHorizon) => {
    setSelectedHorizon(val);
    updateProfile({ horizon: val });
    setTimeout(() => setStep(3), 200);
  };

  const handleSelectReaction = (val: ProfileReaction) => {
    setSelectedReaction(val);
    updateProfile({ reaction: val });
    setTimeout(() => setStep(4), 200);
  };

  const handleSelectExperience = (val: ProfileExperience) => {
    setSelectedExperience(val);
    updateProfile({ experience: val });
    setTimeout(() => setStep(5), 200);
  };

  const { tier, sublabel } = calculateProfileTier({
    goal: selectedGoal,
    horizon: selectedHorizon,
    reaction: selectedReaction,
    experience: selectedExperience,
  });

  const getTierIcon = () => {
    if (tier === "conservative") return Shield;
    if (tier === "aggressive") return Rocket;
    return Scale;
  };

  const TierIcon = getTierIcon();

  const content = (
    <div className="w-full max-w-lg mx-auto bg-card/95 border border-border/60 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Top Header / Progress bar */}
      {step >= 1 && step <= 4 && (
        <div className="w-full bg-muted/30 pt-4 px-6 pb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
            <span className="font-medium text-emerald-400">
              {O.questions.step.replace("{{current}}", String(step))}
            </span>
          </div>
          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-6 md:p-8">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Target className="w-8 h-8 text-emerald-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {O.welcome.title}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {O.welcome.subtitle}
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={() => setStep(1)}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
              >
                {O.welcome.startBtn}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={handleSkipAll}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
              >
                {O.welcome.skipAllBtn}
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Goal */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-foreground tracking-tight">
              {O.questions.q1.title}
            </h3>

            <div className="space-y-3">
              {[
                { id: "income", label: O.questions.q1.income, icon: Coins },
                { id: "growth", label: O.questions.q1.growth, icon: TrendingUp },
                { id: "both", label: O.questions.q1.both, icon: Scale },
              ].map(({ id, label, icon: Icon }) => {
                const isSelected = selectedGoal === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectGoal(id as ProfileGoal)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/12 text-emerald-400 font-medium shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "border-border/60 bg-card/50 hover:border-emerald-500/40 hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isSelected ? "text-emerald-500" : "text-muted-foreground"}`} />
                      <span className="text-sm">{label}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-500" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {O.questions.skipStep}
              </button>
              <Button
                onClick={() => setStep(2)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              >
                {O.questions.continue}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Horizon */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-foreground tracking-tight">
              {O.questions.q2.title}
            </h3>

            <div className="space-y-3">
              {[
                { id: "short", label: O.questions.q2.short, icon: Clock },
                { id: "mid", label: O.questions.q2.mid, icon: Calendar },
                { id: "long", label: O.questions.q2.long, icon: Hourglass },
              ].map(({ id, label, icon: Icon }) => {
                const isSelected = selectedHorizon === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectHorizon(id as ProfileHorizon)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/12 text-emerald-400 font-medium shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "border-border/60 bg-card/50 hover:border-emerald-500/40 hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isSelected ? "text-emerald-500" : "text-muted-foreground"}`} />
                      <span className="text-sm">{label}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-500" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(3)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {O.questions.skipStep}
              </button>
              <Button
                onClick={() => setStep(3)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              >
                {O.questions.continue}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Reaction */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-foreground tracking-tight">
              {O.questions.q3.title}
            </h3>

            <div className="space-y-3">
              {[
                { id: "sell", label: O.questions.q3.sell, icon: ArrowDownCircle },
                { id: "hold", label: O.questions.q3.hold, icon: Minus },
                { id: "buy", label: O.questions.q3.buy, icon: ArrowUpCircle },
              ].map(({ id, label, icon: Icon }) => {
                const isSelected = selectedReaction === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectReaction(id as ProfileReaction)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/12 text-emerald-400 font-medium shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "border-border/60 bg-card/50 hover:border-emerald-500/40 hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isSelected ? "text-emerald-500" : "text-muted-foreground"}`} />
                      <span className="text-sm">{label}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-500" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(4)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {O.questions.skipStep}
              </button>
              <Button
                onClick={() => setStep(4)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              >
                {O.questions.continue}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Experience */}
        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-foreground tracking-tight">
              {O.questions.q4.title}
            </h3>

            <div className="space-y-3">
              {[
                { id: "beginner", label: O.questions.q4.beginner, icon: Sprout },
                { id: "mid", label: O.questions.q4.mid, icon: BarChart3 },
                { id: "advanced", label: O.questions.q4.advanced, icon: Crown },
              ].map(({ id, label, icon: Icon }) => {
                const isSelected = selectedExperience === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectExperience(id as ProfileExperience)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/12 text-emerald-400 font-medium shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "border-border/60 bg-card/50 hover:border-emerald-500/40 hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isSelected ? "text-emerald-500" : "text-muted-foreground"}`} />
                      <span className="text-sm">{label}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-500" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(5)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {O.questions.skipStep}
              </button>
              <Button
                onClick={() => setStep(5)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              >
                {O.questions.continue}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Result */}
        {step === 5 && (
          <div className="text-center space-y-6 py-2">
            {/* Visual Badge (~104px diameter) */}
            <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
              {/* Outer dashed ring */}
              <div className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-emerald-500/45 animate-spin-slow" />
              {/* Inner circle with radial emerald gradient */}
              <div className="w-22 h-22 rounded-full bg-gradient-to-b from-emerald-500/20 to-emerald-950/40 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                <TierIcon className="w-10 h-10 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {O.result.title}
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {O.result.subtitle}
              </p>
            </div>

            {/* Profile Result Card */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                {O.result.tiers[tier]}
              </div>
              <div className="text-xs font-medium text-emerald-300">
                {O.result.sublabels[sublabel]}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                {O.result.descriptions[tier]}
              </p>
            </div>

            <Button
              onClick={handleFinish}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
            >
              {O.result.finishBtn}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return content;
}
