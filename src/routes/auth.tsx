import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gauge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success(t.authModal.successSignup);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success(t.authModal.welcomeBack);
        navigate({ to: "/" });
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
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.authModal.googleSignInFailed);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <SuccessIconBox icon={Gauge} size="md" rounded="xl" />
          <div className="text-left">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Fuente Price Pro
            </h1>
            <div className="text-xs text-muted-foreground">
              Intelligent Ceiling Portfolio Valuation & Passive Income Engineering tool
            </div>
          </div>
        </Link>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="pt-6">
            <div className="mb-5 flex rounded-lg border border-border/60 bg-background/40 p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                  (mode === "signin"
                    ? "bg-success/15 text-success ring-1 ring-success/30"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                  (mode === "signup"
                    ? "bg-success/15 text-success ring-1 ring-success/30"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleEmail} className="space-y-4">
              <div className="space-y-2">
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
              <div className="space-y-2">
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
                className="w-full bg-success text-success-foreground hover:bg-success/90"
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signup" ? "Create Account" : "Sign In"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              <div className="h-px flex-1 bg-border/60" />
              or
              <div className="h-px flex-1 bg-border/60" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full border-border/60 bg-background/40 hover:bg-background"
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              Continue with Google
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to calculator
          </Link>
        </p>
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
