import { type Transaction, getQuantityAtDate } from "./transactionsLogic";
import { type DividendEvent, type AssetType, type Currency } from "./domain";
import { isUsAsset, dividendTaxRate, netAfterTax } from "./calculations";
import { convertCurrency } from "./currency";
import { toIntlLocale, getLocalDateISOString } from "./formatters";
import { type Locale } from "./i18n";

export type TaxType = "dividend" | "jcp" | "rendimento_fii" | "us_dividend";

export interface RealizedIncomeEvent {
  ticker: string;
  /** Native currency of the event (source of `amountNet`), used for FX conversion. */
  currency: Currency;
  exDate: string; // ISO format "YYYY-MM-DD"
  paymentDate: string | null; // ISO format "YYYY-MM-DD" or null
  paymentDateEstimated?: boolean;
  isPaid: boolean;
  quantityHeld: number;
  amountPerShareGross: number;
  amountGross: number;
  amountNet: number;
  taxType: TaxType;
}

export interface AssetTaxMeta {
  ticker: string;
  type: AssetType;
  currency?: Currency;
  customTaxRate?: number | null;
}

/**
 * Utility helper to determine the tax classification category.
 */
export function getTaxType(type: AssetType, currency?: Currency, isJCP?: boolean): TaxType {
  if (isJCP) {
    return "jcp";
  }
  if (isUsAsset(type, currency)) {
    return "us_dividend";
  }
  if (type === "FII" || type === "FII_INFRA" || type === "FIAGRO") {
    return "rendimento_fii";
  }
  return "dividend";
}

/**
 * Normalizes any date input (timestamp in ms or ISO string) to a comparable "YYYY-MM-DD" string.
 */
export function normalizeDateStr(dateInput: number | string): string {
  if (typeof dateInput === "number") {
    return getLocalDateISOString(dateInput);
  }
  if (typeof dateInput === "string") {
    if (dateInput.includes("T")) {
      return dateInput.split("T")[0];
    }
    return dateInput.slice(0, 10);
  }
  return "";
}

/**
 * Single Source of Truth (SSOT) function to calculate realized income.
 * Crosses user transactions with dividend events per asset.
 *
 * For each dividend event of a ticker:
 * 1. Replays transactions for that ticker in chronological order up to exDate.
 * 2. If quantityHeld > 0 on exDate, user is entitled to the dividend.
 * 3. Calculates isPaid based on whether paymentDate is confirmed (not estimated) and <= today.
 * 4. Applies tax logic via SSOT netAfterTax.
 */
