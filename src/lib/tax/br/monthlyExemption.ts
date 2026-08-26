import { getLocalDateISOString } from "@/lib/formatters";
import type { AssetType } from "@/lib/domain";
import type { RealizedGainEvent, MonthlyCapitalGainsResult } from "../types";
import { getEventAssetType } from "../utils";

/**
 * Brazilian Stock Capital Gains Rate for ordinary swing trade transactions (15%).
 */
export const BR_STOCK_CAPITAL_GAINS_RATE = 0.15;

/**
 * Brazilian Stock Monthly Sales Exemption Threshold (R$ 20,000.00).
 * Applied to the sum of PROCEEDS (alienação bruta de vendas), NOT the profit.
 */
export const BR_MONTHLY_SALES_EXEMPTION_THRESHOLD = 20000.0;

// REGRA DE ETF PENDENTE DE REVISAO JURIDICA HUMANA — tratamento adotado (excluído da isenção de ações, tributado à parte) é a interpretação mais conservadora, mas a legislação tem ambiguidade prática reconhecida sobre ETF de ações vs. fundos.

/**
 * Pure function to calculate monthly capital gains tax on Brazilian stock sales (Item 2.1c).
 *
 * Implements Brazilian tax law rules:
 * - Exemption threshold of R$ 20,000.00 in monthly sales (proceeds). If total sales <= 20k,
 *   the entire month is exempt (taxDue = 0), and neither profit nor loss affects loss carryforward.
 * - If total sales > 20k:
 *   - Net losses are accumulated into `lossCarryforward` for future months.
 *   - Net gains are first offset against available `lossCarryforward`, and the remaining taxable
 *     gain is taxed at 15%.
 * - Tickers with missing/unresolvable `assetType` are NEVER assumed to be `STOCK_BR` by default;
 *   they are excluded from the stock exemption/calculation and explicitly reported in `unclassifiedTickers`.
 *
 * @param events List of realized gain events from sell transactions.
 * @param priorLossCarryforward Initial accumulated loss carryforward from prior tax periods.
 * @param assetTypeByTicker Optional map/dictionary of asset types to accurately filter only Brazilian stocks.
 */
export function calculateMonthlyCapitalGainsTax(
  events: RealizedGainEvent[],
  priorLossCarryforward: number = 0,
  assetTypeByTicker?: Record<string, AssetType | undefined> | Map<string, AssetType>,
): MonthlyCapitalGainsResult[] {
  if (!events || events.length === 0) {
    return [];
  }

  // 1. Group events and unclassified tickers by calendar month ("YYYY-MM") using local date components
  const stockEventsByMonth = new Map<string, RealizedGainEvent[]>();
  const unclassifiedByMonth = new Map<string, Set<string>>();

  for (const ev of events) {
    const monthKey = getLocalDateISOString(ev.saleDate).slice(0, 7);
    if (!monthKey || monthKey.length < 7) continue;

    const resolvedType = getEventAssetType(ev, assetTypeByTicker);

    if (!resolvedType) {
      // Missing/unresolvable assetType: exclude from stock calculation and record for explicit reporting
      const unclassifiedSet = unclassifiedByMonth.get(monthKey) || new Set<string>();
      unclassifiedSet.add(ev.ticker);
      unclassifiedByMonth.set(monthKey, unclassifiedSet);
      continue;
    }

    if (resolvedType === "STOCK_BR") {
      const list = stockEventsByMonth.get(monthKey) || [];
      list.push(ev);
      stockEventsByMonth.set(monthKey, list);
    }
    // Note: Other classified types (FII, FIAGRO, FII_INFRA, ETF, STOCK_US, REIT) are excluded
    // as they belong to dedicated tax modules and rules.
  }

  // Collect all months that have either stock events or unclassified events
  const allMonths = new Set<string>([
    ...Array.from(stockEventsByMonth.keys()),
    ...Array.from(unclassifiedByMonth.keys()),
  ]);

  if (allMonths.size === 0) {
    return [];
  }

  // 2. Sort months chronologically
  const sortedMonths = Array.from(allMonths).sort();

  const results: MonthlyCapitalGainsResult[] = [];
  let currentCarryforward = Math.max(0, priorLossCarryforward);

  for (const month of sortedMonths) {
    const monthEvents = stockEventsByMonth.get(month) || [];
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

    if (totalSales <= BR_MONTHLY_SALES_EXEMPTION_THRESHOLD) {
      // MONTH IS EXEMPT
      // Losses in exempt months DO NOT generate tax credit / carryforward.
      // Profits in exempt months DO NOT consume prior loss carryforward.
      results.push({
        month,
        totalSales,
        totalGain,
        isExempt: true,
        lossCarryforwardUsed: 0,
        lossCarryforwardRemaining: currentCarryforward,
        taxableGain: 0,
        taxDue: 0,
        ...(unclassifiedTickers ? { unclassifiedTickers } : {}),
      });
    } else {
      // MONTH IS NOT EXEMPT (Total Sales > R$ 20,000.00)
      if (totalGain <= 0) {
        // Net loss in a non-exempt month -> accumulates for future periods
        const monthlyLoss = Math.abs(totalGain);
        const newCarryforward = Math.round((currentCarryforward + monthlyLoss) * 100) / 100;

        results.push({
          month,
          totalSales,
          totalGain,
          isExempt: false,
          lossCarryforwardUsed: 0,
          lossCarryforwardRemaining: newCarryforward,
          taxableGain: 0,
          taxDue: 0,
          ...(unclassifiedTickers ? { unclassifiedTickers } : {}),
        });

        currentCarryforward = newCarryforward;
      } else {
        // Net gain in a non-exempt month -> offset carryforward first
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
          isExempt: false,
          lossCarryforwardUsed,
          lossCarryforwardRemaining: currentCarryforward,
          taxableGain,
          taxDue,
          ...(unclassifiedTickers ? { unclassifiedTickers } : {}),
        });
      }
    }
  }

  return results;
}
