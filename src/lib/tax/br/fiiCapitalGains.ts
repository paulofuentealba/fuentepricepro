import { getLocalDateISOString } from "@/lib/formatters";
import type { AssetType } from "@/lib/domain";
import type { RealizedGainEvent, MonthlyFiiCapitalGainsResult } from "../types";
import { getEventAssetType } from "../utils";

/**
 * Brazilian Real Estate Investment Fund (FII) Capital Gains Tax Rate (20% flat).
 */
export const BR_FII_CAPITAL_GAINS_RATE = 0.20;

// =========================================================================================
// REGRAS FISCAIS DE FII / FIAGRO / FII_INFRA PENDENTES DE REVISAO JURIDICA HUMANA:
// 1. FIIs PADRÃO: Assume fundos imobiliários com cotas negociadas em bolsa por pessoa física.
//    Não trata exceções legais de fundos fechados ou com concentração (>25% / <50 cotistas).
// 2. FII_INFRA (FI-Infra): Excluído deste módulo. A isenção de ganho de capital para PF
//    (Lei 12.431/2011) requer validação jurídica antes de integração em motor próprio.
// 3. FIAGRO: Excluído deste módulo. A equiparação ao regime de FII (Lei 14.130/2021) requer
//    validação jurídica expressa antes de inclusão em motor de cálculo definitivo.
// =========================================================================================

/**
 * Pure function to calculate monthly capital gains tax on Real Estate Investment Fund (FII) sales (Item 2.1d).
 *
 * Implements Brazilian tax law rules for FIIs:
 * - 20% flat tax on net capital gains (proceeds - costBasis).
 * - NO sales volume exemption (the R$ 20,000 threshold applies solely to stocks, not FIIs).
 * - Losses always accumulate into `lossCarryforwardRemaining` (dedicated FII track).
 * - FII losses can ONLY offset FII gains, NEVER stock gains (and vice-versa).
 * - Unclassified tickers (missing/unresolvable assetType) are NEVER assumed to be FIIs;
 *   they are excluded from the calculation and reported in `unclassifiedTickers`.
 *
 * @param events List of realized gain events from sell transactions.
 * @param priorLossCarryforward Initial accumulated FII loss carryforward from prior periods.
 * @param assetTypeByTicker Optional map/dictionary of asset types to filter only FIIs.
 */
export function calculateFiiCapitalGainsTax(
  events: RealizedGainEvent[],
  priorLossCarryforward: number = 0,
  assetTypeByTicker?: Record<string, AssetType | undefined> | Map<string, AssetType>,
): MonthlyFiiCapitalGainsResult[] {
  if (!events || events.length === 0) {
    return [];
  }

  // 1. Group events and unclassified tickers by calendar month ("YYYY-MM") using local date components
  const fiiEventsByMonth = new Map<string, RealizedGainEvent[]>();
  const unclassifiedByMonth = new Map<string, Set<string>>();

  for (const ev of events) {
    const monthKey = getLocalDateISOString(ev.saleDate).slice(0, 7);
    if (!monthKey || monthKey.length < 7) continue;

    const resolvedType = getEventAssetType(ev, assetTypeByTicker);

    if (!resolvedType) {
      // Missing/unresolvable assetType: exclude and record for explicit reporting
      const unclassifiedSet = unclassifiedByMonth.get(monthKey) || new Set<string>();
      unclassifiedSet.add(ev.ticker);
      unclassifiedByMonth.set(monthKey, unclassifiedSet);
      continue;
    }

    if (resolvedType === "FII") {
      const list = fiiEventsByMonth.get(monthKey) || [];
      list.push(ev);
      fiiEventsByMonth.set(monthKey, list);
    }
    // Note: STOCK_BR, STOCK_US, REIT, ETF, FIAGRO, FII_INFRA are excluded from this module.
  }

  // Collect all months that have either FII events or unclassified events
  const allMonths = new Set<string>([
    ...Array.from(fiiEventsByMonth.keys()),
    ...Array.from(unclassifiedByMonth.keys()),
  ]);

  if (allMonths.size === 0) {
    return [];
  }

  // 2. Sort months chronologically
  const sortedMonths = Array.from(allMonths).sort();

  const results: MonthlyFiiCapitalGainsResult[] = [];
  let currentCarryforward = Math.max(0, priorLossCarryforward);

  for (const month of sortedMonths) {
    const monthEvents = fiiEventsByMonth.get(month) || [];
    const unclassifiedSet = unclassifiedByMonth.get(month);
    const unclassifiedTickers = unclassifiedSet && unclassifiedSet.size > 0
      ? Array.from(unclassifiedSet).sort()
      : undefined;

    let totalSales = 0;
    let totalGain = 0;

    for (const ev of monthEvents) {
      totalSales += ev.proceeds;
      totalGain += ev.gain;
    }

    // Round financial values to 2 decimal places
    totalSales = Math.round(totalSales * 100) / 100;
    totalGain = Math.round(totalGain * 100) / 100;

    if (totalGain <= 0) {
      // Net loss in the month -> accumulates into FII loss carryforward
      const monthlyLoss = Math.abs(totalGain);
      const newCarryforward = Math.round((currentCarryforward + monthlyLoss) * 100) / 100;

      results.push({
        month,
        totalSales,
        totalGain,
        lossCarryforwardUsed: 0,
        lossCarryforwardRemaining: newCarryforward,
        taxableGain: 0,
        taxDue: 0,
        ...(unclassifiedTickers ? { unclassifiedTickers } : {}),
      });

      currentCarryforward = newCarryforward;
    } else {
      // Net gain in the month -> offset FII carryforward first, then apply 20% flat tax
      let lossCarryforwardUsed = 0;
      let taxableGain = totalGain;

      if (currentCarryforward > 0) {
        lossCarryforwardUsed = Math.min(currentCarryforward, totalGain);
        lossCarryforwardUsed = Math.round(lossCarryforwardUsed * 100) / 100;
        taxableGain = Math.round((totalGain - lossCarryforwardUsed) * 100) / 100;
        currentCarryforward = Math.round((currentCarryforward - lossCarryforwardUsed) * 100) / 100;
      }

      const taxDue = Math.round(taxableGain * BR_FII_CAPITAL_GAINS_RATE * 100) / 100;

      results.push({
        month,
        totalSales,
        totalGain,
        lossCarryforwardUsed,
        lossCarryforwardRemaining: currentCarryforward,
        taxableGain,
        taxDue,
        ...(unclassifiedTickers ? { unclassifiedTickers } : {}),
      });
    }
  }

  return results;
}
