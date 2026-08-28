import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { useInvestorProfile } from "@/lib/useInvestorProfile";
import { type ProfileGoal, type ProfileReaction } from "@/lib/investor-profile";
import { Button } from "@/components/ui/button";
import {
  Coins,
  TrendingUp,
  Scale,
  ArrowDownCircle,
  Minus,
  ArrowUpCircle,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface InvestorProfileFlowProps {
  onComplete?: () => void;
  /** If true, rendered as full-screen modal overlay */
  isModal?: boolean;
}

export function InvestorProfileFlow({ onComplete, isModal = true }: InvestorProfileFlowProps) {
  const { t } = useI18n();
  const { profile, updateProfile, isPending } = useInvestorProfile();
  const O = t.onboarding;

  const hasResumedRef = useRef(false);

  const [selectedGoal, setSelectedGoal] = useState<ProfileGoal | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<ProfileReaction | null>(null);

  // Prefill from any previously saved answers once the profile query resolves.
  useEffect(() => {
    if (isPending || hasResumedRef.current) return;
    hasResumedRef.current = true;
    setSelectedGoal(profile.goal);
    setSelectedReaction(profile.reaction);
  }, [isPending, profile]);

  const handleSkipAll = () => {
    updateProfile({ skipped: true, completedAt: null });
    if (onComplete) onComplete();
  };

  const handleContinue = () => {
    if (!selectedGoal || !selectedReaction) return;
    updateProfile({ goal: selectedGoal, reaction: selectedReaction, completedAt: Date.now(), skipped: false });
    if (onComplete) onComplete();
  };

  if (isPending) {
    const loadingCard = (
      <div className="w-full max-w-lg mx-auto bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-accent-text animate-spin" />
        <p className="text-xs text-muted-foreground">{t.common.loading}</p>
      </div>
    );
    if (isModal) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80">
          {loadingCard}
        </div>
      );
    }
    return loadingCard;
  }

  const content = (
    <div className="w-full max-w-lg mx-auto bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="space-y-8">
            <div className="text-center space-y-1.5">
              <h2 className="font-serif text-2xl font-medium text-foreground tracking-tight">
                {O.welcome.title}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {O.welcome.subtitle}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-lg font-medium text-foreground tracking-tight">
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
                      type="button"
                      onClick={() => setSelectedGoal(id as ProfileGoal)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-colors ${
                        isSelected
                          ? "border-accent bg-accent/10 text-accent-text font-semibold"
                          : "border-border bg-card hover:border-accent/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${isSelected ? "text-accent-text" : "text-muted-foreground"}`} />
                        <span className="text-sm">{label}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-accent-text" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-lg font-medium text-foreground tracking-tight">
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
                      type="button"
                      onClick={() => setSelectedReaction(id as ProfileReaction)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-colors ${
                        isSelected
                          ? "border-accent bg-accent/10 text-accent-text font-semibold"
                          : "border-border bg-card hover:border-accent/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${isSelected ? "text-accent-text" : "text-muted-foreground"}`} />
                        <span className="text-sm">{label}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-accent-text" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSkipAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {O.welcome.skipAllBtn}
              </button>
              <Button
                onClick={handleContinue}
                disabled={!selectedGoal || !selectedReaction}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {O.questions.continue}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
        </div>
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
