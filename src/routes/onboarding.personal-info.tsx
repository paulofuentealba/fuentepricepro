import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { doc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { auth, db } from "@/integrations/firebase/client";
import { useAuth } from "@/lib/auth-provider";
import { useI18n } from "@/lib/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/ceiling/LanguageSwitcher";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/onboarding/personal-info")({
  beforeLoad: async () => {
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
    });

    if (!auth.currentUser) {
      throw redirect({ to: "/auth", search: { mode: "signup", returnTo: "/onboarding/personal-info" } });
    }
  },
  component: OnboardingPersonalInfoPage,
});

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="19" stroke="var(--accent)" strokeWidth="1.4" opacity=".35" />
      <circle cx="20" cy="20" r="8" fill="var(--accent)" />
    </svg>
  );
}

type CountryCode = "BR" | "US" | "PT" | "other";

function OnboardingPersonalInfoPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const P = t.onboardingPersonalInfo;

  const isGoogle = user?.providerData?.some((p) => p.providerId === "google.com") ?? false;
  const [name, setName] = useState(user?.displayName ?? "");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState<CountryCode>("BR");
  const [otherCountry, setOtherCountry] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = () => {
    toast.success(P.savedToast);
    navigate({ to: "/app" });
  };

  async function handleSave() {
    if (!user) return;
    if (!isGoogle && name.trim() === "") {
      toast.error(P.nameRequiredError);
      return;
    }
    setBusy(true);
    try {
      const countryLabel = country === "other" ? otherCountry.trim() : P.countries[country];
      const location = [city.trim(), countryLabel].filter(Boolean).join(", ");

      await setDoc(
        doc(db, "users", user.uid),
        { ...(location ? { location } : {}), ...(!isGoogle ? { name } : {}), updatedAt: new Date().toISOString() },
        { merge: true },
      );

      if (!isGoogle && name.trim() !== "") {
        await updateProfile(auth.currentUser!, { displayName: name.trim() });
      }

      finish();
    } catch {
      toast.error(P.errorToast);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <LanguageSwitcher className="absolute right-4 top-4 sm:right-6 sm:top-6" />

      <div className="w-full max-w-lg mx-auto bg-card border border-border rounded-2xl p-6 md:p-8">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <BrandMark />
          <div className="font-serif text-base font-semibold">
            Fuente <span className="text-accent-text">Price Pro</span>
          </div>
        </div>

        <h2 className="mb-1.5 font-serif text-2xl font-medium text-foreground tracking-tight text-center">
          {P.title}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground text-center leading-relaxed">
          {isGoogle ? P.subtitle : P.subtitleNameRequired}
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pi-name">
              {P.nameLabel}
              {!isGoogle && <span className="text-accent-text"> *</span>}
            </Label>
            <Input
              id="pi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isGoogle}
              required={!isGoogle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pi-country">{P.countryLabel}</Label>
              <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                <SelectTrigger id="pi-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BR">{P.countries.BR}</SelectItem>
                  <SelectItem value="US">{P.countries.US}</SelectItem>
                  <SelectItem value="PT">{P.countries.PT}</SelectItem>
                  <SelectItem value="other">{P.countries.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pi-city">{P.cityLabel}</Label>
              <Input id="pi-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          {country === "other" && (
            <div className="space-y-1.5">
              <Label htmlFor="pi-country-other">{P.countryOtherLabel}</Label>
              <Input
                id="pi-country-other"
                value={otherCountry}
                onChange={(e) => setOtherCountry(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          {isGoogle ? (
            <button
              type="button"
              onClick={finish}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {P.skipBtn}
            </button>
          ) : (
            <span />
          )}
          <Button
            onClick={handleSave}
            disabled={busy}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {P.continueBtn} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex justify-start">
          <button
            type="button"
            onClick={() => navigate({ to: "/onboarding/metas" })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t.onboarding.questions.back}
          </button>
        </div>
      </div>
    </div>
  );
}
