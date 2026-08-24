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
export const COOKIE_CONSENT_TTL_DAYS = 365;
export const COOKIE_CONSENT_TTL_MS = COOKIE_CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000;

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

/**
 * Checks whether a consent timestamp is expired (older than 365 days).
 */
export function isCookieConsentExpired(timestamp: string, now: number = Date.now()): boolean {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return true;
  return now - parsed > COOKIE_CONSENT_TTL_MS;
}

/** Reads the raw persisted consent value, or null if unset, invalid, or expired. */
export function getCookieConsent(now: number = Date.now()): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isCookieConsentValue(parsed)) return null;
    if (isCookieConsentExpired(parsed.timestamp, now)) {
      return null;
    }
    return parsed;
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
 * is missing/invalid/expired, or if the user explicitly rejected. Returns `true`
 * only after an explicit acceptance within the active 365-day TTL.
 *
 * Intended to gate future analytics bootstrap code (e.g. PostHog), which
 * is NOT installed by this module.
 */
export function hasAnalyticsConsent(now?: number): boolean {
  const consent = getCookieConsent(now);
  return consent?.analytics === true;
}

/** Whether the user has made an active, unexpired choice yet (accepted or rejected). */
export function hasConsentDecision(now?: number): boolean {
  return getCookieConsent(now) !== null;
}
