import { getAdminAuth } from "@/integrations/firebase/admin";

/**
 * Extracts the Bearer token from the Authorization header of a Request.
 * Returns the token string or null if not present/malformed.
 */
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

/**
 * Validates that the request carries a valid Firebase ID token with the
 * `isAdmin: true` custom claim. Throws on any failure (401/403).
 *
 * @param request The incoming Request (must include Authorization: Bearer <idToken>)
 * @returns The decoded token payload (including uid, isAdmin, etc.)
 * @throws Error with message "401: não autenticado" if no valid token
 * @throws Error with message "403: acesso negado" if token valid but not admin
 */
export async function requireAdmin(request: Request): Promise<{ uid: string; isAdmin: boolean }> {
  const idToken = extractBearerToken(request);
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
    if (error.message.startsWith("401:") || error.message.startsWith("403:")) {
      throw error;
    }
    throw new Error("401: não autenticado");
  }
}