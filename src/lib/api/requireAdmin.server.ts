import { getAdminAuth } from "@/integrations/firebase/admin";

/**
 * Validates a Firebase ID token and confirms the `isAdmin: true` custom
 * claim. Throws on any failure (401/403).
 *
 * Takes the raw ID token string (not a `Request`) because `createServerFn`
 * handlers in this codebase don't expose the underlying `Request` object —
 * the client passes the token explicitly as part of the validated payload.
 *
 * @param idToken Firebase ID token obtained client-side via `user.getIdToken()`
 * @returns The decoded token payload (uid, isAdmin)
 * @throws Error with message "401: não autenticado" if no valid token
 * @throws Error with message "403: acesso negado" if token valid but not admin
 */
export async function requireAdmin(idToken: string | null | undefined): Promise<{ uid: string; isAdmin: boolean }> {
  if (!idToken) {
    throw new Error("401: não autenticado");
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    // Admin SDK not configured — this is a server misconfiguration,
    // but we treat it as auth failure to avoid false positives.
    throw new Error("500: autenticação administrativa indisponível");
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.isAdmin !== true) {
      throw new Error("403: acesso negado");
    }
    return { uid: decoded.uid, isAdmin: true };
  } catch (error: any) {
    // Re-throw our own 401/403 errors; wrap others as 401
    if (error.message?.startsWith("401:") || error.message?.startsWith("403:")) {
      throw error;
    }
    throw new Error("401: não autenticado");
  }
}
