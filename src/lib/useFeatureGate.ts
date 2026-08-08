/**
 * Public Feature Gate Consumption Hook
 * 
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. THIS IS THE ONLY HOOK ANY COMPONENT MUST CONSUME FOR FEATURE GATE DECISIONS.
 * 2. Components MUST NOT call `useSubscription()` or `useFeatureGates()` directly to determine gate permissions.
 * 3. This hook unifies per-user entitlement (`useSubscription`) and global gate configuration (`useFeatureGates`)
 *    via the pure resolution function `resolveFeatureGate`.
 */

import { useSubscription } from "./subscription";
import { useFeatureGates, resolveFeatureGate, type FeatureGateKey } from "./featureGates";

export function useFeatureGate(key: FeatureGateKey): boolean | number {
  const { tier } = useSubscription();
  const { gates } = useFeatureGates();

  return resolveFeatureGate(tier, gates, key);
}
