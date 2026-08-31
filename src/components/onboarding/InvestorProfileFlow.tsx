import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { useInvestorProfile } from "@/lib/useInvestorProfile";
import { useUserSettings } from "@/lib/useUserSettings";
import {
  calculateProfileTier,
  type InvestorProfile,
  type ProfileCountry,
  type ProfileExperience,
  type ProfileGoal,
  type ProfileHorizon,
  type ProfileReaction,
} from "@/lib/investor-profile";
import {
  computeSuggestedAllocation,
  restrictAllocationToCountry,
  US_INELIGIBLE_CLASSES,
} from "@/lib/suggestedAllocation";
import type { AssetType } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Clock,
  ArrowDownCircle,
  MinusCircle,
  Equal,
  ArrowUpCircle,
  Sprout,
  Leaf,
  TreePine,
  GraduationCap,
  Shield,
  Umbrella,
  Scale,
  Rocket,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Info,
} from "lucide-react";

interface InvestorProfileFlowProps {
  onComplete?: () => void;
  /** If true, rendered as full-screen modal overlay */
  isModal?: boolean;
}

type StepKey = "country" | "horizon" | "risk" | "knowledge" | "goal" | "result";
const QUESTION_STEPS: StepKey[] = ["horizon", "risk", "knowledge", "goal"];
const STEPS: StepKey[] = ["country", ...QUESTION_STEPS, "result"];

// Order the 8 asset classes returned by computeSuggestedAllocation are shown in on the result
// bars — same SSOT matrix used by GoalWizard/AskEngine, just kept in a stable display order for
// the onboarding preview.
const ALLOC_DISPLAY_ORDER: AssetType[] = [
  "FIXED_INCOME",
  "FII",
  "FII_INFRA",
  "FIAGRO",
  "STOCK_BR",
  "STOCK_US",
  "REIT",
  "ETF",
];

const HORIZON_OPTIONS: { value: ProfileHorizon; icon: typeof Clock }[] = [
  { value: "under1", icon: Clock },
  { value: "oneToThree", icon: Clock },
  { value: "threeToFive", icon: Clock },
  { value: "over5", icon: Clock },
];

const RISK_OPTIONS: { value: ProfileReaction; icon: typeof Clock }[] = [
  { value: "sell", icon: ArrowDownCircle },
  { value: "sellPart", icon: MinusCircle },
  { value: "hold", icon: Equal },
  { value: "buy", icon: ArrowUpCircle },
];

const KNOWLEDGE_OPTIONS: { value: ProfileExperience; icon: typeof Clock }[] = [
  { value: "beginner", icon: Sprout },
  { value: "basic", icon: Leaf },
  { value: "intermediate", icon: TreePine },
  { value: "advanced", icon: GraduationCap },
];

// "income" is a legacy-only ProfileGoal value (pre-4-question profiles) never offered as an
// option in this new flow — narrow the option list's type so it doesn't need a dict entry.
const GOAL_OPTIONS: { value: Exclude<ProfileGoal, "income">; icon: typeof Clock }[] = [
  { value: "preserve", icon: Shield },
  { value: "protect", icon: Umbrella },
  { value: "both", icon: Scale },
  { value: "growth", icon: Rocket },
];

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex flex-1 items-stretch gap-[3px] overflow-hidden rounded-full bg-muted p-[1px]">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="relative flex-1 overflow-hidden rounded-full">
          <div
            className={cn(
              "absolute inset-0 origin-left rounded-full bg-gradient-to-r from-accent to-accent-text transition-transform duration-500 ease-out",
              i < current ? "scale-x-100" : "scale-x-0",
            )}
          />
        </div>
      ))}
    </div>
  );
}

function OptionButton({
  selected,
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  selected: boolean;
  icon: typeof Clock;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-all min-h-[48px]",
        selected
          ? "border-accent bg-accent/[0.13] shadow-[0_0_0_1px_theme(colors.accent.DEFAULT/0.5)_inset]"
          : "border-border bg-card/60 hover:-translate-y-px hover:border-accent/55",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] transition-colors",
          selected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="flex-1">
        <span
          className={cn("block text-sm font-semibold leading-tight", selected && "text-accent-text")}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
          {desc}
        </span>
      </span>
      <span
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all",
          selected ? "border-accent bg-accent" : "border-border",
        )}
      >
        <Check className={cn("h-[11px] w-[11px] text-accent-foreground", selected ? "opacity-100" : "opacity-0")} />
      </span>
    </button>
  );
}

