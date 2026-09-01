import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-provider";
import { auth, db } from "@/integrations/firebase/client";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  updateProfile,
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
  Shield,
  CreditCard,
  User,
  Target,
  Rocket,
  Scale,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { useInvestorProfile } from "@/lib/useInvestorProfile";
import { calculateProfileTier, type ProfileTier, type ProfileSublabel } from "@/lib/investor-profile";
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
import { useUserSettings } from "@/lib/useUserSettings";
import { useWatchlist } from "@/lib/watchlist";
import { useSubscription } from "@/lib/subscription";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { CheckCircle2, Lock as LockIcon } from "lucide-react";
import { buildWatchlistFullCsv, downloadCsv } from "@/lib/csv";
import { toIntlLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    // Wait for auth to be initialized
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
    });

    const user = auth.currentUser;
    if (!user) {
      throw redirect({ to: "/auth" });
    }
  },
  component: SettingsPage,
});

/**
 * Fetches every Firestore collection under users/{uid}, builds the LGPD/GDPR export payload via
 * buildUserDataExport (the SSOT for what "your data" means), and triggers a browser download.
 * Shared by the standalone "Exportar meus dados (JSON)" button (Privacidade tab, matching the
 * prototype) and DeleteAccountWizard's backup-before-delete step — one implementation, not two.
 */
async function exportUserDataJsonBackup(user: { uid: string; email: string | null }): Promise<void> {
  const userDocRef = doc(db, "users", user.uid);
  const assetsRef = collection(db, "users", user.uid, "assets");
  const txRef = collection(db, "users", user.uid, "transactions");
  const snapshotsRef = collection(db, "users", user.uid, "portfolioSnapshots");
  const feedbacksRef = collection(db, "users", user.uid, "feedbacks");

  const [userDocSnap, assetsSnap, txSnap, snapshotsSnap, feedbacksSnap] = await Promise.all([
    getDoc(userDocRef),
    getDocs(assetsRef),
    getDocs(txRef),
    getDocs(snapshotsRef),
    getDocs(feedbacksRef),
  ]);

  const userDocData = userDocSnap.exists() ? userDocSnap.data() : null;
  const assetsData = assetsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const txData = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const snapshotsData = snapshotsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const feedbacksData = feedbacksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

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
    feedbacks: feedbacksData,
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
}

