import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { auth } from "@/integrations/firebase/client";
import { useI18n } from "@/lib/i18n-provider";
import { GoalWizard } from "@/components/goals/GoalWizard";
import { LanguageSwitcher } from "@/components/ceiling/LanguageSwitcher";
import { verifySessionFn } from "@/lib/verifySession.functions";

export const Route = createFileRoute("/onboarding/metas")({
  beforeLoad: async () => {
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
    });

    if (auth.currentUser) return;

    const { authenticated } = await verifySessionFn();
    if (authenticated) return;

    throw redirect({ to: "/auth", search: { mode: "signup", returnTo: "/onboarding/metas" } });
  },
  component: OnboardingMetasPage,
});

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="19" stroke="var(--accent)" strokeWidth="1.4" opacity=".35" />
      <circle cx="20" cy="20" r="8" fill="var(--accent)" />
    </svg>
  );
}

function OnboardingMetasPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-background px-4 py-10 sm:py-14">
      <LanguageSwitcher className="absolute right-4 top-4 sm:right-6 sm:top-6" />

      <div className="mx-auto w-full max-w-[660px]">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <BrandMark />
          <div className="font-serif text-lg font-semibold">
            Fuente <span className="text-accent-text">Price Pro</span>
          </div>
        </div>

        <h1 className="mb-1.5 font-serif text-2xl font-medium tracking-tight text-foreground">
          {t.goalWizard.pageTitle}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">{t.goalWizard.pageSubtitle}</p>

        <GoalWizard onComplete={() => navigate({ to: "/onboarding/personal-info" })} />

        <div className="mt-6 flex justify-start">
          <button
            type="button"
            onClick={() => navigate({ to: "/profile", search: { returnTo: "/onboarding/metas" } })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t.onboarding.questions.back}
          </button>
        </div>
      </div>
    </div>
  );
}
