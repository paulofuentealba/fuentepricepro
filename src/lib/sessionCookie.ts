/**
 * Client-side cookie helpers for the /app auth guard's SSR fallback.
 *
 * Firebase client auth persists to IndexedDB, which the server can never
 * see — so a hard navigation/reload always looked unauthenticated to
 * routes/app.tsx's `beforeLoad` even for a genuinely signed-in user (the
 * exact same pre-existing gap already present in /settings and /profile).
 * Mirroring the ID token (and the demo-mode flag) into a plain cookie lets
 * the server verify the session via Firebase Admin (see
 * src/lib/verifySession.functions.ts) instead of just assuming "no user".
 *
 * Not httpOnly/secure-flagged on purpose: it's set from client JS via
 * `document.cookie`, mirroring a value the client already fully controls
 * (the ID token itself, readable by any script in this origin) — no new
 * attack surface versus what IndexedDB-persisted Firebase auth already is.
 */
export const SESSION_COOKIE_NAME = "fuente_session";
export const DEMO_COOKIE_NAME = "fuente_demo";

// Firebase ID tokens expire hourly; auth-provider.tsx refreshes this cookie
// on every onIdTokenChanged firing (including the SDK's automatic refresh).
const SESSION_COOKIE_MAX_AGE_S = 60 * 60;
const DEMO_COOKIE_MAX_AGE_S = 60 * 60 * 24;

export function setSessionCookie(idToken: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=${idToken}; path=/; max-age=${SESSION_COOKIE_MAX_AGE_S}; SameSite=Lax`;
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function setDemoCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_COOKIE_NAME}=1; path=/; max-age=${DEMO_COOKIE_MAX_AGE_S}; SameSite=Lax`;
}

export function clearDemoCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
