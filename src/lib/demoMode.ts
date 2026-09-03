import { WATCHLIST_STORAGE_KEY, TRANSACTIONS_STORAGE_KEY } from "./localStorageKeys";
import { DEMO_WATCHLIST_DATA, DEMO_TRANSACTIONS } from "@/__fixtures__/demoPortfolio";

/**
 * "See demo" mode — lets an unauthenticated visitor explore /app with a
 * curated, clearly-labeled simulated portfolio, no login required. Kept
 * deliberately separate from watchlist.ts/transactions.ts (which used to
 * auto-seed mock data on empty storage — removed for being surprising and
 * unrequested) so demo entry stays a single, explicit, user-initiated action.
 */
const DEMO_MODE_KEY = "fuente.demoMode.v1";

export function isDemoModeActive(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEMO_MODE_KEY) === "true";
}

/** Seeds the guest-mode localStorage with the public demo portfolio and flags demo mode active. */
export function startDemoMode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(DEMO_WATCHLIST_DATA));
  window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(DEMO_TRANSACTIONS));
  window.localStorage.setItem(DEMO_MODE_KEY, "true");
}

/** Clears demo data and the demo flag — called once the visitor authenticates for real. */
export function endDemoMode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WATCHLIST_STORAGE_KEY);
  window.localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
  window.localStorage.removeItem(DEMO_MODE_KEY);
}

/**
 * Called from watchlist.ts/transactions.ts's writeLocal() — the single choke
 * point every local write passes through in guest/demo mode. Blocks the
 * write and hard-navigates to /auth (a full page nav, not a router
 * `navigate()`, since these are plain sync functions with no router
 * context) whenever a demo visitor tries to persist anything: adding an
 * asset, editing a position, importing a CSV, etc. — per product decision:
 * demo browsing is free, any data-writing action requires signing in.
 */
export function blockWriteInDemoMode(): boolean {
  if (!isDemoModeActive()) return false;
  if (typeof window !== "undefined") {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/auth?returnTo=${returnTo}`);
  }
  return true;
}
