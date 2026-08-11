import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserSettings } from "@/lib/useUserSettings";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";

export interface FIProgressResult {
  coveragePercent: number;
  isReached: boolean;
  targetCapital: number;
  totalCapitalBRL: number;
  monthlyIncomeBRL: number;
  monthsToFI: number | null;
}

/**
 * Calcula meses até atingir a independência financeira (FI), dado o capital
 * atual, contribuição mensal, capital-alvo e yield anual (%).
 *
 * Extraído de FIProgressCard.tsx sem alteração de comportamento.
 */
export function calculateMonthsToFI(
  currentCapital: number,
  monthlyContribution: number,
  targetCapital: number,
  annualYield: number,
): number {
  if (currentCapital >= targetCapital) return 0;

  const r = annualYield / 100 / 12; // Monthly rate
  if (r === 0) {
    return monthlyContribution > 0
      ? (targetCapital - currentCapital) / monthlyContribution
      : Infinity;
  }

  // If no contribution and no capital, we will never reach it
  if (monthlyContribution <= 0 && currentCapital <= 0) return Infinity;

  const FV = targetCapital;
  const PV = currentCapital;
  const PMT = monthlyContribution;

  const numerator = FV * r + PMT;
  const denominator = PV * r + PMT;

  // If denominator is 0 (shouldn't happen with positive PMT/PV), prevent division by zero
  if (denominator <= 0) return Infinity;

  const n = Math.log(numerator / denominator) / Math.log(1 + r);

  return isNaN(n) || n < 0 ? Infinity : n;
}

/**
 * Hook puro com o progresso de Independência Financeira (FI).
 *
 * Consome os mesmos inputs que `FIProgressCard.tsx` já usava inline
 * (`useValuedPortfolio`, `useUserSettings`, `exchangeRateQueryOptions`) e
 * reproduz exatamente a mesma fórmula, sem alterar nenhum número exibido.
 */
export function useFIProgress(): FIProgressResult {
  const { settings } = useUserSettings();
  const { valuedItems: items } = useValuedPortfolio();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const usdRate = fx?.USDBRL ?? 5.5;

  const convertToBRL = useCallback(
    (value: number, curr: string) => {
      if (curr === "USD") return value * usdRate;
      return value;
    },
    [usdRate],
  );

  const { totalCapitalBRL, monthlyIncomeBRL } = useMemo(() => {
    let capital = 0;
    let annualIncome = 0;

    for (const item of items) {
      if (item.quantity && item.quantity > 0) {
        const itemCapital = item.quantity * (item.currentPrice || 0);
        const itemIncome = item.quantity * (item.annualDividend || 0);

        capital += convertToBRL(itemCapital, item.currency);
        annualIncome += convertToBRL(itemIncome, item.currency);
      }
    }

    return { totalCapitalBRL: capital, monthlyIncomeBRL: annualIncome / 12 };
  }, [items, convertToBRL]);

  const currency = settings.displayCurrency;

  const toUserCurrency = useCallback(
    (valueBRL: number) => {
      if (currency === "USD") {
        const rate = convertToBRL(1, "USD") || 1;
        return valueBRL / rate;
      }
      return valueBRL;
    },
    [currency, convertToBRL],
  );

  const totalCapital = toUserCurrency(totalCapitalBRL);
  const currentMonthlyIncome = toUserCurrency(monthlyIncomeBRL);
  const monthlyCostGoal = settings.monthlyLivingCostGoal || 0;
  const monthlyContribution = settings.estimatedMonthlyContribution || 0;

  const isSetup = monthlyCostGoal > 0;

  const ratio = isSetup && monthlyCostGoal > 0 ? currentMonthlyIncome / monthlyCostGoal : 0;
  const coveragePercent = Math.min(100, Math.max(0, ratio * 100));
  const isReached = isSetup && ratio >= 1;

  const targetCapital = isSetup ? monthlyCostGoal / (settings.targetYield / 100 / 12) : 0;
  const monthsToFIRaw =
    isSetup && !isReached
      ? calculateMonthsToFI(totalCapital, monthlyContribution, targetCapital, settings.targetYield)
      : 0;

  // Nunca expor NaN silenciosamente: Infinity vira null explicitamente.
  const monthsToFI = Number.isFinite(monthsToFIRaw) ? monthsToFIRaw : null;

  return {
    coveragePercent,
    isReached,
    targetCapital,
    totalCapitalBRL,
    monthlyIncomeBRL,
    monthsToFI,
  };
}
