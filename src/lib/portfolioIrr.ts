import { type Transaction } from "./transactionsLogic";
import { type RealizedIncomeEvent } from "./realizedIncome";
import { type Currency } from "./domain";
import { isBrTicker } from "./classify";

export interface CashFlow {
  date: number; // Timestamp in milliseconds
  amount: number; // Net cash flow in BRL (negative for outflows/buys, positive for inflows/sells/dividends/terminal value)
}

/**
 * Calculates the Money-Weighted Return / Internal Rate of Return (IRR) annualized.
 * Uses Newton-Raphson algorithm with a robust Bisection fallback.
 *
 * @param cashFlows Array of CashFlow objects.
 * @param guess Initial rate guess (default 0.10 = 10%).
 * @returns Annualized IRR (e.g. 0.1537 for 15.37%) or null if invalid/non-convergent.
 */
export function calculateIrr(cashFlows: CashFlow[], guess = 0.1): number | null {
  if (!cashFlows || cashFlows.length < 2) return null;

  // Filter out zero-amount flows and sort by date ascending
  const validFlows = cashFlows
    .filter((cf) => typeof cf.amount === "number" && !isNaN(cf.amount) && Math.abs(cf.amount) > 0.0001)
    .sort((a, b) => a.date - b.date);

  if (validFlows.length < 2) return null;

  const hasNegative = validFlows.some((cf) => cf.amount < 0);
  const hasPositive = validFlows.some((cf) => cf.amount > 0);
  if (!hasNegative || !hasPositive) return null;

  const t0 = validFlows[0].date;
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;

  const normalizedFlows = validFlows.map((cf) => ({
    t: (cf.date - t0) / msPerYear,
    amount: cf.amount,
  }));

  // Net Present Value function NPV(r) = sum(CF_i * (1 + r)^(-t_i))
  const npv = (r: number): number => {
    let sum = 0;
    for (const cf of normalizedFlows) {
      const discount = Math.pow(1 + r, cf.t);
      if (discount === 0 || isNaN(discount)) return NaN;
      sum += cf.amount / discount;
    }
    return sum;
  };

  // Derivative of NPV with respect to r: dNPV/dr = sum(-t_i * CF_i * (1 + r)^(-t_i - 1))
  const npvDerivative = (r: number): number => {
    let sum = 0;
    for (const cf of normalizedFlows) {
      const discount = Math.pow(1 + r, cf.t + 1);
      if (discount === 0 || isNaN(discount)) return NaN;
      sum += (-cf.t * cf.amount) / discount;
    }
    return sum;
  };

  // 1. Newton-Raphson Method
  let r = guess;
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    if (r <= -0.99) r = -0.95; // Bound rate away from -100%

    const val = npv(r);
    if (isNaN(val)) break;

    if (Math.abs(val) < tolerance) {
      return Math.round(r * 1000000) / 1000000;
    }

    const der = npvDerivative(r);
    if (isNaN(der) || Math.abs(der) < 1e-12) break; // Slope too flat, fall through to bisection

    const rNext = r - val / der;
    if (isNaN(rNext) || !isFinite(rNext)) break;

    if (Math.abs(rNext - r) < tolerance) {
      if (rNext > -0.99 && isFinite(rNext)) {
        return Math.round(rNext * 1000000) / 1000000;
      }
      break;
    }

    r = rNext;
  }

  // 2. Fallback: Bisection Method over interval [-0.95, 10.0] (-95% to +1000% a.a.)
  let low = -0.95;
  let high = 10.0;
  let npvLow = npv(low);
  let npvHigh = npv(high);

  if (isNaN(npvLow) || isNaN(npvHigh)) return null;
  if (npvLow * npvHigh > 0) {
    // Try expanding range slightly or return null if no sign change
    low = -0.99;
    high = 20.0;
    npvLow = npv(low);
    npvHigh = npv(high);
    if (isNaN(npvLow) || isNaN(npvHigh) || npvLow * npvHigh > 0) {
      return null;
    }
  }

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid);

    if (isNaN(npvMid)) return null;
    if (Math.abs(npvMid) < tolerance || (high - low) / 2 < tolerance) {
      return Math.round(mid * 1000000) / 1000000;
    }

    if (npvLow * npvMid < 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }

  const finalMid = (low + high) / 2;
  return Math.round(finalMid * 1000000) / 1000000;
}

import type { WatchlistItem } from "./watchlist";

export function normalizeTicker(ticker: string): string {
  return (ticker || "").trim().toUpperCase();
}

/**
 * Determines whether an asset is USD or BRL with robust ticker normalization.
 * Checks assetCurrencies map against exact ticker, ticker without .SA, and ticker with .SA.
 * Falls back to check if ticker ends with .SA or matches Brazilian ticker format.
 */
export function isUsdAsset(
  ticker: string,
  assetCurrencies: Record<string, Currency> = {},
): boolean {
  const norm = normalizeTicker(ticker);
  const normClean = norm.replace(/\.SA$/, "");

  if (assetCurrencies[norm] !== undefined) {
    return assetCurrencies[norm] === "USD";
  }
  if (assetCurrencies[normClean] !== undefined) {
    return assetCurrencies[normClean] === "USD";
  }
  if (assetCurrencies[`${normClean}.SA`] !== undefined) {
    return assetCurrencies[`${normClean}.SA`] === "USD";
  }

  return !(norm.endsWith(".SA") || isBrTicker(normClean));
}

