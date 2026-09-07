import { WATCHLIST_STORAGE_KEY, TRANSACTIONS_STORAGE_KEY } from "./localStorageKeys";
import { DEMO_WATCHLIST_DATA, DEMO_TRANSACTIONS } from "@/__fixtures__/demoPortfolio";
import { setDemoCookie, clearDemoCookie } from "./sessionCookie";
import { auth } from "@/integrations/firebase/client";

/**
 * "See demo" mode — lets an unauthenticated visitor explore /app with a
 * curated, clearly-labeled simulated portfolio, no login required. Kept
 * deliberately separate from watchlist.ts/transactions.ts (which used to
 * auto-seed mock data on empty storage — removed for being surprising and
 * unrequested) so demo entry stays a single, explicit, user-initiated action.
 */
const DEMO_MODE_KEY = "fuente.demoMode.v1";
const DEMO_VERSION_KEY = "fuente.demoVersion.v2";
const SETTINGS_STORAGE_KEY = "ceilingPricePro.settings.v1";

export const DEMO_DEFAULT_SETTINGS = {
  targetYield: 6,
  displayCurrency: "BRL",
  monthlyLivingCostGoal: 8000,
  monthlyLivingCostGoalCurrency: "BRL",
  estimatedMonthlyContribution: 5000,
  smartAllocationTargets: {
    STOCK_BR: 25,
    FII: 35,
    REIT: 10,
    ETF: 25,
    STOCK_US: 5,
  },
  valuationAssumptionsMode: "simple" as const,
  usageAnalyticsConsent: true,
  weeklyDigestEmailConsent: false,
};

export function isDemoModeActive(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  // If user is authenticated, demo mode is NEVER active — purge any leftover keys
  if (auth?.currentUser) {
    endDemoMode();
    return false;
  }
  try {
    return window.localStorage.getItem(DEMO_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Seeds the guest-mode localStorage with the public demo portfolio and flags demo mode active. */
export function startDemoMode(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(DEMO_WATCHLIST_DATA));
    window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(DEMO_TRANSACTIONS));
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEMO_DEFAULT_SETTINGS));
    window.localStorage.setItem(DEMO_MODE_KEY, "true");
    window.localStorage.setItem(DEMO_VERSION_KEY, "true");
  } catch {}
  // Also mirrored into a cookie so the server can see it on a hard
  // navigation/reload — localStorage never reaches the server (see
  // verifySession.functions.ts).
  setDemoCookie();
}

/** Ensures existing demo sessions are automatically upgraded to the latest mock dataset (v2). */
export function syncDemoModeVersion(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (!isDemoModeActive()) return;
  try {
    if (window.localStorage.getItem(DEMO_VERSION_KEY) !== "true") {
      startDemoMode();
    }
  } catch {}
}

/** Clears demo data and the demo flag — called once the visitor authenticates for real. */
export function endDemoMode(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(WATCHLIST_STORAGE_KEY);
    window.localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    window.localStorage.removeItem(DEMO_MODE_KEY);
    window.localStorage.removeItem(DEMO_VERSION_KEY);
  } catch {}
  clearDemoCookie();
}

/**
 * Called from watchlist.ts/transactions.ts's user-facing mutations (add,
 * remove, clear, batch-import, edit) — deliberately NOT from the shared
 * writeLocal() helper, which background effects (e.g. the "heal payment
 * months" sync) also call; guarding there blocked those automatic writes
 * too and falsely bounced demo visitors who hadn't done anything. Blocks
 * the write and hard-navigates to /auth (a full page nav, not a router
 * `navigate()`, since these are plain sync functions with no router
 * context) whenever a demo visitor tries to persist anything — per product
 * decision: demo browsing is free, any data-writing action requires
 * signing in.
 */
export function blockWriteInDemoMode(): boolean {
  if (auth?.currentUser) {
    endDemoMode();
    return false;
  }
  if (!isDemoModeActive()) return false;
  if (typeof window !== "undefined") {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/auth?returnTo=${returnTo}`);
  }
  return true;
}
