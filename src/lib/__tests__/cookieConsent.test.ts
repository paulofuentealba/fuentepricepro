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
});