/**
 * Ensures every watchlist item with a positive position (quantity > 0) has at least one transaction.
 * If no explicit transactions exist for a given ticker, a synthetic buy transaction is created
 * using the item's quantity, averagePrice, and investingSince/addedAt date.
 */
export function getEffectiveTransactions(
  transactions: Transaction[],
  items: WatchlistItem[] = [],
): Transaction[] {
  const effective = [...(transactions || [])];

  const existingTickers = new Set<string>();
  for (const tx of effective) {
    const norm = normalizeTicker(tx.ticker);
    existingTickers.add(norm);
    existingTickers.add(norm.replace(/\.SA$/, ""));
  }

  for (const item of items || []) {
    if (!item || !item.ticker || !(item.quantity > 0)) continue;

    const normItemTicker = normalizeTicker(item.ticker);
    const normClean = normItemTicker.replace(/\.SA$/, "");

    const hasExplicit = existingTickers.has(normItemTicker) || existingTickers.has(normClean);

    if (!hasExplicit) {
      const txDate = item.investingSince || item.addedAt || Date.now();
      const price =
        item.averagePrice && item.averagePrice > 0
          ? item.averagePrice
          : item.currentPrice || 0;

      effective.push({
        id: `synthetic-${normItemTicker}`,
        ticker: item.ticker,
        type: "buy",
        date: txDate,
        quantity: item.quantity,
        pricePerShare: price,
        fees: null,
        notes: "Synthetic baseline transaction",
      });
    }
  }

  return effective;
}

/**
 * Builds standard CashFlow array from transactions, realized income events, and current portfolio value.
 *
 * CRITICAL RULE: Uses paymentDate for dividend inflows, falling back to exDate ONLY when paymentDate is null.
 *
 * @param transactions User buy/sell transactions.
 * @param realizedEvents Calculated realized income events.
 * @param currentPortfolioValue Total current market value of portfolio in BRL.
 * @param asOfDate Current evaluation date (default Date.now()).
 * @param fxRateUsdToBrl Live USDBRL exchange rate (from exchangeRateQueryOptions SSOT).
 * @param assetCurrencies Record of ticker -> Currency mapping ("USD" | "BRL").
 * @param targetCurrency Optional currency filter ("BRL" | "USD" | null). When specified, filters transactions & income events by currency and avoids FX conversion.
 */
export function buildCashFlowsFromPortfolio(
  transactions: Transaction[],
  realizedEvents: RealizedIncomeEvent[],
  currentPortfolioValue: number,
  asOfDate: number = Date.now(),
  fxRateUsdToBrl: number = 1,
  assetCurrencies: Record<string, Currency> = {},
  targetCurrency?: Currency | null,
): CashFlow[] {
  const cashFlows: CashFlow[] = [];

  // 1. Transactions (Buys = negative cash out, Sells = positive cash in)
  for (const tx of transactions) {
    const isUsd = isUsdAsset(tx.ticker, assetCurrencies);
    const txCurrency: Currency = isUsd ? "USD" : "BRL";

    if (targetCurrency && txCurrency !== targetCurrency) {
      continue;
    }

    const rate = targetCurrency ? 1 : isUsd ? fxRateUsdToBrl : 1;
    const sharePrice = tx.pricePerShare || 0;
    const fees = tx.fees || 0;

    if (tx.type === "buy") {
      const totalCost = (tx.quantity * sharePrice + fees) * rate;
      cashFlows.push({ date: tx.date, amount: -totalCost });
    } else if (tx.type === "sell") {
      const netProceeds = (tx.quantity * sharePrice - fees) * rate;
      cashFlows.push({ date: tx.date, amount: +netProceeds });
    }
  }

  // 2. Realized Income Events (Dividends / JCP / Rendimentos = positive cash in)
  // CRITICAL RULE 1: Uses paymentDate first, falling back to exDate ONLY when paymentDate is null!
  for (const ev of realizedEvents) {
    const payDateStr = ev.paymentDate || ev.exDate;
    if (!payDateStr) continue;

    const eventDate = new Date(payDateStr).getTime();
    if (isNaN(eventDate) || eventDate > asOfDate) continue;

    const isUsd = ev.taxType === "us_dividend" || isUsdAsset(ev.ticker, assetCurrencies);
    const evCurrency: Currency = isUsd ? "USD" : "BRL";

    if (targetCurrency && evCurrency !== targetCurrency) {
      continue;
    }

    const rate = targetCurrency ? 1 : isUsd ? fxRateUsdToBrl : 1;
    const amountNet = ev.amountNet * rate;

    if (amountNet > 0) {
      cashFlows.push({ date: eventDate, amount: amountNet });
    }
  }

  // 3. Current Portfolio Terminal Value (Positive cash in at asOfDate)
  if (currentPortfolioValue > 0) {
    cashFlows.push({ date: asOfDate, amount: currentPortfolioValue });
  }

  return cashFlows.sort((a, b) => a.date - b.date);
}
