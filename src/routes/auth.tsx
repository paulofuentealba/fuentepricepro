import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gauge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { useAuth } from "@/lib/auth-provider";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { SuccessIconBox } from "@/components/shared/SuccessIconBox";
import { useI18n } from "@/lib/i18n-provider";

import { InvestorProfileFlow } from "@/components/onboarding/InvestorProfileFlow";
import { useInvestorProfile } from "@/lib/useInvestorProfile";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Fuente Price Pro" },
      {
        name: "description",
        content: "Sign in to save your portfolio and track your dividend cash flow.",
      },
      { property: "og:title", content: "Sign in — Fuente Price Pro" },
      {
        property: "og:description",
        content:
          "Sign in to save your portfolio, project dividends, and simulate smart allocations.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://fuentepricepro.com/auth" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sign in — Fuente Price Pro" },
      {
        name: "twitter:description",
        content:
          "Sign in to save your portfolio, project dividends, and simulate smart allocations.",
      },
    ],
    links: [{ rel: "canonical", href: "https://fuentepricepro.com/auth" }],
  }),
  component: AuthPage,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const { profile, isPending: profilePending } = useInvestorProfile();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && user && !profilePending && !showOnboarding) {
      // If user is already authenticated and has either completed or skipped onboarding, redirect home
      if (profile.completedAt || profile.skipped) {
        navigate({ to: "/" });
      } else {
        // First time signup / uncompleted profile -> show onboarding
        setShowOnboarding(true);
      }
    }
  }, [user, loading, profilePending, profile, showOnboarding, navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success(t.authModal.successSignup);
        setShowOnboarding(true);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success(t.authModal.welcomeBack);
        if (profile.completedAt || profile.skipped) {
          navigate({ to: "/" });
        } else {
          setShowOnboarding(true);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.authModal.authFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      await signInWithPopup(auth, provider);
      if (profile.completedAt || profile.skipped) {
        navigate({ to: "/" });
      } else {
        setShowOnboarding(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.authModal.googleSignInFailed);
      setBusy(false);
    }
  }

  if (showOnboarding && user) {
    return (
      <InvestorProfileFlow
        isModal={true}
        onComplete={() => {
          navigate({ to: "/" });
        }}
      />
    );
  }

  const authQuestions = [
    "I have $2,500. Where should it go?",
    "A dividend just landed. What do I reinvest it in?",
    "How much is left after tax?",
    "What changed since I last checked?",
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-11 text-sidebar-foreground lg:flex">
        <div>
          <Link to="/" className="mb-10 flex items-center gap-2.5">
            <SuccessIconBox icon={Gauge} size="md" rounded="xl" />
            <div className="font-serif text-lg font-semibold text-sidebar-accent">
              Fuente <span className="text-sidebar-foreground/60">Price Pro</span>
            </div>
          </Link>
          <h2 className="mb-4 font-serif text-[31px] font-medium leading-[1.25]">
            Your portfolio answers <b className="font-semibold text-sidebar-accent">what to do next</b>
          </h2>
          <p className="mb-7 text-[13.5px] leading-relaxed text-sidebar-foreground/60">
            Sign in to see the questions only a tool that knows your average cost can answer.
          </p>
          <div className="space-y-[13px]">
            {authQuestions.map((q) => (
              <div key={q} className="flex gap-[11px] text-[12.5px] text-sidebar-foreground/70">
                <span className="font-bold text-sidebar-accent">◈</span>
                <span>{q}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[11.5px] leading-relaxed text-sidebar-foreground/45">
          Calculation and organization tool. Not investment advice or securities consulting.
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[420px]">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <SuccessIconBox icon={Gauge} size="md" rounded="xl" />
            <div className="text-left">
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                Fuente Price Pro
              </h1>
            </div>
          </Link>

          <h3 className="mb-1.5 font-serif text-[26px] font-medium text-foreground">
            {mode === "signup" ? "Create your account" : "Sign in to your account"}
          </h3>
          <p className="mb-6 text-[13px] text-muted-foreground">
            {mode === "signup"
              ? "Free for up to 8 assets. No credit card required."
              : "Continue where you left off."}
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={busy}
            className="mb-3 w-full justify-center gap-2 border-border bg-card font-display text-[13px] font-semibold hover:border-accent"
          >
            <GoogleIcon className="h-[17px] w-[17px]" />
            Continue with Google
          </Button>

          <div className="my-[18px] flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="auth-email">{t.global.email}</Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-password">{t.global.password}</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-sidebar-primary font-display text-[12.5px] font-semibold text-sidebar-accent hover:opacity-90"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create free account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-[18px] text-center text-[12.5px] text-muted-foreground">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-accent-text hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-accent-text hover:underline"
                >
                  Create free account
                </button>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              ← Back to calculator
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