export function InvestorProfileFlow({ onComplete, isModal = true }: InvestorProfileFlowProps) {
  const { t } = useI18n();
  const { profile, updateProfile, isPending } = useInvestorProfile();
  const { updateSettings } = useUserSettings();
  const O = t.onboarding;

  const hasResumedRef = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [country, setCountry] = useState<ProfileCountry | null>(null);
  const [horizon, setHorizon] = useState<ProfileHorizon | null>(null);
  const [reaction, setReaction] = useState<ProfileReaction | null>(null);
  const [experience, setExperience] = useState<ProfileExperience | null>(null);
  const [goal, setGoal] = useState<ProfileGoal | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (isPending || hasResumedRef.current) return;
    hasResumedRef.current = true;
    setCountry(profile.country);
    setHorizon(profile.horizon);
    setReaction(profile.reaction);
    setExperience(profile.experience);
    setGoal(profile.goal);
  }, [isPending, profile]);

  const handleSkipAll = () => {
    updateProfile({ skipped: true, completedAt: null });
    if (onComplete) onComplete();
  };

  const goTo = (index: number) => setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));

  const finishAnswers = (): Partial<InvestorProfile> => ({
    country,
    horizon,
    reaction,
    experience,
    goal,
    completedAt: Date.now(),
    skipped: false,
  });

  const applySuggestedAllocation = () => {
    const answers = finishAnswers();
    const suggested = restrictAllocationToCountry(computeSuggestedAllocation(answers), answers.country);
    updateSettings({ smartAllocationTargets: suggested });
  };

  const handleApply = () => {
    updateProfile(finishAnswers());
    applySuggestedAllocation();
    setApplied(true);
    window.setTimeout(() => {
      if (onComplete) onComplete();
    }, 650);
  };

  const handleManual = () => {
    updateProfile(finishAnswers());
    applySuggestedAllocation();
    if (onComplete) onComplete();
  };

  if (isPending) {
    const loadingCard = (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center space-y-3 rounded-2xl border border-border bg-card p-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-text" />
        <p className="text-xs text-muted-foreground">{t.common.loading}</p>
      </div>
    );
    if (isModal) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          {loadingCard}
        </div>
      );
    }
    return loadingCard;
  }

  const stepKey = STEPS[stepIndex];

  const content = (
    <div className="mx-auto w-full max-w-lg overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-3 px-5 pt-5">
        <button
          type="button"
          onClick={() => goTo(stepIndex - 1)}
          disabled={stepIndex === 0}
          aria-label={O.questions.back}
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-accent/60 hover:text-foreground disabled:opacity-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <ProgressBar current={QUESTION_STEPS.indexOf(stepKey) + (stepKey === "result" ? 4 : 0)} total={4} />
      </div>

      <div className="min-h-[420px] px-5 pb-6 pt-2.5">
        {stepKey === "country" && (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-accent-text">
              {O.country.eyebrow}
            </p>
            <h2 className="mb-2 font-serif text-2xl font-medium tracking-tight text-foreground">
              {O.country.title}
            </h2>
            <p className="mb-6 max-w-[34ch] text-[13.5px] leading-relaxed text-muted-foreground">
              {O.country.sub}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCountry("BR");
                  goTo(1);
                }}
                className={cn(
                  "flex flex-col items-center gap-2.5 rounded-[20px] border p-5 text-center transition-all hover:-translate-y-0.5",
                  country === "BR"
                    ? "border-accent bg-accent/[0.13] shadow-[0_0_0_1px_theme(colors.accent.DEFAULT/0.5)_inset]"
                    : "border-border bg-card/60 hover:border-accent/55",
                )}
              >
                <span className="text-[34px] leading-none drop-shadow-sm">🇧🇷</span>
                <span className="font-serif text-base font-medium">{O.country.br.name}</span>
                <span className="text-[11px] text-muted-foreground">{O.country.br.note}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCountry("US");
                  goTo(1);
                }}
                className={cn(
                  "flex flex-col items-center gap-2.5 rounded-[20px] border p-5 text-center transition-all hover:-translate-y-0.5",
                  country === "US"
                    ? "border-accent bg-accent/[0.13] shadow-[0_0_0_1px_theme(colors.accent.DEFAULT/0.5)_inset]"
                    : "border-border bg-card/60 hover:border-accent/55",
                )}
              >
                <span className="text-[34px] leading-none drop-shadow-sm">🇺🇸</span>
                <span className="font-serif text-base font-medium">{O.country.us.name}</span>
                <span className="text-[11px] text-muted-foreground">{O.country.us.note}</span>
              </button>
            </div>
            <div className="mt-8">
              <button
                type="button"
                onClick={handleSkipAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {O.questions.skipForNow}
              </button>
            </div>
          </div>
        )}

        {stepKey === "horizon" && (
          <QuestionScreen
            eyebrow={O.questions.horizon.eyebrow}
            title={O.questions.horizon.title}
            sub={O.questions.horizon.sub}
            continueLabel={O.questions.continue}
            skipLabel={O.questions.skipForNow}
            canContinue={!!horizon}
            onSkip={handleSkipAll}
            onContinue={() => goTo(stepIndex + 1)}
          >
            {HORIZON_OPTIONS.map(({ value, icon }) => (
              <OptionButton
                key={value}
                selected={horizon === value}
                icon={icon}
                title={O.questions.horizon.options[value].title}
                desc={O.questions.horizon.options[value].desc}
                onClick={() => setHorizon(value)}
              />
            ))}
          </QuestionScreen>
        )}

        {stepKey === "risk" && (
          <QuestionScreen
            eyebrow={O.questions.risk.eyebrow}
            title={O.questions.risk.title}
            sub={O.questions.risk.sub}
            continueLabel={O.questions.continue}
            skipLabel={O.questions.skipForNow}
            canContinue={!!reaction}
            onSkip={handleSkipAll}
            onContinue={() => goTo(stepIndex + 1)}
          >
            {RISK_OPTIONS.map(({ value, icon }) => (
              <OptionButton
                key={value}
                selected={reaction === value}
                icon={icon}
                title={O.questions.risk.options[value].title}
                desc={O.questions.risk.options[value].desc}
                onClick={() => setReaction(value)}
              />
            ))}
          </QuestionScreen>
        )}

        {stepKey === "knowledge" && (
          <QuestionScreen
            eyebrow={O.questions.knowledge.eyebrow}
            title={O.questions.knowledge.title}
            sub={O.questions.knowledge.sub}
            continueLabel={O.questions.continue}
            skipLabel={O.questions.skipForNow}
            canContinue={!!experience}
            onSkip={handleSkipAll}
            onContinue={() => goTo(stepIndex + 1)}
          >
            {KNOWLEDGE_OPTIONS.map(({ value, icon }) => (
              <OptionButton
                key={value}
                selected={experience === value}
                icon={icon}
                title={O.questions.knowledge.options[value].title}
                desc={O.questions.knowledge.options[value].desc}
                onClick={() => setExperience(value)}
              />
            ))}
          </QuestionScreen>
        )}

        {stepKey === "goal" && (
          <QuestionScreen
            eyebrow={O.questions.goal.eyebrow}
            title={O.questions.goal.title}
            sub={O.questions.goal.sub}
            continueLabel={O.questions.continue}
            skipLabel={O.questions.skipForNow}
            canContinue={!!goal}
            onSkip={handleSkipAll}
            onContinue={() => goTo(stepIndex + 1)}
          >
            {GOAL_OPTIONS.map(({ value, icon }) => (
              <OptionButton
                key={value}
                selected={goal === value}
                icon={icon}
                title={O.questions.goal.options[value].title}
                desc={O.questions.goal.options[value].desc}
                onClick={() => setGoal(value)}
              />
            ))}
          </QuestionScreen>
        )}

        {stepKey === "result" && (
          <ResultScreen
            answers={{ country, horizon, reaction, experience, goal }}
            applied={applied}
            onApply={handleApply}
            onManual={handleManual}
          />
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return content;
}

function QuestionScreen({
  eyebrow,
  title,
  sub,
  continueLabel,
  skipLabel,
  canContinue,
  onSkip,
  onContinue,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  continueLabel: string;
  skipLabel: string;
  canContinue: boolean;
  onSkip: () => void;
  onContinue: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-bottom-1 duration-300">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-accent-text">{eyebrow}</p>
      <h2 className="mb-2 font-serif text-2xl font-medium tracking-tight text-foreground">{title}</h2>
      <p className="mb-6 max-w-[34ch] text-[13.5px] leading-relaxed text-muted-foreground">{sub}</p>
      <div className="flex flex-1 flex-col gap-2.5">{children}</div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground">
          {skipLabel}
        </button>
        <Button onClick={onContinue} disabled={!canContinue} className="gap-1.5">
          {continueLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ResultScreen({
  answers,
  applied,
  onApply,
  onManual,
}: {
  answers: Partial<InvestorProfile>;
  applied: boolean;
  onApply: () => void;
  onManual: () => void;
}) {
  const { t } = useI18n();
  const O = t.onboarding;
  const { tier, total } = calculateProfileTier(answers);
  const allocation = restrictAllocationToCountry(computeSuggestedAllocation(answers), answers.country);
  const displayOrder =
    answers.country === "US"
      ? ALLOC_DISPLAY_ORDER.filter((type) => !US_INELIGIBLE_CLASSES.includes(type))
      : ALLOC_DISPLAY_ORDER;

  // -90deg..90deg sweep across the 4-16 possible point totals. `total` is undefined only if the
  // answers are incomplete, which ResultScreen is never rendered with (Continue is gated per
  // question) — default to the middle of the range defensively.
  const angle = -90 + ((((total ?? 10) - 4) / (16 - 4)) * 180);

  return (
    <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-1 duration-300">
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent/45 bg-accent/[0.15] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-text">
        {O.result.eyebrow}
      </span>

      <div className="relative mb-1 h-[92px] w-[176px]">
        <svg viewBox="0 0 180 100" className="h-full w-full overflow-visible">
          <path
            d="M10,90 A80,80 0 0,1 170,90"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            className="text-muted"
          />
          <path
            d="M10,90 A80,80 0 0,1 170,90"
            fill="none"
            stroke="url(#profileGaugeGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            opacity={0.9}
          />
          <defs>
            <linearGradient id="profileGaugeGradient" x1="0" x2="1">
              <stop offset="0%" className="text-primary" stopColor="currentColor" />
              <stop offset="100%" className="text-accent" stopColor="currentColor" />
            </linearGradient>
          </defs>
          <g
            style={{ transformOrigin: "90px 90px", transform: `rotate(${angle}deg)`, transition: "transform 1.1s cubic-bezier(.22,1,.36,1)" }}
          >
            <line x1="90" y1="90" x2="90" y2="22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-foreground" />
            <circle cx="90" cy="90" r="6" fill="currentColor" className="text-foreground" />
          </g>
        </svg>
      </div>

      <h2 className="mb-1 font-serif text-2xl font-medium tracking-tight text-foreground">
        {O.result.tiers[tier]}
      </h2>
      <p className="mb-5 max-w-[36ch] text-[13.5px] leading-relaxed text-muted-foreground">
        {O.result.descriptions[tier]} {O.result.subtitle}
      </p>

      <div className="mb-1 w-full space-y-2.5 text-left">
        {displayOrder.map((type) => (
          <div key={type} className="flex items-center gap-2.5">
            <span className="w-[118px] shrink-0 text-xs font-medium text-foreground">{t.types[type]}</span>
            <span className="h-[9px] flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-1000 ease-out"
                style={{ width: `${allocation[type] ?? 0}%` }}
              />
            </span>
            <span className="w-[34px] shrink-0 text-right font-display text-xs tabular-nums">
              {allocation[type] ?? 0}%
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex w-full items-start gap-2.5 rounded-xl border border-accent/40 bg-accent/[0.08] p-3 text-left text-[11.5px] leading-relaxed text-foreground">
        <Info className="mt-0.5 h-[15px] w-[15px] shrink-0 text-accent-text" />
        <span>{O.result.notice}</span>
      </div>

      <div className="mt-5 flex w-full flex-col gap-2.5">
        <Button onClick={onApply} className="gap-1.5" disabled={applied}>
          {applied ? (
            <>
              <Check className="h-4 w-4" />
              {O.result.appliedBtn}
            </>
          ) : (
            <>
              {O.result.applyBtn}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        <Button onClick={onManual} variant="outline">
          {O.result.manualBtn}
        </Button>
      </div>
    </div>
  );
}
