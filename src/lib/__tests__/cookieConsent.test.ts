// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  hasAnalyticsConsent,
  hasConsentDecision,
  setCookieConsent,
  getCookieConsent,
} from "../cookieConsent";

describe("cookieConsent", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  it("returns false by default (localStorage empty / no decision yet)", () => {
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasConsentDecision()).toBe(false);
  });

  it("returns true after the user accepts analytics", () => {
    setCookieConsent(true);
    expect(hasAnalyticsConsent()).toBe(true);
    expect(hasConsentDecision()).toBe(true);

    const stored = getCookieConsent();
    expect(stored?.analytics).toBe(true);
    expect(typeof stored?.timestamp).toBe("string");
  });

  it("returns false after the user rejects analytics", () => {
    setCookieConsent(false);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasConsentDecision()).toBe(true);
  });

  it("returns false when the persisted value is malformed", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "{not-json");
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasConsentDecision()).toBe(false);
  });

  it("considers consent valid within 365 days TTL", () => {
    const baseDate = new Date("2026-01-01T00:00:00.000Z").getTime();
    const day100 = new Date("2026-04-11T00:00:00.000Z").getTime(); // 100 days later

    const storedValue = {
      analytics: true,
      timestamp: new Date(baseDate).toISOString(),
    };
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(storedValue));

    expect(getCookieConsent(day100)?.analytics).toBe(true);
    expect(hasConsentDecision(day100)).toBe(true);
    expect(hasAnalyticsConsent(day100)).toBe(true);
  });

  it("treats consent as expired after 365 days TTL", () => {
    const baseDate = new Date("2025-01-01T00:00:00.000Z").getTime();
    const day366 = new Date("2026-01-02T00:00:00.000Z").getTime(); // 366 days later

    const storedValue = {
      analytics: true,
      timestamp: new Date(baseDate).toISOString(),
    };
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(storedValue));

    expect(getCookieConsent(day366)).toBeNull();
    expect(hasConsentDecision(day366)).toBe(false);
    expect(hasAnalyticsConsent(day366)).toBe(false);
  });
});
