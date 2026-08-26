import type { AssetType, Currency } from "@/lib/domain";

export type Jurisdiction = "BR" | "US";

export type TaxCategory = "dividend" | "interest_on_capital" | "capital_gains";

/**
 * Clean position-level representation of a tax simulation entry.
 * Consumes already-calculated net/gross amounts from the valuation SSOT without duplicating ValuationResult.
 */
export interface TaxSimulationPosition {
  ticker: string;
  type: AssetType;
  jurisdiction: Jurisdiction;
  grossAmount: number;
  netAmount: number;
  withheldTax: number;
  taxRate: number;
}

/**
 * Context input for tax simulation calculations.
 * Pure interface adhering to Rule 1: zero duplication of calculation logic or parallel state.
 */
export interface TaxContext {
  jurisdiction: Jurisdiction;
  currency: Currency;
  positions: TaxSimulationPosition[];
  period?: {
    year: number;
    month?: number;
  };
}

/**
 * Output model for tax simulation routines across jurisdictions.
 */
export interface TaxSimulationResult {
  jurisdiction: Jurisdiction;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  effectiveTaxRate: number;
  positions: TaxSimulationPosition[];
  calculatedAt: string;
}
