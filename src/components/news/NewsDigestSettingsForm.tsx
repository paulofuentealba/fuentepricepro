import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  ShieldAlert,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useAuth } from "@/lib/auth-provider";
import { toast } from "sonner";
import {
  useUserSettings,
  DEFAULT_DIGEST_PREFERENCES,
  type NewsDigestPreferences,
  type NewsDigestFrequency,
} from "@/lib/useUserSettings";

export interface NewsDigestSettingsFormProps {
  onSaved?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export function NewsDigestSettingsForm({
  onSaved,
  onCancel,
  showCancel = false,
}: NewsDigestSettingsFormProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();

  // Local editable draft state (AGENTS.md Rule 8: explicit save/cancel)
  const [enabled, setEnabled] = useState(Boolean(settings.weeklyDigestEmailConsent));
  const [preferences, setPreferences] = useState<NewsDigestPreferences>(
    settings.newsDigestPreferences ?? DEFAULT_DIGEST_PREFERENCES,
  );

  // Synchronize draft whenever external settings change
  useEffect(() => {
    setEnabled(Boolean(settings.weeklyDigestEmailConsent));
    setPreferences(settings.newsDigestPreferences ?? DEFAULT_DIGEST_PREFERENCES);
  }, [settings.weeklyDigestEmailConsent, settings.newsDigestPreferences]);

  const handleSave = () => {
    updateSettings({
      weeklyDigestEmailConsent: enabled,
      newsDigestPreferences: preferences,
    });
    toast.success(t?.toasts?.settingsSaved ?? "Configurações salvas.");
    onSaved?.();
  };

  const setFrequency = (freq: NewsDigestFrequency) => {
    setPreferences((prev) => ({
      ...prev,
      frequency: freq,
      dayOfWeek: prev.dayOfWeek ?? "monday",
      dayOfMonth: prev.dayOfMonth ?? "first_business_day",
    }));
  };

  const toggleTopic = (
    key:
      | "includeIncomeAnnouncements"
      | "includeRiskAlerts"
      | "includeThesisDrift"
      | "includeOpportunities",
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const M = t.newsScreen.digestModal;

  return (
    <div className="space-y-4 py-1">
      {/* User Auth Email Card */}
      {user?.email ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-0.5">
          <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            {M.emailLabel}
          </p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {user.email}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
          <span>{M.loginRequired}</span>
        </div>
      )}

      {/* Master Toggle Card */}
      <div
        onClick={() => user?.email && setEnabled((prev) => !prev)}
        className={`flex items-center justify-between rounded-xl border p-3.5 transition-colors ${
          user?.email ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
        } ${
          enabled
            ? "border-accent bg-accent/10"
            : "border-border/60 bg-muted/20 hover:border-border"
        }`}
      >
        <div className="space-y-0.5 pr-2">
          <div className="text-xs font-semibold text-foreground">
            {M.masterToggleLabel}
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug">
            {M.masterToggleDesc}
          </div>
        </div>
        <div
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            enabled ? "bg-accent-text" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </div>
      </div>

      {enabled && (
        <>
          {/* Frequency Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {M.frequencySectionTitle}
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {/* Weekly */}
              <button
                type="button"
                onClick={() => setFrequency("weekly")}
                className={`flex flex-col text-left rounded-xl border p-3 transition-colors ${
                  preferences.frequency === "weekly"
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border/60 bg-card hover:border-accent/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-accent-text" />
                  <span>{M.frequencies.weekly}</span>
                </div>
                <span className="text-[10.5px] text-muted-foreground mt-1 leading-tight">
                  {M.frequencies.weeklyDesc}
                </span>
              </button>

              {/* Monthly */}
              <button
                type="button"
                onClick={() => setFrequency("monthly")}
                className={`flex flex-col text-left rounded-xl border p-3 transition-colors ${
                  preferences.frequency === "monthly"
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border/60 bg-card hover:border-accent/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-accent-text" />
                  <span>{M.frequencies.monthly}</span>
                </div>
                <span className="text-[10.5px] text-muted-foreground mt-1 leading-tight">
                  {M.frequencies.monthlyDesc}
                </span>
              </button>

              {/* Critical Only */}
              <button
                type="button"
                onClick={() => setFrequency("critical_only")}
                className={`flex flex-col text-left rounded-xl border p-3 transition-colors ${
                  preferences.frequency === "critical_only"
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border/60 bg-card hover:border-accent/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <ShieldAlert className="h-3.5 w-3.5 text-warning" />
                  <span>{M.frequencies.criticalOnly}</span>
                </div>
                <span className="text-[10.5px] text-muted-foreground mt-1 leading-tight">
                  {M.frequencies.criticalOnlyDesc}
                </span>
              </button>
            </div>
          </div>

          {/* Contextual Timing Settings */}
          {preferences.frequency === "weekly" && (
            <div className="space-y-2 rounded-xl border border-border/50 bg-muted/15 p-3">
              <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {M.timingSectionTitle}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPreferences((prev) => ({ ...prev, dayOfWeek: "monday" }))
                  }
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    preferences.dayOfWeek === "monday"
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border/60 bg-card text-muted-foreground hover:border-border"
                  }`}
                >
                  <span>{M.daysOfWeek.monday}</span>
                  {preferences.dayOfWeek === "monday" && (
                    <Check className="h-3.5 w-3.5 text-accent-text" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPreferences((prev) => ({ ...prev, dayOfWeek: "friday" }))
                  }
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    preferences.dayOfWeek === "friday"
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border/60 bg-card text-muted-foreground hover:border-border"
                  }`}
                >
                  <span>{M.daysOfWeek.friday}</span>
                  {preferences.dayOfWeek === "friday" && (
                    <Check className="h-3.5 w-3.5 text-accent-text" />
                  )}
                </button>
              </div>
            </div>
          )}

          {preferences.frequency === "monthly" && (
            <div className="space-y-2 rounded-xl border border-border/50 bg-muted/15 p-3">
              <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {M.timingSectionTitle}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPreferences((prev) => ({
                      ...prev,
                      dayOfMonth: "first_business_day",
                    }))
                  }
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                    preferences.dayOfMonth === "first_business_day"
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border/60 bg-card text-muted-foreground hover:border-border"
                  }`}
                >
                  <span className="truncate">{M.daysOfMonth.firstBusinessDay}</span>
                  {preferences.dayOfMonth === "first_business_day" && (
                    <Check className="h-3.5 w-3.5 text-accent-text shrink-0 ml-1" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPreferences((prev) => ({ ...prev, dayOfMonth: "first_day" }))
                  }
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                    preferences.dayOfMonth === "first_day"
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border/60 bg-card text-muted-foreground hover:border-border"
                  }`}
                >
                  <span className="truncate">{M.daysOfMonth.firstDay}</span>
                  {preferences.dayOfMonth === "first_day" && (
                    <Check className="h-3.5 w-3.5 text-accent-text shrink-0 ml-1" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPreferences((prev) => ({ ...prev, dayOfMonth: "fifteenth" }))
                  }
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                    preferences.dayOfMonth === "fifteenth"
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border/60 bg-card text-muted-foreground hover:border-border"
                  }`}
                >
                  <span className="truncate">{M.daysOfMonth.fifteenth}</span>
                  {preferences.dayOfMonth === "fifteenth" && (
                    <Check className="h-3.5 w-3.5 text-accent-text shrink-0 ml-1" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Topics Selection Checkboxes */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {M.topicsSectionTitle}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Income */}
              <label className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 text-xs text-foreground cursor-pointer hover:bg-muted/10 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.includeIncomeAnnouncements}
                  onChange={() => toggleTopic("includeIncomeAnnouncements")}
                  className="h-4 w-4 rounded accent-accent-text cursor-pointer"
                />
                <span>{M.topics.income}</span>
              </label>

              {/* Risk */}
              <label className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 text-xs text-foreground cursor-pointer hover:bg-muted/10 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.includeRiskAlerts}
                  onChange={() => toggleTopic("includeRiskAlerts")}
                  className="h-4 w-4 rounded accent-accent-text cursor-pointer"
                />
                <span>{M.topics.risk}</span>
              </label>

              {/* Thesis */}
              <label className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 text-xs text-foreground cursor-pointer hover:bg-muted/10 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.includeThesisDrift}
                  onChange={() => toggleTopic("includeThesisDrift")}
                  className="h-4 w-4 rounded accent-accent-text cursor-pointer"
                />
                <span>{M.topics.thesis}</span>
              </label>

              {/* Opportunities */}
              <label className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 text-xs text-foreground cursor-pointer hover:bg-muted/10 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.includeOpportunities}
                  onChange={() => toggleTopic("includeOpportunities")}
                  className="h-4 w-4 rounded accent-accent-text cursor-pointer"
                />
                <span>{M.topics.opportunities}</span>
              </label>
            </div>
          </div>
        </>
      )}

      {/* LGPD Compliance Footer Notice */}
      <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground leading-relaxed">
        <ShieldCheck className="h-4 w-4 shrink-0 text-accent-text mt-0.5" />
        <span>{M.lgpdNotice}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
        {showCancel && onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            {M.cancelBtn}
          </Button>
        )}
        {user?.email && (
          <Button size="sm" onClick={handleSave}>
            {M.saveBtn}
          </Button>
        )}
      </div>
    </div>
  );
}
