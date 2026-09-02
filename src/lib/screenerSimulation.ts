import type { AssetType, Currency } from "@/lib/domain";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { AskEngineSettings } from "@/lib/askEngine/types";
import { getDisplayAssetType } from "@/lib/formatters";
import { convertCurrency } from "@/lib/currency";
import { computeClassAllocationState } from "./portfolioAllocationState";
import { resolveBuyVerdict } from "./audit/buildDecisionLog";
import type { DecisionVerdict } from "./audit/types";

export interface ScreenerSimulationResult {
  ticker: string;
  quantity: number;
  /** Proceeds in the candidate's own currency — never pre-converted (matches the rest of the
   * app's per-row currency convention). */
  amountNative: number;
  currency: Currency;
  verdict: DecisionVerdict;
  reasonKey: string;
  /** Only numeric params — resolving {{className}} to a translated label is the component's job
   * (keeps this module i18n-free and independently testable). */
  reasonParams?: Record<string, number>;
  classType: AssetType | null;
  /** True only when the user has smartAllocationTargets configured — the alloc/deviation fields
   * below are null when this is false, never a fabricated 0/0 comparison. */
  hasTargets: boolean;
  allocBeforePct: number | null;
  allocAfterPct: number | null;
  allocTargetPct: number | null;
  deviationBeforePp: number | null;
  deviationAfterPp: number | null;
  incomeBeforeMonthlyBRL: number;
  incomeAfterMonthlyBRL: number;
}

/**
 * Pure simulation core for the Screener: "if I put R$X into this candidate right now, what
 * happens to my portfolio?" Reuses computeClassAllocationState (Ask Engine's allocation-target
 * math, Regra 1/4 SSOT) and resolveBuyVerdict (Auditoria's verdict taxonomy) rather than
 * reimplementing either. Unlike balanceTargets.ts (which spends a budget across many candidates),
 * this always evaluates exactly ONE user-picked candidate.
 */
export function simulateScreenerImpact(
  candidate: ValuedWatchlistItem,
  amountBRL: number,
  allPositions: ValuedWatchlistItem[],
  settings: AskEngineSettings,
  fxRate: number,
): ScreenerSimulationResult {
  const livePrice = candidate.livePrice ?? candidate.currentPrice ?? 0;
  const amountNativeRequested =
    candidate.currency === "USD" ? convertCurrency(amountBRL, "BRL", "USD", fxRate) : amountBRL;
  const quantity =
    livePrice > 0 && amountNativeRequested > 0 ? Math.floor(amountNativeRequested / livePrice) : 0;
  const spentNative = quantity * livePrice;
  const spentBRL = convertCurrency(spentNative, candidate.currency, "BRL", fxRate);

  const margin = candidate.valuation?.margin ?? candidate.safetyMargin ?? null;
  const yieldTrap = candidate.valuation?.yieldTrapWarning === true;
  const verdict = resolveBuyVerdict(margin, yieldTrap);

  const classType = getDisplayAssetType(candidate.type);
  const allocationState = computeClassAllocationState(allPositions, settings.smartAllocationTargets, fxRate);
  const classState = allocationState.get(classType);
  const hasTargets = allocationState.size > 0;

  let allocBeforePct: number | null = null;
  let allocAfterPct: number | null = null;
  let allocTargetPct: number | null = null;
  let deviationBeforePp: number | null = null;
  let deviationAfterPp: number | null = null;

  if (classState) {
    allocTargetPct = classState.targetPct * 100;
    allocBeforePct = classState.currentPct * 100;
    const newClassValue = classState.currentValue + spentBRL;
    const newTotal = classState.totalCurrentValue + spentBRL;
    allocAfterPct = newTotal > 0 ? (newClassValue / newTotal) * 100 : allocBeforePct;
    deviationBeforePp = Math.abs(allocTargetPct - allocBeforePct);
    deviationAfterPp = Math.abs(allocTargetPct - allocAfterPct);
  }

  let incomeBeforeMonthlyBRL = 0;
  for (const pos of allPositions) {
    if (!pos.quantity || pos.quantity <= 0) continue;
    const annualNative = pos.quantity * (pos.annualDividend || 0);
    incomeBeforeMonthlyBRL += convertCurrency(annualNative, pos.currency, "BRL", fxRate) / 12;
  }
  const addedAnnualNative = quantity * (candidate.annualDividend || 0);
  const addedMonthlyBRL = convertCurrency(addedAnnualNative, candidate.currency, "BRL", fxRate) / 12;
  const incomeAfterMonthlyBRL = incomeBeforeMonthlyBRL + addedMonthlyBRL;

  // "Why" reason — verdict warnings take precedence over allocation-fit framing (matches the
  // approved prototype: an overpriced/yield-trap candidate explains THAT, not the allocation gap).
  const alreadyHeld = (candidate.quantity ?? 0) > 0;
  let reasonKey: string;
  let reasonParams: Record<string, number> | undefined;

  if (verdict === "yield_trap") {
    reasonKey = "screenerScreen.reasons.yieldTrap";
  } else if (verdict === "above_ceiling") {
    reasonKey = "screenerScreen.reasons.aboveCeiling";
  } else if (alreadyHeld) {
    reasonKey = "screenerScreen.reasons.alreadyHeld";
  } else if (classState && classState.currentPct < classState.targetPct) {
    reasonKey = "screenerScreen.reasons.belowTarget";
    reasonParams = { deviation: Number((deviationBeforePp ?? 0).toFixed(1)) };
  } else if (classState) {
    reasonKey = "screenerScreen.reasons.withinTarget";
  } else {
    reasonKey = "screenerScreen.reasons.noTargets";
  }

  return {
    ticker: candidate.ticker,
    quantity,
    amountNative: Number(spentNative.toFixed(2)),
    currency: candidate.currency,
    verdict,
    reasonKey,
    reasonParams,
    classType,
    hasTargets,
    allocBeforePct,
    allocAfterPct,
    allocTargetPct,
    deviationBeforePp,
    deviationAfterPp,
    incomeBeforeMonthlyBRL: Number(incomeBeforeMonthlyBRL.toFixed(2)),
    incomeAfterMonthlyBRL: Number(incomeAfterMonthlyBRL.toFixed(2)),
  };
}
