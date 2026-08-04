import { type Transaction } from "./transactions";
import { type DividendEvent, type AssetType, type Currency } from "./domain";
import { isUsAsset, dividendTaxRate, netAfterTax } from "./calculations";

export type TaxType = "dividend" | "jcp" | "rendimento_fii" | "us_dividend";

export interface RealizedIncomeEvent {
  ticker: string;
  exDate: string; // ISO format "YYYY-MM-DD"
  paymentDate: string | null; // ISO format "YYYY-MM-DD" or null
  paymentDateEstimated?: boolean;
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
export function getTaxType(type: AssetType, currency?: Currency): TaxType {
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
    return new Date(dateInput).toISOString().split("T")[0];
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
 * 3. Applies tax logic via SSOT netAfterTax.
 */
export function calculateRealizedIncome(
  transactions: Transaction[],
  dividendEventsByTicker: Record<string, DividendEvent[] | undefined> | Map<string, DividendEvent[]>,
  assetMetaByTicker?: Record<string, AssetTaxMeta | undefined> | Map<string, AssetTaxMeta>,
): RealizedIncomeEvent[] {
  const result: RealizedIncomeEvent[] = [];

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
        );
        const amountNet = Math.round(rawNet * 10000) / 10000;
        const taxType = getTaxType(meta.type, meta.currency);

        result.push({
          ticker,
          exDate: eventExDateStr,
          paymentDate: event.paymentDate ? normalizeDateStr(event.paymentDate) : null,
          paymentDateEstimated: event.paymentDateEstimated ?? false,
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
}

export function computeRealizedIncomeSummary(
  events: RealizedIncomeEvent[],
  currency: Currency = "BRL"
): RealizedIncomeSummary {
  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = `${currentYearStr}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let currentMonth = 0;
  let currentYear = 0;
  let allTimeTotal = 0;

  for (const ev of events) {
    const payDate = ev.paymentDate || ev.exDate;
    allTimeTotal += ev.amountNet;

    if (payDate.startsWith(currentYearStr)) {
      currentYear += ev.amountNet;
    }
    if (payDate.startsWith(currentMonthStr)) {
      currentMonth += ev.amountNet;
    }
  }

  return {
    currentMonth: Math.round(currentMonth * 100) / 100,
    currentYear: Math.round(currentYear * 100) / 100,
    allTimeTotal: Math.round(allTimeTotal * 100) / 100,
    eventsCount: events.length,
  };
}
