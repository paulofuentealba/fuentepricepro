import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n-provider";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
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
  const [mode, setMode] = useState<"choose" | "email" | "terms" | "privacy">("choose");
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [prevMode, setPrevMode] = useState<"choose" | "email">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const pendingRef = useRef<PendingAction>(null);

  const openAuthModal = useCallback<AuthModalCtx["openAuthModal"]>((opts) => {
    setMessage(opts?.message ?? null);
    pendingRef.current = opts?.onSuccess ?? null;
    setMode("choose");
    setEmail("");
    setPassword("");
    setTermsAccepted(false);
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
    if (!termsAccepted) {
      toast.error("Por favor, aceite os Termos de Uso e Política de Privacidade.");
      return;
    }
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      await signInWithPopup(auth, provider);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${providerName} sign-in failed`);
      setBusy(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) {
      toast.error("Por favor, aceite os Termos de Uso e Política de Privacidade.");
      return;
    }
    setBusy(true);
    try {
      if (emailMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success(t.authModal.successSignup);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success(t.authModal.successLogin);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.authModal.error);
    } finally {
      setBusy(false);
    }
  }

  const { t } = useI18n();

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
              {t.authModal.title}
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed text-muted-foreground">
              {message ?? t.authModal.description}
            </DialogDescription>
          </DialogHeader>

          {mode === "choose" ? (
            <div className="space-y-3 py-2">
              <Button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={busy || !termsAccepted}
                className="w-full h-11 bg-success text-success-foreground hover:bg-success/90"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-5 w-5" />
                )}
                {t.authModal.continueGoogle}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("email")}
                disabled={busy}
                className="w-full h-11 border-border/60 bg-background/40 hover:bg-background"
              >
                <Mail className="mr-2 h-4 w-4" />
                {t.authModal.continueEmail}
              </Button>

              <div className="flex items-start space-x-3 mt-4 p-3 border border-border/50 rounded-lg bg-muted/20">
                <Checkbox
                  id="terms-oauth"
                  checked={termsAccepted}
                  onCheckedChange={(c) => setTermsAccepted(c === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="terms-oauth"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none"
                >
                  {t.authModal.termsPrefix}
                  <button
                    type="button"
                    onClick={() => {
                      setPrevMode("choose");
                      setMode("terms");
                    }}
                    className="underline font-medium text-foreground hover:text-success"
                  >
                    {t.authModal.terms}
                  </button>
                  {t.authModal.and}
                  <button
                    type="button"
                    onClick={() => {
                      setPrevMode("choose");
                      setMode("privacy");
                    }}
                    className="underline font-medium text-foreground hover:text-success"
                  >
                    {t.authModal.privacy}
                  </button>
                  {t.authModal.suffix}
                </label>
              </div>
            </div>
          ) : mode === "email" ? (
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
                  {t.authModal.login}
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
                  {t.authModal.signup}
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="am-email">{t.authModal.email}</Label>
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
                <Label htmlFor="am-password">{t.global.password}</Label>
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

              <div className="flex items-start space-x-3 p-3 border border-border/50 rounded-lg bg-muted/20">
                <Checkbox
                  id="terms-email"
                  checked={termsAccepted}
                  onCheckedChange={(c) => setTermsAccepted(c === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="terms-email"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none"
                >
                  {t.authModal.agreeTerms}
                  <button
                    type="button"
                    onClick={() => {
                      setPrevMode("email");
                      setMode("terms");
                    }}
                    className="underline font-medium text-foreground hover:text-success"
                  >
                    {t.authModal.terms}
                  </button>
                  {t.authModal.and}
                  <button
                    type="button"
                    onClick={() => {
                      setPrevMode("email");
                      setMode("privacy");
                    }}
                    className="underline font-medium text-foreground hover:text-success"
                  >
                    {t.authModal.privacy}
                  </button>
                  {t.authModal.suffix}
                </label>
              </div>

              <Button
                type="submit"
                disabled={busy || !termsAccepted}
                className="w-full bg-success text-success-foreground hover:bg-success/90"
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {emailMode === "signup" ? t.authModal.signup : t.authModal.login}
              </Button>
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                {t.authModal.back}
              </button>
            </form>
          ) : mode === "terms" || mode === "privacy" ? (
            <div className="space-y-4 py-2">
              <div className="max-h-[40vh] overflow-y-auto pr-2 text-sm text-muted-foreground space-y-4">
                {mode === "terms" ? (
                  <>
                    <h3 className="font-semibold text-foreground text-base">{t.authModal.terms}</h3>
                    <p>
                      Ao utilizar o Fuente Price Pro, você concorda que nossa plataforma fornece
                      dados, projeções de dividendos e análises de mercado{" "}
                      <strong>apenas para fins informativos e educacionais</strong>.
                    </p>
                    <p>
                      Nenhuma informação contida aqui constitui recomendação de compra, venda ou
                      manutenção de ativos financeiros (ações, FIIs, REITs, etc.).
                    </p>
                    <p>
                      A responsabilidade pela tomada de decisão e eventuais perdas e danos
                      decorrentes de investimentos é inteiramente sua. Não garantimos rentabilidade
                      futura ou exatidão absoluta dos dados em tempo real.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-foreground text-base">
                      {t.authModal.privacy}
                    </h3>
                    <p>
                      Nós valorizamos muito a sua privacidade (LGPD). Seus dados pessoais, como
                      e-mail e identificadores do Google, são utilizados exclusivamente para
                      gerenciar seu acesso à plataforma e manter sua Watchlist e portfólio
                      sincronizados em nossos servidores em nuvem (Firebase).
                    </p>
                    <p>
                      Não vendemos, alugamos ou compartilhamos sua carteira de investimentos com
                      terceiros ou anunciantes.
                    </p>
                    <p>
                      Você tem o direito de solicitar a exclusão permanente da sua conta e de todos
                      os seus dados a qualquer momento, através das configurações do seu perfil.
                    </p>
                  </>
                )}
              </div>
              <Button
                type="button"
                onClick={() => setMode(prevMode)}
                variant="outline"
                className="w-full mt-4"
              >
                {t.authModal.back}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
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
