import React, { createContext, useContext, useState, ReactNode } from "react";

export type SubscriptionTier = "free" | "pro";

interface SubscriptionContextType {
  tier: SubscriptionTier;
  setTier: (tier: SubscriptionTier) => void;
  isPro: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier>("free");

  return (
    <SubscriptionContext.Provider value={{ tier, setTier, isPro: true }}>
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