function SettingsPage() {
  const { user, loading } = useAuth();
  const { t, locale } = useI18n();
  const S = t.settings;
  const { settings, updateSettings } = useUserSettings();
  const { items: watchlistItems } = useWatchlist();
  const { isPro } = useSubscription();
  const taxRealityUnlocked = useFeatureGate("taxRealityUnlocked");
  const withdrawUnlocked = useFeatureGate("withdrawUnlocked");
  const auditUnlocked = useFeatureGate("auditUnlocked");
  const freeAssetLimit = useFeatureGate("freeAssetLimit");
  const [activeTab, setActiveTab] = useState<"profile" | "subscription" | "privacy">("profile");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);

  const handleExportJson = async () => {
    if (!user?.uid) return;
    setIsExportingJson(true);
    try {
      await exportUserDataJsonBackup(user);
      toast.success(S.privacy.exportJsonSuccess);
    } catch (error) {
      console.error("Export JSON failed", error);
      toast.error(t.errors.saveProfileFailed);
    } finally {
      setIsExportingJson(false);
    }
  };

  const handleExportCsv = () => {
    if (watchlistItems.length === 0) {
      toast.info(t.toasts.emptyWatchlist);
      return;
    }
    try {
      const csv = buildWatchlistFullCsv(watchlistItems);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`carteira-${date}.csv`, csv);
      toast.success(S.privacy.exportCsvSuccess);
    } catch (error) {
      console.error("Export CSV failed", error);
      toast.error(t.toasts.exportFailed);
    }
  };

  // Determinar se a conta é Google (fonte da verdade para o nome)
  const isGoogle = user?.providerData?.some((p: any) => p.providerId === "google.com") ?? false;

  // Profile Form State
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [name, setName] = useState("");
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
            // Carregar nome do Firestore como fallback (pode ter sido salvo antes)
            if (!isGoogle && data.name) {
              setName(data.name);
            }
          }
          // Inicializar nome do displayName do Firebase Auth se não veio do Firestore
          if (!isGoogle && !name && user.displayName) {
            setName(user.displayName);
          }
        } catch (error) {
          console.error("Error loading profile", error);
        } finally {
          setIsProfileLoaded(true);
        }
      };
      loadProfile();
    }
  }, [user, activeTab, isProfileLoaded, isGoogle, name]);

  // Sincronizar nome quando user.displayName muda (ex: após reload)
  useEffect(() => {
    if (!isGoogle && user?.displayName && !name) {
      setName(user.displayName);
    }
  }, [user?.displayName, isGoogle, name]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      // Salvar no Firestore (phone, location, e nome se não for Google)
      const firestoreData: Record<string, any> = {
        phone,
        location,
        updatedAt: new Date().toISOString(),
      };

      if (!isGoogle) {
        firestoreData.name = name;
      }

      await setDoc(
        doc(db, "users", user.uid),
        firestoreData,
        { merge: true },
      );

      // Se não for conta Google, atualizar também no Firebase Auth
      if (!isGoogle && name.trim() !== "") {
        await updateProfile(auth.currentUser!, { displayName: name.trim() });
        // Recarregar o usuário para refletir a mudança no contexto de autenticação
        await auth.currentUser!.reload();
      }

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
      <header className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
          <div
            className="flex items-center gap-2 font-display font-semibold cursor-pointer"
            onClick={() => (window.location.href = "/app")}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="font-serif text-primary-foreground text-lg">F</span>
            </div>
            <span className="hidden sm:inline-block">{t.appTitle}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/app")}>
            {S.backToDashboard}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Top — eyebrow + h1.pg equivalent */}
        <div className="mb-5">
          <div className="text-[10.5px] font-display font-semibold uppercase tracking-wider text-primary">
            {S.subtitle}
          </div>
          <h1 className="mt-1 font-serif text-2xl font-medium tracking-tight text-foreground sm:text-[28px]">
            {S.title}
          </h1>
        </div>

        {/* Tabs — .tabs / .tab equivalent */}
        <div className="mb-5 flex flex-wrap gap-1 border-b border-border" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[12.5px] font-display transition-colors ${
              activeTab === "profile"
                ? "border-accent font-semibold text-foreground"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" /> {S.tabs.profile}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "subscription"}
            onClick={() => setActiveTab("subscription")}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[12.5px] font-display transition-colors ${
              activeTab === "subscription"
                ? "border-accent font-semibold text-foreground"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" /> {S.tabs.subscription}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "privacy"}
            onClick={() => setActiveTab("privacy")}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[12.5px] font-display transition-colors ${
              activeTab === "privacy"
                ? "border-accent font-semibold text-foreground"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="h-3.5 w-3.5" /> {S.tabs.privacy}
          </button>
        </div>

        {/* Content Area */}
        <section className="space-y-4">
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
              <form
                onSubmit={handleSaveProfile}
                className="rounded-[18px] border border-border/60 bg-card p-5 sm:p-6 space-y-6"
              >
                <h3 className="font-serif text-[15px] font-medium text-foreground">{S.profile.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>{S.profile.name}</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isGoogle}
                      className={isGoogle ? "bg-muted/50" : ""}
                      aria-disabled={isGoogle}
                    />
                    {isGoogle && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {S.profile.nameGoogleLocked || "Nome gerenciado pelo Google. Altere nas configurações da sua conta Google."}
                      </p>
                    )}
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

                <div className="pt-4 border-t border-dashed border-border/40 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {S.profile.id} <span className="font-mono">{user.uid}</span>
                  </p>
                  <Button type="submit" disabled={isSavingProfile} className="font-display">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
              {/* Seu plano — só campos com dado real (tier, features via feature gates); sem
                  preço/renovação/cartão/faturas, que exigiriam uma integração de billing que
                  ainda não existe no app (ver decisão registrada com o Paulo). */}
              <div className="rounded-[18px] border border-border/60 bg-card p-5 sm:p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-serif text-[15px] font-medium text-foreground">
                    {S.subscription.planCardTitle}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-display font-semibold text-accent-text">
                    {isPro ? S.subscription.pro : S.subscription.free}
                  </span>
                </div>

                <div className="text-[12.5px]">
                  {[
                    [
                      S.subscription.featureAssets,
                      Number.isFinite(freeAssetLimit) && !isPro
                        ? `${watchlistItems.length} / ${freeAssetLimit}`
                        : S.subscription.featureAssetsUnlimited,
                      true,
                    ],
                    [S.subscription.featureTaxReality, null, !!taxRealityUnlocked],
                    [S.subscription.featureWithdraw, null, !!withdrawUnlocked],
                    [S.subscription.featureAudit, null, !!auditUnlocked],
                    [S.subscription.featureImport, null, true],
                  ].map(([label, customValue, active]: any) => (
                    <div
                      key={label}
                      className="flex items-center justify-between border-b border-dashed border-border/40 py-2 last:border-b-0"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      {customValue ? (
                        <span className="font-mono font-semibold text-foreground">{customValue}</span>
                      ) : (
                        <span
                          className={cn(
                            "flex items-center gap-1.5 font-semibold",
                            active ? "text-success" : "text-muted-foreground",
                          )}
                        >
                          {active ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <LockIcon className="h-3.5 w-3.5" />
                          )}
                          {active ? S.subscription.featureActive : S.subscription.featureInactive}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {!isPro && (
                  <Button className="mt-4 w-full font-display bg-success text-success-foreground hover:bg-success/90">
                    {S.subscription.upgrade}
                  </Button>
                )}
              </div>

              {/* Uso — só a métrica que o app realmente rastreia (ativos na carteira). O
                  protótipo também mostra "notas importadas no mês", que não é uma métrica
                  guardada em nenhum lugar hoje — omitida em vez de inventada. */}
              <div className="rounded-[18px] border border-border/60 bg-card p-5 sm:p-6">
                <h3 className="mb-3 font-serif text-[15px] font-medium text-foreground">
                  {S.subscription.usageCardTitle}
                </h3>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{S.subscription.usageAssetsLabel}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {watchlistItems.length} / {Number.isFinite(freeAssetLimit) ? freeAssetLimit : "∞"}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{
                      width: `${
                        Number.isFinite(freeAssetLimit) && (freeAssetLimit as number) > 0
                          ? Math.min(100, (watchlistItems.length / (freeAssetLimit as number)) * 100)
                          : 100
                      }%`,
                    }}
                  />
                </div>
                {!isPro && Number.isFinite(freeAssetLimit) && (
                  <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
                    {S.subscription.usageFreeLimitNote.replace("{{limit}}", String(freeAssetLimit))}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-4">
              <div className="rounded-[18px] border border-border/60 bg-card p-5 sm:p-6">
                <h3 className="font-serif text-[15px] font-medium text-foreground">{S.privacy.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{S.privacy.description}</p>
              </div>

              {/* Seus dados — replica o card "Seus dados" do protótipo (LGPD pill + export) */}
              <div className="rounded-[18px] border border-border/60 bg-card p-5 sm:p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-serif text-[15px] font-medium text-foreground">
                    {S.privacy.dataCardTitle}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-display font-semibold text-accent-text">
                    {S.privacy.dataCardPill}
                  </span>
                </div>
                <p className="mb-4 text-[12.5px] leading-relaxed text-muted-foreground">
                  {S.privacy.dataCardDesc}
                </p>
                <div className="flex flex-col gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportJson}
                    disabled={isExportingJson}
                    className="w-full font-display"
                  >
                    {isExportingJson ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileJson className="mr-2 h-4 w-4" />
                    )}
                    {S.privacy.exportJsonBtn}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportCsv}
                    className="w-full font-display"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {S.privacy.exportCsvBtn}
                  </Button>
                </div>
              </div>

              {/* Consentimentos — replica o card "Consentimentos" do protótipo (3 toggles no
                  estilo .opt, mesmo padrão já usado em GoalWizard.tsx) */}
              <div className="rounded-[18px] border border-border/60 bg-card p-5 sm:p-6">
                <h3 className="mb-3 font-serif text-[15px] font-medium text-foreground">
                  {S.privacy.consents.title}
                </h3>
                <div className="space-y-2.5">
                  <div
                    aria-disabled="true"
                    className="w-full cursor-not-allowed rounded-2xl border border-accent bg-accent/10 p-3.5 text-left opacity-90"
                  >
                    <div className="text-[13.5px] font-display font-semibold text-foreground">
                      {S.privacy.consents.essentialLabel}
                    </div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                      {S.privacy.consents.essentialDesc}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({ usageAnalyticsConsent: !settings.usageAnalyticsConsent })
                    }
                    className={cn(
                      "w-full rounded-2xl border p-3.5 text-left transition-colors",
                      settings.usageAnalyticsConsent
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:border-accent/60",
                    )}
                  >
                    <div className="text-[13.5px] font-display font-semibold text-foreground">
                      {S.privacy.consents.analyticsLabel}
                    </div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                      {S.privacy.consents.analyticsDesc}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({ weeklyDigestEmailConsent: !settings.weeklyDigestEmailConsent })
                    }
                    className={cn(
                      "w-full rounded-2xl border p-3.5 text-left transition-colors",
                      settings.weeklyDigestEmailConsent
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:border-accent/60",
                    )}
                  >
                    <div className="text-[13.5px] font-display font-semibold text-foreground">
                      {S.privacy.consents.digestLabel}
                    </div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                      {S.privacy.consents.digestDesc}
                    </div>
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-[18px] border border-destructive/30 bg-destructive/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="font-serif text-base font-medium text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" /> {S.privacy.dangerZone}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                        {S.privacy.dangerDescription}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="shrink-0 font-display"
                    >
                      {S.privacy.deleteAccount}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Legalnote — replica o rodapé do protótipo mostrando o aceite do disclaimer */}
              <div className="rounded-xl bg-muted/40 px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
                {settings?.disclaimerAcceptedVersion ? (
                  <>
                    <span className="font-medium text-foreground">{S.privacy.disclaimerAcceptanceLabel}</span>{" "}
                    <strong className="text-foreground">
                      {S.privacy.disclaimerVersionText.replace(
                        "{{version}}",
                        settings.disclaimerAcceptedVersion,
                      )}
                    </strong>
                    {settings.disclaimerAcceptedAt && (
                      <>
                        ,{" "}
                        {S.privacy.disclaimerAcceptedOnText
                          .replace(
                            "{{date}}",
                            new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: "short" }).format(
                              settings.disclaimerAcceptedAt,
                            ),
                          )
                          .replace(
                            "{{time}}",
                            new Intl.DateTimeFormat(toIntlLocale(locale), { timeStyle: "short" }).format(
                              settings.disclaimerAcceptedAt,
                            ),
                          )}
                        .
                      </>
                    )}
                  </>
                ) : (
                  S.privacy.disclaimerNotAccepted
                )}
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
      await exportUserDataJsonBackup(user);
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

      // 2d. Buscar todos os feedbacks do usuário (users/{uid}/feedbacks)
      const feedbacksRef = collection(db, "users", user.uid, "feedbacks");
      const feedbacksSnap = await getDocs(feedbacksRef);

      // 2e. Montar lista de referências usando a função pura (subcoleções primeiro, documento raiz por último)
      const deletionPaths = buildAccountDeletionPaths({
        userId: user.uid,
        assetIds: assetsSnap.docs.map((d) => d.id),
        transactionIds: txSnap.docs.map((d) => d.id),
        portfolioSnapshotIds: snapshotsSnap.docs.map((d) => d.id),
        feedbackIds: feedbacksSnap.docs.map((d) => d.id),
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

/**
 * Replicates the prototype's "Seu perfil de investidor" card exactly
 * (fuente-v6-completo.html:866-878): gold tier pill, a highlighted narrative-title box, a
 * key/value table (Objetivo/Tolerância a risco/Horizonte/Respondido em), and a full-width ghost
 * "Refazer Questionário" button.
 */
function InvestorProfileSettingsCard() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { profile } = useInvestorProfile();
  const IC = t.settings.profile.investorCard;

  const hasAnsweredProfile = !!profile.completedAt && !!profile.goal && !!profile.horizon;

  if (!hasAnsweredProfile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[18px] border border-border/60 bg-card p-5 text-center sm:p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-serif text-[15px] font-medium text-foreground">{IC.noProfileTitle}</h3>
        <p className="max-w-xs text-xs text-muted-foreground">{IC.noProfileDesc}</p>
        <Button
          type="button"
          onClick={() => navigate({ to: "/profile", search: { returnTo: "/settings" } })}
          className="mt-1 font-display"
        >
          {IC.startBtn}
        </Button>
      </div>
    );
  }

  const { tier, sublabel } = calculateProfileTier(profile);
  const narrativeTitle = IC.narrativeTitles[tier as ProfileTier][sublabel as ProfileSublabel];
  const goalKey = profile.goal === "income" ? "protect" : (profile.goal as "preserve" | "protect" | "both" | "growth");
  const objectiveValue = t.onboarding.questions.goal.options[goalKey]?.title ?? "—";
  const horizonValue = profile.horizon ? t.onboarding.questions.horizon.options[profile.horizon]?.title : "—";
  const answeredOnValue = profile.completedAt
    ? new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: "short" }).format(profile.completedAt)
    : "—";

  const rows: [string, string][] = [
    [IC.objectiveLabel, objectiveValue],
    [IC.riskLabel, IC.riskToleranceLabels[tier as ProfileTier]],
    [IC.horizonLabel, horizonValue ?? "—"],
    [IC.answeredOnLabel, answeredOnValue],
  ];

  return (
    <div className="flex h-full flex-col rounded-[18px] border border-border/60 bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-serif text-[15px] font-medium text-foreground">{IC.title}</h3>
        <span className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-display font-semibold text-accent-text">
          {t.onboarding.result.tiers[tier]}
        </span>
      </div>

      <div className="mb-4 rounded-[14px] bg-muted/40 p-[18px]">
        <div className="mb-1.5 font-serif text-[21px] font-semibold text-foreground">{narrativeTitle}</div>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          {t.onboarding.result.descriptions[tier]}
        </p>
      </div>

      <div className="text-[12.5px]">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-dashed border-border/40 py-2 last:border-b-0"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono font-semibold text-foreground">{value}</span>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => navigate({ to: "/profile", search: { returnTo: "/settings" } })}
        className="mt-3.5 w-full font-display"
      >
        {t.onboarding.result.retakeBtn}
      </Button>

      <Link
        to="/app/goals"
        className="mt-3 self-center text-xs font-display font-semibold text-accent-text hover:underline"
      >
        {IC.goalsLink}
      </Link>
    </div>
  );
}
