import type { Transaction } from "@/lib/transactionsLogic";
import type { WashSaleRiskAlert } from "./types";
import { computeUs1099B } from "@/lib/tax/us/form1099";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Checks if allocating to `ticker` within 30 days of a recent loss sale triggers
 * a Wash Sale under IRC § 1091.
 *
 * Uses the SSOT FIFO calculation from `computeUs1099B`.
 */
export function checkWashSaleRisk(
  ticker: string,
  transactions: Transaction[] = [],
  asOfTs: number = Date.now(),
): WashSaleRiskAlert | undefined {
  if (!transactions.length || !ticker) return undefined;

  const targetTicker = ticker.toUpperCase();
  const targetYear = new Date(asOfTs).getFullYear();

  // Query sales from current year and previous year (to handle Jan 1-30 boundary)
  const yearsToQuery = [targetYear];
  if (new Date(asOfTs).getMonth() === 0) {
    yearsToQuery.push(targetYear - 1);
  }

  let mostRecentLossSale: {
    saleDate: number;
    gainOrLoss: number;
    proceeds: number;
    quantity: number;
  } | null = null;

  for (const yr of yearsToQuery) {
    const bSummary = computeUs1099B(transactions, yr);
    for (const sale of bSummary.sales) {
      if (sale.ticker.toUpperCase() !== targetTicker) continue;
      // Wash sale applies to taxable accounts
      if (sale.accountType === "roth_ira") continue;

      const diff = asOfTs - sale.saleDate;
      if (diff >= 0 && diff <= THIRTY_DAYS_MS && sale.gainOrLoss < 0) {
        if (!mostRecentLossSale || sale.saleDate > mostRecentLossSale.saleDate) {
          mostRecentLossSale = {
            saleDate: sale.saleDate,
            gainOrLoss: sale.gainOrLoss,
            proceeds: sale.proceeds,
            quantity: sale.quantity,
          };
        }
      }
    }
  }

  if (!mostRecentLossSale) return undefined;

  const daysPassed = Math.max(0, Math.floor((asOfTs - mostRecentLossSale.saleDate) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(1, 30 - daysPassed);
  const salePrice =
    mostRecentLossSale.quantity > 0
      ? Math.round((mostRecentLossSale.proceeds / mostRecentLossSale.quantity) * 100) / 100
      : 0;

  return {
    lossDate: mostRecentLossSale.saleDate,
    daysRemaining,
    disallowedLossEstimate: Math.round(Math.abs(mostRecentLossSale.gainOrLoss) * 100) / 100,
    salePrice,
  };
}
