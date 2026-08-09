import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { SubscriptionTier } from "./subscription";

/**
 * Global Feature Gate Configuration
 * 
 * Manages system-wide feature gate values and limits stored in `config/featureGates`.
 * Decoupled from individual per-user entitlement (subscriptionStatus).
 */

export interface FeatureGatesConfig {
  freeAssetLimit?: number;
  cashflowUnlocked?: boolean;
  smartAllocationUnlocked?: boolean;
  customTaxUnlocked?: boolean;
  sliderUnlocked?: boolean;
  strategiesUnlocked?: boolean;
  [key: string]: boolean | number | undefined;
}

export const DEFAULT_FEATURE_GATES: FeatureGatesConfig & { freeAssetLimit: number } = {
  freeAssetLimit: Number.POSITIVE_INFINITY,
  cashflowUnlocked: true,
  smartAllocationUnlocked: true,
  customTaxUnlocked: true,
  sliderUnlocked: true,
  strategiesUnlocked: true,
};

export type FeatureGateKey = keyof typeof DEFAULT_FEATURE_GATES | string;

/**
 * Pure function to resolve a feature gate value given user tier and global gate configuration.
 * Extracted from I/O layer for isolated unit testing in Vitest.
 * 
 * @param tier User subscription tier ('free' | 'pro')
 * @param gatesConfig Global feature gate configuration object from Firestore or fallback
 * @param key Target feature gate key
 */
export function resolveFeatureGate(
  tier: SubscriptionTier,
  gatesConfig: FeatureGatesConfig | null | undefined,
  key: string
): boolean | number {
  const effectiveConfig = { ...DEFAULT_FEATURE_GATES, ...(gatesConfig || {}) };
  const defaultValue = effectiveConfig[key] ?? true;

  if (tier === "pro") {
    // Pro users bypass limits (Infinity) and unlock boolean flags (true)
    if (typeof defaultValue === "number") {
      return Number.POSITIVE_INFINITY;
    }
    return true;
  }

  // Free tier receives the configured limit or flag from Firestore config or fail-open fallback
  return defaultValue;
}

/**
 * Real-time listener for the global `config/featureGates` Firestore document.
 * Fail-safe: Falls back to `DEFAULT_FEATURE_GATES` if the document is missing or errors occur.
 */
export function useFeatureGates() {
  const [gates, setGates] = useState<FeatureGatesConfig>(DEFAULT_FEATURE_GATES);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const docRef = doc(db, "config", "featureGates");

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FeatureGatesConfig;
          setGates({ ...DEFAULT_FEATURE_GATES, ...data });
        } else {
          setGates(DEFAULT_FEATURE_GATES);
        }
        setLoading(false);
      },
      (error) => {
        console.error("[useFeatureGates] Error listening to config/featureGates:", error);
        setGates(DEFAULT_FEATURE_GATES);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { gates, loading };
}
