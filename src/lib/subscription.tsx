import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useAuth } from "./auth-provider";

export type SubscriptionTier = "free" | "pro";

/**
 * User Entitlement Context
 * 
 * Manages per-user subscription state (is this user Pro or Free?).
 * Decoupled from global Feature Gate configurations (config/featureGates).
 * 
 * Single source of truth for user tier reading `users/{uid}.subscriptionStatus` via Firestore onSnapshot.
 */
interface SubscriptionContextType {
  tier: SubscriptionTier;
  isPro: boolean;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Guest mode (unauthenticated) -> always 'free'
    if (!user) {
      setTier("free");
      setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const status = data?.subscriptionStatus;
          // Fail-safe: treat any value other than 'pro' as 'free'
          setTier(status === "pro" ? "pro" : "free");
        } else {
          setTier("free");
        }
        setLoading(false);
      },
      (error) => {
        console.error("[SubscriptionProvider] Error listening to user subscription document:", error);
        setTier("free");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const isPro = tier === "pro";

  return (
    <SubscriptionContext.Provider value={{ tier, isPro, loading }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
