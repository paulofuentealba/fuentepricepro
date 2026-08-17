// Shared domain types for the asset service.
// (Previously held mock data; now the real API service in apiService.server.ts provides data.)

export type AssetType =
  "STOCK_US" | "STOCK_BR" | "REIT" | "FII" | "FII_INFRA" | "FIAGRO" | "ETF" | "FIXED_INCOME";

export type Currency = "USD" | "BRL";

export interface AssetMetrics {
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  bvps?: number | null;
  roe: number | null;
  currentDy: number | null;
  capRate: number | null;
  vacancy: number | null;
  expenseRatio: number | null;
  aum: number | null;
  trackingError: number | null;
  payoutRatio: number | null;
  dividendCagr5y: number | null;
}

export interface DividendYearPoint {
  year: number;
  amount: number;
}

/** Raw dividend payment event from the provider API. */
export interface DividendEvent {
  /** Ex-dividend (data-com) date in ISO string format.
   *  For Brapi: lastDatePrior. For Yahoo: event date converted to ISO. */
  exDate: string;
  /** Payment date in ISO string. Null for Yahoo (API doesn't separate ex/pay dates). */
  paymentDate: string | null;
  /** True if paymentDate is estimated via fund distribution rules. Defaults to false. */
  paymentDateEstimated?: boolean;
  /** Source of the confirmed or estimated payment date. */
  paymentDateSource?: "hgBrasil" | "provider" | "estimated" | null;
  /** Dividend amount per share / quota. */
  amountPerShare: number;
  /** True if dividend is JCP (Juros sobre Capital Próprio - subject to 15% WHT). */
  isJCP?: boolean;
}

export interface Asset {
  ticker: string;
  name: string;
  type: AssetType;
  currency: Currency;
  currentPrice: number;
  dividends3y: number[];
  /** Annual dividend totals, oldest first (up to 5 years). */
  dividendHistory: DividendYearPoint[];
  /** ISO date string of the next ex-dividend date, if known & future. */
  exDividendDate: string | null;
  epsCurrent: number | null;
  epsNext: number | null;
  /** Months (1-12) the asset historically paid dividends in the last ~24-48 months. */
  paymentMonths: number[];
  metrics: AssetMetrics;
  sector: string | null;
  /** Raw dividend events (up to 5 years), exposed in parallel to dividendHistory.
   *  Used by Cash Flow for real paid amounts. Does NOT affect valuation engine. */
  dividendEvents: DividendEvent[];
}
