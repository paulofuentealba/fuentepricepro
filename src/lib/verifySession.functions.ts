import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { getAdminAuth } from "@/integrations/firebase/admin";
import { SESSION_COOKIE_NAME, DEMO_COOKIE_NAME } from "./sessionCookie";

export interface VerifySessionResult {
  authenticated: boolean;
}

/**
 * Server-side fallback for the `beforeLoad` auth guards on /app, /settings,
 * /profile and /onboarding/*. The primary check in each (`auth.currentUser`)
 * only ever sees a session on a client-side SPA transition — Firebase's
 * IndexedDB-persisted session is invisible to the server, so a hard
 * navigation/reload always looked unauthenticated even for a real signed-in
 * user. This reads the session/demo cookie (mirrored client-side by
 * auth-provider.tsx / demoMode.ts) and verifies the ID token via Admin SDK
 * before the guard commits to a redirect.
 */
export const verifySessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<VerifySessionResult> => {
    if (getCookie(DEMO_COOKIE_NAME) === "1") {
      return { authenticated: true };
    }

    const sessionCookie = getCookie(SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      return { authenticated: false };
    }

    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return { authenticated: false };
    }

    try {
      await adminAuth.verifyIdToken(sessionCookie);
      return { authenticated: true };
    } catch {
      return { authenticated: false };
    }
  },
);
