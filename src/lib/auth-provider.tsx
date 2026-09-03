import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { User, onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { setSessionCookie, clearSessionCookie } from "@/lib/sessionCookie";

interface AuthCtx {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged (superset of onAuthStateChanged: also fires on the
    // SDK's automatic hourly token refresh) keeps the session cookie fresh
    // so the server can verify a real session on a hard navigation/reload
    // — see verifySession.functions.ts for why this cookie exists at all.
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          setIsAdmin(tokenResult.claims?.isAdmin === true);
          setSessionCookie(tokenResult.token);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        clearSessionCookie();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value: AuthCtx = {
    user,
    isAdmin,
    loading,
    signOut: async () => {
      await firebaseSignOut(auth);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      user: null,
      isAdmin: false,
      loading: false,
      signOut: async () => {},
    };
  }
  return ctx;
}