export function calculateRealizedIncome(
  transactions: Transaction[],
  dividendEventsByTicker: Record<string, DividendEvent[] | undefined> | Map<string, DividendEvent[]>,
  assetMetaByTicker?: Record<string, AssetTaxMeta | undefined> | Map<string, AssetTaxMeta>,
): RealizedIncomeEvent[] {
  const result: RealizedIncomeEvent[] = [];
  const todayISO = getLocalDateISOString();

  // Group transactions by ticker
  const txByTicker: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const t = tx.ticker.toUpperCase();
    if (!txByTicker[t]) txByTicker[t] = [];
    txByTicker[t].push(tx);
  }

  // Helper to retrieve dividend events for a ticker
  const getEvents = (ticker: string): DividendEvent[] => {
    if (dividendEventsByTicker instanceof Map) {
      return dividendEventsByTicker.get(ticker) || [];
    }
    return dividendEventsByTicker[ticker] || [];
  };

  // Helper to retrieve asset meta
  const getMeta = (ticker: string): AssetTaxMeta => {
    if (assetMetaByTicker instanceof Map) {
      return (
        assetMetaByTicker.get(ticker) || {
          ticker,
          type: ticker.endsWith(".SA") || /^[A-Z]{4}\d{1,2}$/.test(ticker) ? "STOCK_BR" : "STOCK_US",
        }
      );
    }
    if (assetMetaByTicker && assetMetaByTicker[ticker]) {
      return assetMetaByTicker[ticker]!;
    }
    const isBr = ticker.endsWith(".SA") || /^[A-Z]{4}\d{1,2}$/.test(ticker);
    return {
      ticker,
      type: isBr ? "STOCK_BR" : "STOCK_US",
      currency: isBr ? "BRL" : "USD",
    };
  };

  // Process all tickers that have dividend events
  const tickers =
    dividendEventsByTicker instanceof Map
      ? Array.from(dividendEventsByTicker.keys())
      : Object.keys(dividendEventsByTicker);

  for (const tickerRaw of tickers) {
    const ticker = tickerRaw.toUpperCase();
    const events = getEvents(tickerRaw);
    if (!events || events.length === 0) continue;

    const txs = (txByTicker[ticker] || []).sort((a, b) => a.date - b.date);
    const meta = getMeta(tickerRaw);
    // Derive the event's native currency even when meta lacks `currency` (e.g. Map fallback).
    const eventCurrency: Currency =
      meta.currency ?? (isUsAsset(meta.type, meta.currency) ? "USD" : "BRL");

    for (const event of events) {
      const eventExDateStr = normalizeDateStr(event.exDate);
      if (!eventExDateStr) continue;

      // Calculate quantity held on ex-date by replaying transactions up to exDate
      let quantityHeld = 0;
      for (const tx of txs) {
        const txDateStr = normalizeDateStr(tx.date);
        if (txDateStr <= eventExDateStr) {
          if (tx.type === "buy") {
            quantityHeld += tx.quantity;
          } else if (tx.type === "sell") {
            quantityHeld -= tx.quantity;
          } else if (tx.type === "corporate_action") {
            const factor = tx.factor ?? 1;
            if (Number.isFinite(factor) && factor > 0) quantityHeld *= factor;
          }
        }
      }

      quantityHeld = Math.max(0, Math.round(quantityHeld * 1000000) / 1000000);

      if (quantityHeld > 0 && event.amountPerShare > 0) {
        const amountGross = Math.round(quantityHeld * event.amountPerShare * 10000) / 10000;
        const rawNet = netAfterTax(
          amountGross,
          meta.type,
          meta.currency,
          meta.customTaxRate,
          event.isJCP,
        );
        const amountNet = Math.round(rawNet * 10000) / 10000;
        const taxType = getTaxType(meta.type, meta.currency, event.isJCP);
        const payDateStr = event.paymentDate ? normalizeDateStr(event.paymentDate) : null;
        const isEstimated = event.paymentDateEstimated ?? false;
        // Settlement decision: strict isPaid requires confirmed paymentDate <= todayISO (no fallback to exDate)
        const isPaid = payDateStr !== null && !isEstimated && payDateStr <= todayISO;

        result.push({
          ticker,
          currency: eventCurrency,
          exDate: eventExDateStr,
          paymentDate: payDateStr,
          paymentDateEstimated: isEstimated,
          isPaid,
          quantityHeld,
          amountPerShareGross: event.amountPerShare,
          amountGross,
          amountNet,
          taxType,
        });
      }
    }
  }

  // Sort by paymentDate (or exDate if paymentDate is null), chronologically
  return result.sort((a, b) => {
    const dateA = a.paymentDate || a.exDate;
    const dateB = b.paymentDate || b.exDate;
    return dateA.localeCompare(dateB);
  });
}

export interface RealizedIncomeSummary {
  currentMonth: number;
  currentYear: number;
  allTimeTotal: number;
  eventsCount: number;
  dividendTotal: number;
  jcpTotal: number;
  announcedTotal: number;
  announcedCount: number;
}

export { convertCurrency };

