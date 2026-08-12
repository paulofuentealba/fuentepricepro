/**
 * Cookie consent infrastructure (LGPD/GDPR).
 *
 * Persists the user's choice about non-essential (analytics) cookies in
 * localStorage. Essential cookies (auth, app functioning) never require
 * consent and are always active.
 *
 * This module does NOT install or initialize any analytics library
 * (e.g. PostHog). It only exposes the gate that a future analytics
 * bootstrap should check before loading/running.
 */

export const COOKIE_CONSENT_STORAGE_KEY = "cookieConsent.v1";

export interface CookieConsentValue {
  analytics: boolean;
  timestamp: string;
}

function isCookieConsentValue(value: unknown): value is CookieConsentValue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).analytics === "boolean" &&
    typeof (value as Record<string, unknown>).timestamp === "string"
  );
}

/** Reads the raw persisted consent value, or null if unset/invalid. */
export function getCookieConsent(): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCookieConsentValue(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persists the user's explicit choice about analytics cookies. */
export function setCookieConsent(analytics: boolean): void {
  if (typeof window === "undefined") return;
  const value: CookieConsentValue = {
    analytics,
    timestamp: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore (e.g. storage disabled/full)
  }
}

/**
 * Whether the user has explicitly opted into analytics cookies.
 *
 * Returns `false` by default — before any decision, if the stored value
 * is missing/invalid, or if the user explicitly rejected. Returns `true`
 * only after an explicit acceptance.
 *
 * Intended to gate future analytics bootstrap code (e.g. PostHog), which
 * is NOT installed by this module.
 */
export function hasAnalyticsConsent(): boolean {
  const consent = getCookieConsent();
  return consent?.analytics === true;
}

/** Whether the user has made any choice yet (accepted or rejected). */
export function hasConsentDecision(): boolean {
  return getCookieConsent() !== null;
}
