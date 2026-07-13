import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { useAuth } from "@/lib/auth-provider";

type PendingAction = (() => void | Promise<void>) | null;

interface AuthModalCtx {
  openAuthModal: (opts?: { message?: string; onSuccess?: () => void | Promise<void> }) => void;
  closeAuthModal: () => void;
}

const Ctx = createContext<AuthModalCtx | null>(null);

export function useAuthModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<PendingAction>(null);

  const openAuthModal = useCallback<AuthModalCtx["openAuthModal"]>((opts) => {
    setMessage(opts?.message ?? null);
    pendingRef.current = opts?.onSuccess ?? null;
    setMode("choose");
    setEmail("");
    setPassword("");
    setOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setOpen(false), []);

  // Run pending action once user becomes authenticated, then close modal.
  useEffect(() => {
    if (!user) return;
    const action = pendingRef.current;
    pendingRef.current = null;
    if (open) setOpen(false);
    if (action) {
      Promise.resolve(action()).catch((e) => {
        console.error("[auth-modal] pending action failed", e);
      });
    }
  }, [user, open]);

  async function handleOAuth(providerName: "google" | "apple") {
    setBusy(true);
    try {
      const provider = providerName === "google" ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
      await signInWithPopup(auth, provider);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${providerName} sign-in failed`);
      setBusy(false);
    }
  }


  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (emailMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Account created successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Welcome back");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Ctx.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            pendingRef.current = null;
            setOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-border/60 bg-card">
          <DialogHeader className="space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/20">
              <Sparkles className="h-5 w-5 text-success" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold tracking-tight text-foreground">
              Unlock the power of compound interest.
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed text-muted-foreground">
              {message ?? "Save your portfolio for free to access the Smart Allocation Simulator and Cash Flow Projections."}
            </DialogDescription>
          </DialogHeader>

          {mode === "choose" ? (
            <div className="space-y-3 py-2">
              <Button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={busy}
                className="w-full h-11 bg-success text-success-foreground hover:bg-success/90"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth("apple")}
                disabled={busy}
                className="w-full h-11 border-border/60 bg-background/40 hover:bg-background"
              >
                <AppleIcon className="mr-2 h-5 w-5" />
                Continue with Apple
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled
                aria-disabled
                title="Coming Soon"
                className="w-full h-11 border-border/60 bg-background/40 opacity-60 cursor-not-allowed"
              >
                <MicrosoftIcon className="mr-2 h-5 w-5" />
                <span>Continue with Microsoft</span>
                <span className="ml-2 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Coming Soon
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("email")}
                disabled={busy}
                className="w-full h-11 border-border/60 bg-background/40 hover:bg-background"
              >
                <Mail className="mr-2 h-4 w-4" />
                Continue with Email
              </Button>

              <p className="pt-2 text-center text-[11px] text-muted-foreground">
                No account needed for Google — we'll create one automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmail} className="space-y-4 py-2">
              <div className="flex rounded-lg border border-border/60 bg-background/40 p-1">
                <button
                  type="button"
                  onClick={() => setEmailMode("signin")}
                  className={
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                    (emailMode === "signin"
                      ? "bg-success/15 text-success ring-1 ring-success/30"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode("signup")}
                  className={
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                    (emailMode === "signup"
                      ? "bg-success/15 text-success ring-1 ring-success/30"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  Create Account
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="am-email">Email</Label>
                <Input
                  id="am-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="am-password">Password</Label>
                <Input
                  id="am-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={emailMode === "signup" ? "new-password" : "current-password"}
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
                {emailMode === "signup" ? "Create Account" : "Sign In"}
              </Button>
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.05 12.04c-.03-2.85 2.33-4.22 2.43-4.29-1.32-1.94-3.39-2.2-4.12-2.23-1.75-.18-3.42 1.03-4.31 1.03-.89 0-2.26-1.01-3.72-.98-1.91.03-3.68 1.11-4.66 2.82-1.99 3.44-.51 8.53 1.42 11.32.94 1.36 2.06 2.89 3.52 2.84 1.42-.06 1.96-.92 3.67-.92 1.71 0 2.2.92 3.7.89 1.53-.03 2.5-1.39 3.44-2.75 1.08-1.58 1.53-3.11 1.56-3.19-.03-.02-2.99-1.15-3.02-4.54zM14.36 3.85c.78-.95 1.31-2.27 1.17-3.58-1.13.05-2.5.75-3.31 1.7-.72.84-1.36 2.19-1.19 3.48 1.26.1 2.55-.64 3.33-1.6z"/>
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

