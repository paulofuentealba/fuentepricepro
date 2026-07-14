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
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
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

  async function handleOAuth(providerName: "google") {
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
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


