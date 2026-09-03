import type { WatchlistItem } from "./watchlist";
import type { AssetType, Currency } from "./domain";

import { netAfterTax } from "./calculations";
import { convertCurrency } from "./currency";

export type StrategyKey = "yield" | "margin" | "snowball" | "gapFiller" | "defensive";

/**
 * Tolerance margin (in percentage points) for Target Allocation deviation
 * before it is visually flagged as "out of range" in the UI.
 *
 * This constant is intentionally isolated here (not inline in components)
 * because it will be reused by the future Alerts/Notifications capability
 * (Prompt D) as the trigger threshold for rebalancing notifications.
 */
export const ALLOCATION_TOLERANCE_PCT = 2;

/**
 * Calculates allocation deviation (in percentage points) between current allocation and target allocation.
 * Returns null if currentVal is null or undefined.
 */
export function calculateAllocationDeviation(
  currentVal: number | null | undefined,
  targetVal: number,
): number | null {
  if (currentVal == null || !Number.isFinite(currentVal)) return null;
  return currentVal - targetVal;
}

/**
 * Checks if allocation deviation exceeds the specified tolerance percentage points.
 * Returns false if currentVal is null or undefined.
 */
export function isOutOfTolerance(
  currentVal: number | null | undefined,
  targetVal: number,
  tolerance: number = ALLOCATION_TOLERANCE_PCT,
): boolean {
  const deviation = calculateAllocationDeviation(currentVal, targetVal);
  if (deviation == null) return false;
  return Math.abs(deviation) > tolerance;
}

export const STRATEGY_ORDER: StrategyKey[] = [
  "yield",
  "margin",
  "snowball",
  "gapFiller",
  "defensive",
];

export function scoreFor(
  item: WatchlistItem,
  strategy: StrategyKey,
  coveredMonths: Set<number>,
): number {
  const netDiv = netAfterTax(item.annualDividend, item.type, item.currency, item.customTaxRate);
  switch (strategy) {
    case "yield":
      return item.currentPrice > 0 ? netDiv / item.currentPrice : 0;
    case "margin":
      return Math.max(item.safetyMargin, 0);
    case "snowball": {
      if (item.currentPrice <= 0) return 0;
      let score = netDiv / item.currentPrice;

      // Risk Control Filter: Penalize suspiciously high yields (dividend traps)
      if (score > 0.15) {
        score *= 0.5; // 50% penalty for yields > 15%
      }

      // Risk Control Filter: Penalize unsafe payout ratios
      if (item.payoutRatio != null && (item.payoutRatio > 1.0 || item.payoutRatio < 0)) {
        score *= 0.5; // 50% penalty for unsafe payout ratio
      }

      return score;
    }
    case "gapFiller": {
      const months = item.paymentMonths ?? [];
      if (months.length === 0) return 0;
      const gaps = months.filter((m) => !coveredMonths.has(m)).length;
      return gaps / 12;
    }
    case "defensive": {
      const consistency = (item.paymentMonths?.length ?? 0) / 12;
      const marginBonus = item.safetyMargin >= 0 ? 0.25 : 0;
      return Math.max(consistency + marginBonus, 0.05);
    }
  }
}

export function normalize(values: number[]): number[] {
  const max = Math.max(...values, 0);
  if (max <= 0) return values.map(() => 0);
  return values.map((v) => v / max);
}

export interface Recommendation {
  item: WatchlistItem;
  shares: number;
  cost: number;
  addedIncome: number;
  currentIncome: number;
  newIncome: number;
}

export interface SmartAllocationResult {
  currency: Currency;
  capital: number;
  recs: Recommendation[];
  remaining: number;
  totalAddedIncome: number;
  currentPortfolioIncome: number;
  newPortfolioIncome: number;
  empty: boolean;
}

