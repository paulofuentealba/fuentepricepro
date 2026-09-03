import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { useAuth } from "@/lib/auth-provider";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { useI18n } from "@/lib/i18n-provider";
import { LanguageSwitcher } from "@/components/ceiling/LanguageSwitcher";

import { useInvestorProfile } from "@/lib/useInvestorProfile";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signin" | "signup"; returnTo?: string } => ({
    mode: search.mode === "signup" ? "signup" : undefined,
    returnTo: typeof search.returnTo === "string" && search.returnTo.trim().length > 0 ? search.returnTo : undefined,
  }),
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

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="19" stroke="var(--sidebar-accent)" strokeWidth="1.4" opacity=".35" />
      <circle cx="20" cy="20" r="13.5" stroke="var(--sidebar-accent)" strokeWidth="1.4" opacity=".6" />
      <circle cx="20" cy="20" r="8" fill="var(--sidebar-accent)" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const { t } = useI18n();
  const A = t.authPage;
  const { user, loading } = useAuth();
  const { profile, isPending: profilePending } = useInvestorProfile();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const returnTo = search.returnTo ?? "/";

  useEffect(() => {
    if (!loading && user && !profilePending) {
      // If user is already authenticated and has either completed or skipped onboarding, redirect home
      if (profile.completedAt || profile.skipped) {
        navigate({ to: returnTo });
      } else {
        // First time signup / uncompleted profile -> send to the profile wizard
        navigate({ to: "/profile", search: { returnTo } });
      }
    }
  }, [user, loading, profilePending, profile, navigate, returnTo]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        navigate({ to: "/profile", search: { returnTo } });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success(t.authModal.welcomeBack);
        if (profile.completedAt || profile.skipped) {
          navigate({ to: returnTo });
        } else {
          navigate({ to: "/profile", search: { returnTo } });
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
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      await signInWithPopup(auth, provider);
      if (profile.completedAt || profile.skipped) {
        navigate({ to: returnTo });
      } else {
        navigate({ to: "/profile", search: { returnTo } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.authModal.googleSignInFailed);
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.error(A.forgotPasswordNeedsEmail);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(A.forgotPasswordSent);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : A.forgotPasswordError);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-11 text-sidebar-foreground lg:flex">
        <div>
          <Link to="/" className="mb-10 flex items-center gap-2.5">
            <BrandMark />
            <div className="font-serif text-lg font-semibold text-sidebar-accent">
              Fuente <span className="text-sidebar-foreground/60">Price Pro</span>
            </div>
          </Link>
          <h2 className="mb-4 font-serif text-[31px] font-medium leading-[1.25]">
            {A.sideTitle1}
            <br />
            <span className="font-semibold text-sidebar-accent">{A.sideTitle2}</span>
          </h2>
          <p className="mb-7 text-[13.5px] leading-relaxed text-sidebar-foreground/60">{A.sideSubtitle}</p>
          <div className="space-y-[13px]">
            {A.questions.map((q) => (
              <div key={q} className="flex gap-[11px] text-[12.5px] text-sidebar-foreground/70">
                <span className="font-bold text-sidebar-accent">◈</span>
                <span>{q}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[11.5px] leading-relaxed text-sidebar-foreground/45">{A.sideFooter}</div>
      </div>

      <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10">
        <LanguageSwitcher className="absolute right-6 top-6 hidden lg:inline-flex" />

        <div className="mx-auto w-full max-w-[420px]">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <div className="text-left">
              <h1 className="text-base font-semibold tracking-tight text-foreground">Fuente Price Pro</h1>
            </div>
          </Link>

          <h3 className="mb-1.5 font-serif text-[26px] font-medium text-foreground">
            {mode === "signup" ? A.signupTitle : A.loginTitle}
          </h3>
          <p className="mb-6 text-[13px] text-muted-foreground">
            {mode === "signup" ? A.signupSubtitle : A.loginSubtitle}
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={busy}
            className="mb-3 w-full justify-center gap-2 border-border bg-card font-display text-[13px] font-semibold hover:border-accent"
          >
            <GoogleIcon className="h-[17px] w-[17px]" />
            {A.continueGoogle}
          </Button>

          <div className="my-[18px] flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {A.or}
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

            {mode === "signin" && (
              <div className="flex items-center justify-between text-[12.5px]">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  {A.rememberMe}
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="font-semibold text-accent-text hover:underline"
                >
                  {A.forgotPassword}
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-sidebar-primary font-display text-[12.5px] font-semibold text-sidebar-accent hover:opacity-90"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? A.submitSignup : A.submitLogin}
            </Button>
          </form>

          <div className="mt-[18px] text-center text-[12.5px] text-muted-foreground">
            {mode === "signup" ? (
              <>
                {A.hasAccount}{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-accent-text hover:underline"
                >
                  {A.signIn}
                </button>
              </>
            ) : (
              <>
                {A.noAccount}{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-accent-text hover:underline"
                >
                  {A.createFree}
                </button>
              </>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            {A.consentPrefix}
            <Link to="/terms" className="text-accent-text hover:underline">
              {A.terms}
            </Link>
            {A.and}
            <Link to="/privacy" className="text-accent-text hover:underline">
              {A.privacy}
            </Link>
            {A.suffix}
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              {A.backToCalculator}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

