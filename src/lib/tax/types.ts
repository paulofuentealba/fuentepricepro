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
 * Result of the monthly capital gains tax calculation for Real Estate Investment Funds (FIIs) and FIAGROs (Prompt 141 & 143 / Item 2.1d & 2.1e).
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

/**
 * Result of the monthly capital gains tax calculation for Infrastructure Investment Funds (FI-Infra) (Prompt 143 / Item 2.1e).
 * FI-Infra gains and losses are 100% exempt for individuals (Lei 12.431/2011 art. 3º).
 * taxDue is always 0, and lossCarryforward fields are always 0.
 */
export interface MonthlyFiInfraCapitalGainsResult {
  month: string; // "YYYY-MM"
  totalSales: number;
  totalGain: number;
  lossCarryforwardUsed: number;
  lossCarryforwardRemaining: number;
  taxableGain: number;
  taxDue: number; // Always 0 for individuals (0% tax rate)
  unclassifiedTickers?: string[]; // Tickers excluded from this month due to missing/unresolvable assetType
}

/**
 * Result of the annual capital gains tax calculation for foreign-held stocks and REITs
 * (Lei 14.754/2023, em vigor desde 1º/jan/2024 — "aplicações financeiras no exterior").
 *
 * Differs from the BR stock/FII regime in three ways:
 * - Apuração ANUAL (na Declaração de Ajuste Anual), não mensal.
 * - Alíquota única de 15% sobre o ganho líquido, sem faixas progressivas.
 * - SEM isenção de pequeno valor (a antiga isenção foi extinta para este tipo de ativo).
 * - Prejuízo compensa apenas ganhos do MESMO ano-calendário; não há carryforward entre anos.
 *
 * Amounts are expressed in the transaction's native currency (USD for US-listed assets).
 */
export interface AnnualForeignCapitalGainsResult {
  year: string; // "YYYY"
  totalSales: number;
  totalGain: number; // net gain/loss for the year, before flooring at zero
  taxableGain: number; // max(0, totalGain) — losses never carry to other years
  taxDue: number; // 15% flat on taxableGain
  unclassifiedTickers?: string[]; // Tickers excluded due to missing/unresolvable assetType
}

/**
 * Result of the monthly capital gains tax calculation for Equity Exchange Traded Funds (ETFs) (Prompt 143 / Item 2.1e).
 * Equity ETFs are taxed at 15% flat without sales volume exemption (Lei 13.043/2014 / IN RFB 1.585/2015).
 * Carryforward is tracked in a dedicated track separate from stocks and FIIs.
 */
export interface MonthlyEtfCapitalGainsResult {
  month: string; // "YYYY-MM"
  totalSales: number;
  totalGain: number;
  lossCarryforwardUsed: number;
  lossCarryforwardRemaining: number;
  taxableGain: number;
  taxDue: number; // 15% on taxableGain
  unclassifiedTickers?: string[]; // Tickers excluded from this month due to missing/unresolvable assetType
}

/**
 * A single FIFO lot-sale slice: the portion of one sell transaction matched against one
 * specific buy lot (oldest lot first), carrying its own acquisition date and holding period.
 * Foundation for regressive-table tax calculations that depend on holding period, not just
 * weighted-average cost basis (Item "ETFs de Renda Fixa").
 */
export interface LotSaleSlice {
  ticker: string;
  saleDate: number; // Timestamp (ms), matches Transaction.date
  acquisitionDate: number; // Timestamp (ms) of the specific buy lot consumed
  quantity: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  holdingDays: number; // (saleDate - acquisitionDate) in whole days
}

/**
 * Result of the monthly capital gains tax calculation for Fixed Income ETFs (ETFs de Renda
 * Fixa, e.g. LFTS11, IMAB11, B5P211) — IN RFB 1.585/2015, art. 31 (tabela regressiva).
 *
 * Unlike equity ETFs (flat 15%), each FIFO lot-sale slice is taxed at the rate matching its
 * own holding period (22.5% / 20% / 17.5% / 15%), so `taxDue` is a blended sum across slices
 * rather than `taxableGain * one rate`. `lossCarryforwardUsed/Remaining` track a single
 * currency-amount carryforward (not bracket-specific), applied before each slice's own rate.
 */
export interface MonthlyEtfFixedIncomeCapitalGainsResult {
  month: string; // "YYYY-MM"
  totalSales: number;
  totalGain: number;
  lossCarryforwardUsed: number;
  lossCarryforwardRemaining: number;
  taxableGain: number;
  taxDue: number; // Sum of each lot-sale slice's gain (after carryforward) × its own bracket rate
  unclassifiedTickers?: string[]; // Tickers excluded from this month due to missing/unresolvable assetType
}
