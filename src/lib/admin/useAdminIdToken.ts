import { useCallback } from "react";
import { auth } from "@/integrations/firebase/client";

/**
 * Returns a function that fetches a fresh Firebase ID token for the current
 * user. Admin server functions require this token as part of their payload
 * because `createServerFn` handlers don't have direct access to request
 * headers in this codebase — see `requireAdmin.server.ts`.
 */
export function useAdminIdToken() {
  return useCallback(async (): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error("401: não autenticado");
    return user.getIdToken();
  }, []);
}
