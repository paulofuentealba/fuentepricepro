import { getLocalDateISOString } from "@/lib/formatters";
import type { AssetType } from "@/lib/domain";
import type { RealizedGainEvent, MonthlyEtfCapitalGainsResult } from "../types";
import { getEventAssetType } from "../utils";
import { BR_STOCK_CAPITAL_GAINS_RATE } from "./monthlyExemption";

// =========================================================================================
// REGRA FISCAL DE ETFS DE RENDA VARIÁVEL (Fundamentação Legal):
// 1. ETFs de Ações (Lei 13.043/2014 / IN RFB 1.585/2015, art. 59): Tributação à alíquota de 15%
//    sobre o ganho de capital líquido auferido em operações comuns na B3.
// 2. Ausência de Isenção de Volume: Não se aplica o limite de isenção de R$ 20.000/mês
//    (exclusivo para o mercado à vista de ações).
// 3. Compensação de Prejuízos: Segregada em trilha própria (não compensa com ações nem FIIs).
// 4. LIMITE DECLARADO: ETFs de Renda Fixa (IN RFB 1.585/2015, art. 31 - tabela regressiva)
//    permanecem fora do escopo deste módulo.
// =========================================================================================

/**
 * Pure function to calculate monthly capital gains tax on Equity Exchange Traded Funds (ETFs) sales (Prompt 143 / Item 2.1e).
 *
 * Implements Brazilian tax law rules for Equity ETFs (Lei 13.043/2014 / IN RFB 1.585/2015 art. 59):
 * - 15% flat tax on net capital gains (proceeds - costBasis), reusing BR_STOCK_CAPITAL_GAINS_RATE.
 * - NO sales volume exemption (the R$ 20,000 threshold applies solely to individual stocks, not ETFs).
 * - Losses always accumulate into `lossCarryforwardRemaining` (dedicated ETF track).
 * - ETF losses can ONLY offset ETF gains, NEVER stock gains or FII/FIAGRO gains (and vice-versa).
 * - Unclassified tickers (missing/unresolvable assetType) are NEVER assumed to be ETFs;
 *   they are excluded from the calculation and reported in `unclassifiedTickers`.
 *
 * @param events List of realized gain events from sell transactions.
 * @param priorLossCarryforward Initial accumulated ETF loss carryforward from prior periods.
 * @param assetTypeByTicker Optional map/dictionary of asset types to filter only ETFs.
 */
export function calculateEtfCapitalGainsTax(
  events: RealizedGainEvent[],
  priorLossCarryforward: number = 0,
  assetTypeByTicker?: Record<string, AssetType | undefined> | Map<string, AssetType>,
): MonthlyEtfCapitalGainsResult[] {
  if (!events || events.length === 0) {
    return [];
  }

  // 1. Group events and unclassified tickers by calendar month ("YYYY-MM") using local date components
  const etfEventsByMonth = new Map<string, RealizedGainEvent[]>();
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

    if (resolvedType === "ETF") {
      const list = etfEventsByMonth.get(monthKey) || [];
      list.push(ev);
      etfEventsByMonth.set(monthKey, list);
    }
    // Note: STOCK_BR, STOCK_US, REIT, FII, FIAGRO, FII_INFRA are excluded from this module.
  }

  // Collect all months that have either ETF events or unclassified events
  const allMonths = new Set<string>([
    ...Array.from(etfEventsByMonth.keys()),
    ...Array.from(unclassifiedByMonth.keys()),
  ]);

  if (allMonths.size === 0) {
    return [];
  }

  // 2. Sort months chronologically
  const sortedMonths = Array.from(allMonths).sort();

  const results: MonthlyEtfCapitalGainsResult[] = [];
  let currentCarryforward = Math.max(0, priorLossCarryforward);

  for (const month of sortedMonths) {
    const monthEvents = etfEventsByMonth.get(month) || [];
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

    if (totalGain <= 0) {
      // Net loss in the month -> accumulates into ETF loss carryforward
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
      // Net gain in the month -> offset ETF carryforward first, then apply 15% flat tax
      let lossCarryforwardUsed = 0;
      let taxableGain = totalGain;

      if (currentCarryforward > 0) {
        lossCarryforwardUsed = Math.min(currentCarryforward, totalGain);
        lossCarryforwardUsed = Math.round(lossCarryforwardUsed * 100) / 100;
        taxableGain = Math.round((totalGain - lossCarryforwardUsed) * 100) / 100;
        currentCarryforward = Math.round((currentCarryforward - lossCarryforwardUsed) * 100) / 100;
      }

      const taxDue = Math.round(taxableGain * BR_STOCK_CAPITAL_GAINS_RATE * 100) / 100;

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