export function computeRealizedIncomeSummary(
  events: RealizedIncomeEvent[],
  currency: Currency = "BRL",
  fxRate?: number,
): RealizedIncomeSummary {
  const now = new Date();
  const currentYearStr = String(now.getUTCFullYear());
  const currentMonthStr = `${currentYearStr}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  let currentMonth = 0;
  let currentYear = 0;
  let allTimeTotal = 0;
  let dividendTotal = 0;
  let jcpTotal = 0;
  let announcedTotal = 0;
  let announcedCount = 0;

  for (const ev of events) {
    const payDate = ev.paymentDate || ev.exDate;
    const amountNet = convertCurrency(ev.amountNet, ev.currency, currency, fxRate);

    if (ev.isPaid) {
      allTimeTotal += amountNet;

      if (ev.taxType === "jcp") {
        jcpTotal += amountNet;
      } else {
        dividendTotal += amountNet;
      }

      if (payDate.startsWith(currentYearStr)) {
        currentYear += amountNet;
      }
      if (payDate.startsWith(currentMonthStr)) {
        currentMonth += amountNet;
      }
    } else {
      announcedTotal += amountNet;
      announcedCount += 1;
    }
  }

  return {
    currentMonth: Math.round(currentMonth * 100) / 100,
    currentYear: Math.round(currentYear * 100) / 100,
    allTimeTotal: Math.round(allTimeTotal * 100) / 100,
    eventsCount: events.filter((e) => e.isPaid).length,
    dividendTotal: Math.round(dividendTotal * 100) / 100,
    jcpTotal: Math.round(jcpTotal * 100) / 100,
    announcedTotal: Math.round(announcedTotal * 100) / 100,
    announcedCount,
  };
}

export interface MonthlyDividendBucket {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // Formatted label (e.g. "nov/25")
  amountNet: number;
  paidAmount: number;
  announcedAmount: number;
  isFuture?: boolean;
}

/**
 * Groups realized income events by month (YYYY-MM), summing amountNet.
 * Uses event.isPaid to accurately populate paidAmount and announcedAmount.
 * Supports multi-currency conversion when `currency` is passed (defaulting to native currency if omitted).
 * Returns at most the 12 most recent months with dividends (no artificial zero-filling).
 */
export function groupRealizedIncomeByMonth(
  events: RealizedIncomeEvent[],
  referenceDateStr?: string,
  locale: Locale = "ptBR",
  currency?: Currency,
  fxRate?: number,
): MonthlyDividendBucket[] {
  const monthMap: Record<string, { total: number; paid: number; announced: number }> = {};

  for (const ev of events) {
    const eventDate = ev.paymentDate || ev.exDate;
    if (!eventDate) continue;
    if (referenceDateStr && eventDate > referenceDateStr) continue;

    const monthKey = eventDate.slice(0, 7); // "YYYY-MM"
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { total: 0, paid: 0, announced: 0 };
    }
    const amount = currency
      ? convertCurrency(ev.amountNet, ev.currency, currency, fxRate)
      : ev.amountNet;

    monthMap[monthKey].total += amount;
    if (ev.isPaid) {
      monthMap[monthKey].paid += amount;
    } else {
      monthMap[monthKey].announced += amount;
    }
  }

  const sortedMonthKeys = Object.keys(monthMap).sort();
  // Take at most the 12 most recent months with dividends
  const recentMonthKeys =
    sortedMonthKeys.length > 12 ? sortedMonthKeys.slice(-12) : sortedMonthKeys;

  const dateLocale = toIntlLocale(locale);

  return recentMonthKeys.map((monthKey) => {
    const [yearStr, monthStr] = monthKey.split("-");
    const d = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 15);
    const rawMonthName = new Intl.DateTimeFormat(dateLocale, { month: "short" }).format(d);
    const monthName = rawMonthName.replace(".", "").toLowerCase();
    const yearShort = yearStr.slice(-2);
    const monthLabel = `${monthName}/${yearShort}`;
    const data = monthMap[monthKey];
    const paidAmount = Math.round(data.paid * 100) / 100;
    const announcedAmount = Math.round(data.announced * 100) / 100;
    const totalNet = Math.round(data.total * 100) / 100;

    return {
      monthKey,
      monthLabel,
      amountNet: totalNet,
      paidAmount,
      announcedAmount,
      isFuture: paidAmount === 0 && announcedAmount > 0,
    };
  });
}


