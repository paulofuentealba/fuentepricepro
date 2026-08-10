import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-provider";
import { auth, db } from "@/integrations/firebase/client";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";
import { collection, getDocs, writeBatch, doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  Trash2,
  Key,
  Loader2,
  LogOut,
  Settings as SettingsIcon,
  Shield,
  CreditCard,
  User,
  Target,
  Rocket,
  Scale,
} from "lucide-react";
import { useInvestorProfile } from "@/lib/useInvestorProfile";
import { calculateProfileTier } from "@/lib/investor-profile";
import { InvestorProfileFlow } from "@/components/onboarding/InvestorProfileFlow";
import { buildUserDataExport } from "@/lib/dataExport";
import { buildAccountDeletionPaths } from "@/lib/accountDeletion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n-provider";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const S = t.settings;
  const [activeTab, setActiveTab] = useState<"profile" | "subscription" | "privacy">("profile");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Profile Form State
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  // Load extended profile data
  useEffect(() => {
    if (user && activeTab === "profile" && !isProfileLoaded) {
      const loadProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setPhone(data.phone || "");
            setLocation(data.location || "");
          }
        } catch (error) {
          console.error("Error loading profile", error);
        } finally {
          setIsProfileLoaded(true);
        }
      };
      loadProfile();
    }
  }, [user, activeTab, isProfileLoaded]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          phone,
          location,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      toast.success(S.profile.saveSuccess);
    } catch (error) {
      console.error("Error saving profile", error);
      toast.error(t.errors.saveProfileFailed);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-4" />
      </div>
    );
  }

  // Se não estiver logado, redireciona suavemente
  if (!user) {
    // Redirecionamento amigável via router ou window, mas exibindo tela limpa
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-4" />
        <p className="text-muted-foreground">{S.redirecting}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Simples */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
          <div
            className="flex items-center gap-2 font-bold cursor-pointer"
            onClick={() => (window.location.href = "/app")}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-primary-foreground text-lg">F</span>
            </div>
            <span className="hidden sm:inline-block">{t.appTitle}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/app")}>
            {S.backToDashboard}
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto py-8 px-4 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{S.title}</h2>
              <p className="text-xs text-muted-foreground">{S.subtitle}</p>
            </div>
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "profile"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <User className="h-4 w-4" /> {S.tabs.profile}
            </button>
            <button
              onClick={() => setActiveTab("subscription")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "subscription"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4" /> {S.tabs.subscription}
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "privacy"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Shield className="h-4 w-4" /> {S.tabs.privacy}
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <section className="flex-1 space-y-6">
          {activeTab === "profile" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">{S.profile.title}</h3>
              <form
                onSubmit={handleSaveProfile}
                className="p-6 rounded-xl border border-border/50 bg-card space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>{S.profile.name}</Label>
                    <Input value={user.displayName || ""} disabled className="bg-muted/50" />
                  </div>

                  <div className="space-y-2">
                    <Label>{S.profile.email}</Label>
                    <Input value={user.email || ""} disabled className="bg-muted/50" />
                  </div>

                  <div className="space-y-2">
                    <Label>{S.profile.phone}</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+55 (11) 99999-9999"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{S.profile.location}</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="São Paulo, SP"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {S.profile.id} <span className="font-mono">{user.uid}</span>
                  </p>
                  <Button type="submit" disabled={isSavingProfile}>
                    {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {S.profile.saveBtn}
                  </Button>
                </div>
              </form>

              {/* Investor Profile Summary Card */}
              <InvestorProfileSettingsCard />
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">{S.subscription.title}</h3>
              <div className="p-6 rounded-xl border border-border/50 bg-card">
                <p className="text-sm text-muted-foreground">
                  {S.subscription.currentPlan} <strong>{S.subscription.free}</strong>.
                </p>
                <Button className="mt-4 bg-success text-success-foreground hover:bg-success/90">
                  {S.subscription.upgrade}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold">{S.privacy.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{S.privacy.description}</p>
              </div>

              {/* Danger Zone */}
              <div className="mt-8 rounded-xl border border-destructive/20 bg-destructive/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-semibold text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" /> {S.privacy.dangerZone}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                        {S.privacy.dangerDescription}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="shrink-0"
                    >
                      {S.privacy.deleteAccount}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Modal Wizard de Exclusão */}
      <DeleteAccountWizard
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        user={user}
      />
    </div>
  );
}

function DeleteAccountWizard({
  isOpen,
  onClose,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}) {
  const { t } = useI18n();
  const S = t.settings.deleteWizard;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusText, setStatusText] = useState("");

  // Reseta o wizard quando abre/fecha
  const handleClose = () => {
    if (!isBusy && !isExporting) {
      setStep(1);
      setPassword("");
      onClose();
    }
  };

  const handleExport = async () => {
    if (!user?.uid) return;
    setIsExporting(true);

    try {
      const userDocRef = doc(db, "users", user.uid);
      const assetsRef = collection(db, "users", user.uid, "assets");
      const txRef = collection(db, "users", user.uid, "transactions");
      const snapshotsRef = collection(db, "users", user.uid, "portfolioSnapshots");

      const [userDocSnap, assetsSnap, txSnap, snapshotsSnap] = await Promise.all([
        getDoc(userDocRef),
        getDocs(assetsRef),
        getDocs(txRef),
        getDocs(snapshotsRef),
      ]);

      const userDocData = userDocSnap.exists() ? userDocSnap.data() : null;
      const assetsData = assetsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const txData = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const snapshotsData = snapshotsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      let localMappings: Record<string, string> = {};
      try {
        const rawLocal = window.localStorage.getItem("ceilingPricePro.issuerTickerMappings.v1");
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (parsed && typeof parsed === "object") {
            localMappings = parsed;
          }
        }
      } catch (e) {
        console.warn("Failed to read local issuerTickerMappings for export", e);
      }

      const payload = buildUserDataExport({
        userDoc: userDocData,
        localIssuerTickerMappings: localMappings,
        assets: assetsData,
        transactions: txData,
        portfolioSnapshots: snapshotsData,
        metadata: {
          userId: user.uid,
          email: user.email,
          exportedAt: new Date().toISOString(),
        },
      });

      const dataStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fuentepricepro_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(S.backupSuccess);
      setStep(2);
    } catch (error) {
      console.error("Export failed", error);
      toast.error(S.backupError);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsBusy(true);
    setStatusText(S.statusVerifying);

    try {
      // 1. Reautenticar
      const providerData = user.providerData;
      const isGoogle = providerData.some((p: any) => p.providerId === "google.com");

      if (isGoogle) {
        const provider = new GoogleAuthProvider();
        provider.addScope("profile");
        provider.addScope("email");
        await reauthenticateWithPopup(user, provider);
      } else {
        if (!password) {
          toast.error(S.errorNoPassword);
          setIsBusy(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }

      setStep(3);
      setStatusText(S.statusScrubbing);

      // 2. Client-Side Scrubbing (Deletar dados do Firestore)
      // A ordem de operação é CRÍTICA:
      // Deletar as subcoleções (assets, transactions e portfolioSnapshots) PRIMEIRO.
      // Se apagar o documento pai primeiro e a operação falhar na sequência,
      // as subcoleções tornam os dados órfãos no banco de dados.

      // 2a. Buscar todos os ativos do usuário (users/{uid}/assets)
      const assetsRef = collection(db, "users", user.uid, "assets");
      const assetsSnap = await getDocs(assetsRef);

      // 2b. Buscar todas as transações do usuário (users/{uid}/transactions)
      const txRef = collection(db, "users", user.uid, "transactions");
      const txSnap = await getDocs(txRef);

      // 2c. Buscar todos os snapshots de portfólio do usuário (users/{uid}/portfolioSnapshots)
      const snapshotsRef = collection(db, "users", user.uid, "portfolioSnapshots");
      const snapshotsSnap = await getDocs(snapshotsRef);

      // 2d. Montar lista de referências usando a função pura (subcoleções primeiro, documento raiz por último)
      const deletionPaths = buildAccountDeletionPaths({
        userId: user.uid,
        assetIds: assetsSnap.docs.map((d) => d.id),
        transactionIds: txSnap.docs.map((d) => d.id),
        portfolioSnapshotIds: snapshotsSnap.docs.map((d) => d.id),
      });

      const allRefs = deletionPaths.map((path) => doc(db, path));

      // Executar a exclusão em lote no Firestore em grupos de até 400 operações
      for (let i = 0; i < allRefs.length; i += 400) {
        const chunk = allRefs.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((ref) => batch.delete(ref));
        await batch.commit();
      }

      // 3. Deletar Usuário
      setStatusText(S.statusRevoking);
      await user.delete();

      toast.success(S.successMsg);
      // O listener do AuthProvider vai detectar a saída e redirecionar para '/'
    } catch (error: any) {
      console.error("Delete failed", error);
      if (error.code === "auth/wrong-password") {
        toast.error(S.errorWrongPassword);
      } else {
        toast.error(S.errorGeneral + " " + error.message);
      }
      setStep(2); // Voltar pro passo 2 em caso de erro
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        closeLabel={t.common.close}
        className="sm:max-w-md border-border/60 bg-card overflow-hidden"
      >
        {step === 1 && (
          <>
            <DialogHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 mb-2">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center text-xl">{S.step1Title}</DialogTitle>
              <DialogDescription className="text-center pt-2">{S.step1Desc}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-primary text-primary-foreground"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {S.exportingBackup}
                  </>
                ) : (
                  S.downloadBackup
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                disabled={isExporting}
                className="w-full text-muted-foreground hover:text-destructive"
              >
                {S.skip}
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20 mb-2">
                <Key className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-center text-xl text-destructive">
                {S.step2Title}
              </DialogTitle>
              <DialogDescription className="text-center pt-2">{S.step2Desc}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleDelete} className="space-y-4 mt-4">
              {user.providerData.some((p: any) => p.providerId === "google.com") ? (
                <div className="text-center p-4 bg-muted/20 rounded-lg border border-border/50 text-sm text-muted-foreground">
                  {S.googleNotice}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder={S.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isBusy}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={isBusy}
                >
                  {S.cancel}
                </Button>
                <Button type="submit" variant="destructive" className="flex-1" disabled={isBusy}>
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {S.confirmDelete}
                </Button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-destructive animate-spin" />
            <p className="text-center font-medium text-foreground">{statusText}</p>
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              {S.doNotClose}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvestorProfileSettingsCard() {
  const { t } = useI18n();
  const { profile } = useInvestorProfile();
  const [isRetaking, setIsRetaking] = useState(false);

  const { tier, sublabel } = calculateProfileTier(profile);

  const getTierIcon = () => {
    if (tier === "conservative") return Shield;
    if (tier === "aggressive") return Rocket;
    return Scale;
  };

  const TierIcon = getTierIcon();

  return (
    <>
      <div className="p-6 rounded-xl border border-border/50 bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <TierIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-base">{t.onboarding.result.profileLabel}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold uppercase tracking-wider">
                  {t.onboarding.result.tiers[tier]}
                </span>
                <span className="text-xs text-muted-foreground">
                  • {t.onboarding.result.sublabels[sublabel]}
                </span>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsRetaking(true)}
            className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary self-start sm:self-auto"
          >
            {t.onboarding.result.retakeBtn}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t.onboarding.result.descriptions[tier]}
        </p>
      </div>

      {isRetaking && <InvestorProfileFlow isModal={true} onComplete={() => setIsRetaking(false)} />}
    </>
  );
}
