// Shared domain types for the asset service.
// (Previously held mock data; now the real API service in apiService.functions.ts provides data.)

export type AssetType = "STOCK_US" | "STOCK_BR" | "REIT" | "FII" | "FII_INFRA" | "FIAGRO" | "ETF" | "FIXED_INCOME";

export type Currency = "USD" | "BRL";

export interface AssetMetrics {
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
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

export interface Asset {
  ticker: string;
  name: string;
  type: AssetType;
  currency: Currency;
  currentPrice: number;
  dividends3y: [number, number, number];
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
}