export function computeSmartAllocation(
  capital: number,
  currency: Currency,
  items: WatchlistItem[],
  activeStrategies: StrategyKey[],
  excludedTickers: string[],
  targets: Record<AssetType, number>,
  exchangeRate: number,
  maxConcentration: number | null = null,
): SmartAllocationResult | null {
  if (!Number.isFinite(capital) || capital <= 0) return null;

  const sameCurrency = items.filter((i) => i.currency === currency);
  const currentPortfolioIncome = sameCurrency.reduce(
    (sum, it) =>
      sum + netAfterTax(it.annualDividend * it.quantity, it.type, it.currency, it.customTaxRate),
    0,
  );

  const coveredMonths = new Set<number>();
  for (const it of sameCurrency) {
    if (it.quantity > 0) for (const m of it.paymentMonths ?? []) coveredMonths.add(m);
  }

  const candidates = sameCurrency.filter(
    (i) =>
      !excludedTickers.includes(i.ticker) &&
      i.currentPrice > 0 &&
      i.annualDividend > 0 &&
      i.quantity > 0,
  );

  if (candidates.length === 0) {
    return {
      currency,
      capital,
      recs: [],
      remaining: capital,
      totalAddedIncome: 0,
      currentPortfolioIncome,
      newPortfolioIncome: currentPortfolioIncome,
      empty: true,
    };
  }

  const perStrategyScores = activeStrategies.map((s) =>
    normalize(candidates.map((c) => scoreFor(c, s, coveredMonths))),
  );
  const weight = 1 / activeStrategies.length;
  const combined = candidates.map((_, idx) =>
    perStrategyScores.reduce((sum, arr) => sum + arr[idx] * weight, 0),
  );

  let totalPortfolioBRL = 0;
  let totalPortfolioTargetCurrency = 0;
  const currentAllocationBRL: Record<string, number> = {};
  const currentAssetValueTargetCurrency: Record<string, number> = {};
  for (const it of items) {
    const val = it.currentPrice * it.quantity;
    if (val <= 0) continue;
    const inBrl = convertCurrency(val, it.currency, "BRL", exchangeRate);
    totalPortfolioBRL += inBrl;
    currentAllocationBRL[it.type] = (currentAllocationBRL[it.type] || 0) + inBrl;

    const inTargetCurrency = convertCurrency(val, it.currency, currency, exchangeRate);
    totalPortfolioTargetCurrency += inTargetCurrency;
    currentAssetValueTargetCurrency[it.ticker] = (currentAssetValueTargetCurrency[it.ticker] || 0) + inTargetCurrency;
  }

  const targetTotal = Object.values(targets).reduce((a, b) => a + (b || 0), 0);

  // Calculate sector exposure in BRL
  const sectorAllocationBRL: Record<string, number> = {};
  for (const it of items) {
    if (!it.sector) continue;
    const val = it.currentPrice * it.quantity;
    if (val <= 0) continue;
    const inBrl = convertCurrency(val, it.currency, "BRL", exchangeRate);
    sectorAllocationBRL[it.sector] = (sectorAllocationBRL[it.sector] || 0) + inBrl;
  }

  const ranked = candidates
    .map((item, idx) => {
      let score = combined[idx];

      // Target Allocation Boost/Penalty
      if (targetTotal > 0) {
        const targetPct = targets[item.type] || 0;
        if (targetPct > 0) {
          const currentPct =
            totalPortfolioBRL > 0
              ? ((currentAllocationBRL[item.type] || 0) / totalPortfolioBRL) * 100
              : 0;
          if (currentPct < targetPct) {
            const distance = (targetPct - currentPct) / targetPct;
            const organicBoost = distance * 0.2;
            score *= 1 + organicBoost;
          } else {
            score *= 0.9;
          }
        } else {
          score *= 0.5;
        }
      }

      // Sector Concentration Penalty (Max 25%)
      // Only apply if portfolio has some critical mass (e.g., > 1000 BRL) to avoid penalizing new portfolios
      if (item.sector && totalPortfolioBRL > 1000) {
        const currentSectorPct = (sectorAllocationBRL[item.sector] || 0) / totalPortfolioBRL;
        if (currentSectorPct > 0.25) {
          score *= 0.5; // 50% penalty for over-concentrated sector
        }
      }

      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (ranked.length === 0) {
    return {
      currency,
      capital,
      recs: [],
      remaining: capital,
      totalAddedIncome: 0,
      currentPortfolioIncome,
      newPortfolioIncome: currentPortfolioIncome,
      empty: true,
    };
  }

  const scoreSum = ranked.reduce((s, r) => s + r.score, 0);
  let spent = 0;
  let remaining = capital;
  let totalAddedIncome = 0;

  const recMap = new Map<string, Recommendation>();
  const purchasedShares = new Map<string, number>();

  const getMaxSharesAllowed = (ticker: string, currentPrice: number, alreadyBought: number) => {
    if (!maxConcentration || maxConcentration >= 100) return Infinity;
    if (!(currentPrice > 0)) return 0;
    const maxVal = ((totalPortfolioTargetCurrency + capital) * maxConcentration) / 100;
    const currentVal = (currentAssetValueTargetCurrency[ticker] || 0) + (alreadyBought * currentPrice);
    const allowedToBuy = Math.max(0, maxVal - currentVal);
    return Math.floor(allowedToBuy / currentPrice);
  };

  for (const { item, score } of ranked) {
    const budget = capital * (score / scoreSum);
    let shares = Math.floor(budget / item.currentPrice);
    
    // Apply max concentration cap
    const maxAllowed = getMaxSharesAllowed(item.ticker, item.currentPrice, 0);
    shares = Math.min(shares, maxAllowed);
    
    const cost = shares * item.currentPrice;

    if (shares > 0) {
      const grossCurrent = item.quantity * item.annualDividend;
      const currentIncome = netAfterTax(grossCurrent, item.type, item.currency, item.customTaxRate);
      recMap.set(item.ticker, {
        item,
        shares,
        cost,
        addedIncome: 0,
        currentIncome,
        newIncome: currentIncome,
      });
      purchasedShares.set(item.ticker, shares);
      spent += cost;
      remaining -= cost;
    }
  }

  let madeChanges = true;
  while (madeChanges && remaining > 0) {
    madeChanges = false;
    for (const { item } of ranked) {
      if (remaining >= item.currentPrice) {
        let sharesToBuy = Math.floor(remaining / item.currentPrice);
        const alreadyBought = purchasedShares.get(item.ticker) || 0;
        const maxAllowed = getMaxSharesAllowed(item.ticker, item.currentPrice, alreadyBought);
        sharesToBuy = Math.min(sharesToBuy, maxAllowed);

        if (sharesToBuy > 0) {
          const cost = sharesToBuy * item.currentPrice;
          spent += cost;
          remaining -= cost;
          madeChanges = true;
          purchasedShares.set(item.ticker, alreadyBought + sharesToBuy);

          let rec = recMap.get(item.ticker);
          if (!rec) {
            const currentIncome = netAfterTax(
              item.quantity * item.annualDividend,
              item.type,
              item.currency,
              item.customTaxRate,
            );
            rec = {
              item,
              shares: 0,
              cost: 0,
              addedIncome: 0,
              currentIncome,
              newIncome: currentIncome,
            };
            recMap.set(item.ticker, rec);
          }
          rec.shares += sharesToBuy;
          rec.cost += cost;
        }
      }
    }
  }

  const recs: Recommendation[] = Array.from(recMap.values()).map((rec) => {
    const grossAdded = rec.shares * rec.item.annualDividend;
    const addedIncome = netAfterTax(
      grossAdded,
      rec.item.type,
      rec.item.currency,
      rec.item.customTaxRate,
    );
    rec.addedIncome = addedIncome;
    rec.newIncome = rec.currentIncome + addedIncome;
    totalAddedIncome += addedIncome;
    return rec;
  });

  return {
    currency,
    capital,
    recs,
    remaining: capital - spent,
    totalAddedIncome,
    currentPortfolioIncome,
    newPortfolioIncome: currentPortfolioIncome + totalAddedIncome,
    empty: false,
  };
}
