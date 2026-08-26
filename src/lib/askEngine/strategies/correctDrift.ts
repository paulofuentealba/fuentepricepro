import { runBalanceTargets } from "./balanceTargets";
import type { Strategy } from "../types";

/**
 * Strategy: Correct Drift (Corrigir Desvio)
 *
 * Reinvestment strategy that prioritizes asset classes furthest below target allocation.
 * Reuses the pure algorithmic core of `runBalanceTargets` with zero duplication.
 */
export const correctDriftStrategy: Strategy = {
  id: "correctDrift",
  labelKey: "askEngine.strategies.correctDrift",
  requiresTargets: true,
  run: runBalanceTargets,
};
