import { getLocalDateISOString } from "@/lib/formatters";
import type { AssetType } from "@/lib/domain";
import type { RealizedGainEvent, MonthlyFiInfraCapitalGainsResult } from "../types";
import { getEventAssetType } from "../utils";

// =========================================================================================
// REGRA FISCAL DE FII_INFRA (Fundamentação Legal):
// 1. FI-Infra (Lei 12.431/2011, art. 3º): Alíquota de 0% (zero por cento) de imposto de renda
//    sobre rendimentos e ganho de capital auferido na alienação de cotas de fundos incentivados
//    de investimento em infraestrutura por pessoas físicas.
// 2. Não há apuração de DARF nem geração de prejuízo compensável (alíquota zero definitiva).
// =========================================================================================

/**
 * Pure function to calculate monthly capital gains tax on Infrastructure Investment Fund (FI-Infra) sales (Prompt 143 / Item 2.1e).
 *
 * Implements Brazilian tax law rules for FI-Infra (Lei 12.431/2011 art. 3º):
 * - 0% tax rate on net capital gains (proceeds - costBasis) for individuals.
 * - taxDue is SEMPRE 0, regardless of the gain amount.
 * - Losses in exempt assets CANNOT be carried forward to offset taxable assets, nor do they
 *   offset future FI-Infra gains (which are already 0% tax).
 * - lossCarryforwardUsed and lossCarryforwardRemaining are always 0.
 * - Unclassified tickers (missing/unresolvable assetType) are NEVER assumed to be FI-Infra;
 *   they are excluded from the calculation and reported in `unclassifiedTickers`.
 *
 * @param events List of realized gain events from sell transactions.
 * @param _priorLossCarryforward Unused for FI-Infra (always 0), kept for signature consistency.
 * @param assetTypeByTicker Optional map/dictionary of asset types to filter only FI-Infra.
 */
export function calculateFiInfraCapitalGainsTax(
  events: RealizedGainEvent[],
  _priorLossCarryforward: number = 0,
  assetTypeByTicker?: Record<string, AssetType | undefined> | Map<string, AssetType>,
): MonthlyFiInfraCapitalGainsResult[] {
  if (!events || events.length === 0) {
    return [];
  }

  // 1. Group events and unclassified tickers by calendar month ("YYYY-MM") using local date components
  const fiInfraEventsByMonth = new Map<string, RealizedGainEvent[]>();
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

    if (resolvedType === "FII_INFRA") {
      const list = fiInfraEventsByMonth.get(monthKey) || [];
      list.push(ev);
      fiInfraEventsByMonth.set(monthKey, list);
    }
    // Note: STOCK_BR, STOCK_US, REIT, ETF, FII, FIAGRO are excluded from this module.
  }

  // Collect all months that have either FI-Infra events or unclassified events
  const allMonths = new Set<string>([
    ...Array.from(fiInfraEventsByMonth.keys()),
    ...Array.from(unclassifiedByMonth.keys()),
  ]);

  if (allMonths.size === 0) {
    return [];
  }

  // 2. Sort months chronologically
  const sortedMonths = Array.from(allMonths).sort();
  const results: MonthlyFiInfraCapitalGainsResult[] = [];

  for (const month of sortedMonths) {
    const monthEvents = fiInfraEventsByMonth.get(month) || [];
    const unclassifiedSet = unclassifiedByMonth.get(month);
    const unclassifiedTickers =
      unclassifiedSet && unclassifiedSet.size > 0
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

    // FI-Infra is 100% tax exempt (0% rate): taxDue is always 0, no carryforward generated or used
    results.push({
      month,
      totalSales,
      totalGain,
      lossCarryforwardUsed: 0,
      lossCarryforwardRemaining: 0,
      taxableGain: 0,
      taxDue: 0,
      ...(unclassifiedTickers ? { unclassifiedTickers } : {}),
    });
  }

  return results;
}
