import type { AssetType, Currency } from "@/lib/domain";

export type Jurisdiction = "BR" | "US";

export type TaxCategory = "dividend" | "interest_on_capital" | "capital_gains";

export interface TaxSimulationError {
  ticker: string;
  code: "INVALID_AMOUNT" | "INCOMPATIBLE_JURISDICTION" | "MISSING_DATA";
  message: string;
}

/**
 * Input position provided to tax simulation adapters.
 */
export interface TaxSimulationPositionInput {
  ticker: string;
  type: AssetType;
  grossAmount: number;
  jurisdiction?: Jurisdiction;
  currency?: Currency;
  customTaxRate?: number | null;
  isJCP?: boolean;
}

/**
 * Output position enriched with tax calculation results from the SSOT.
 */
export interface TaxSimulationPosition {
  ticker: string;
  type: AssetType;
  jurisdiction: Jurisdiction;
  currency: Currency;
  grossAmount: number;
  netAmount: number;
  withheldTax: number;
  taxRate: number;
  customTaxRate?: number | null;
  isJCP?: boolean;
}

/**
 * Context input for tax simulation calculations across a portfolio.
 */
export interface TaxContext {
  jurisdiction: Jurisdiction;
  currency: Currency;
  positions: TaxSimulationPositionInput[];
  period?: {
    year: number;
    month?: number;
  };
}

/**
 * Standardized result returned by all tax simulation adapters.
 */
export interface TaxSimulationResult {
  jurisdiction: Jurisdiction;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  effectiveTaxRate: number;
  positions: TaxSimulationPosition[];
  errors?: TaxSimulationError[];
  calculatedAt: string;
}

/**
 * Represents a single realized gain/loss event from a sell transaction.
 * Foundation for Brazilian and US capital gains calculation (Item 2.1b).
 */
export interface RealizedGainEvent {
  ticker: string;
  saleDate: number; // Timestamp (Unix epoch in ms), matches Transaction.date
  quantity: number;
  salePrice: number;
  proceeds: number; // (salePrice * quantity) - fees
  costBasis: number; // averagePriceAtSaleTime * quantity
  gain: number; // proceeds - costBasis (negative = loss)
  fees?: number;
  assetType?: AssetType;
}

/**
 * Result of the monthly capital gains tax calculation for Brazilian stocks (Prompt 140 / Item 2.1c).
 */
export interface MonthlyCapitalGainsResult {
  month: string; // "YYYY-MM"
  totalSales: number;
  totalGain: number;
  isExempt: boolean;
  lossCarryforwardUsed: number;
  lossCarryforwardRemaining: number;
  taxableGain: number;
  taxDue: number; // 15% on taxableGain
  unclassifiedTickers?: string[]; // Tickers excluded from this month due to missing/unresolvable assetType
}

/**
 * Result of the monthly capital gains tax calculation for Real Estate Investment Funds (FIIs) (Prompt 141 / Item 2.1d).
 */
export interface MonthlyFiiCapitalGainsResult {
  month: string; // "YYYY-MM"
  totalSales: number;
  totalGain: number;
  lossCarryforwardUsed: number;
  lossCarryforwardRemaining: number;
  taxableGain: number;
  taxDue: number; // 20% on taxableGain
  unclassifiedTickers?: string[]; // Tickers excluded from this month due to missing/unresolvable assetType
}



