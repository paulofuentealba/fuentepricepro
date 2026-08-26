import { dividendTaxRate, netAfterTax } from "@/lib/calculations";
import type {
  TaxSimulationPositionInput,
  TaxSimulationPosition,
  TaxSimulationResult,
  TaxSimulationError,
} from "../types";

/**
 * Pure adapter for Brazilian common dividends and FII/FIAGRO distributions.
 * Consumes the SSOT (`dividendTaxRate` and `netAfterTax`) from `src/lib/calculations.ts`.
 *
 * Brazilian ordinary dividends and real estate fund earnings are 0% tax under current law.
 */
export function simulateBrDividendTax(
  positions: TaxSimulationPositionInput[],
  asOf?: string,
): TaxSimulationResult {
  const validPositions: TaxSimulationPosition[] = [];
  const errors: TaxSimulationError[] = [];

  let totalGross = 0;
  let totalNet = 0;
  let totalTax = 0;

  for (const pos of positions) {
    // 1. Validation: gross amount
    if (
      typeof pos.grossAmount !== "number" ||
      !Number.isFinite(pos.grossAmount) ||
      pos.grossAmount < 0
    ) {
      errors.push({
        ticker: pos.ticker || "UNKNOWN",
        code: "INVALID_AMOUNT",
        message: "Valor bruto inválido ou negativo",
      });
      continue;
    }

    // 2. Validation: jurisdiction compatibility
    if (
      pos.jurisdiction === "US" ||
      pos.type === "STOCK_US" ||
      pos.type === "REIT"
    ) {
      errors.push({
        ticker: pos.ticker,
        code: "INCOMPATIBLE_JURISDICTION",
        message: "Ativo US incompatível com adaptador de dividendos BR",
      });
      continue;
    }

    // 3. Compute via SSOT (isJCP = false)
    const currency = pos.currency || "BRL";
    const rate = dividendTaxRate(pos.type, currency, pos.customTaxRate, false);
    const net = netAfterTax(pos.grossAmount, pos.type, currency, pos.customTaxRate, false);
    const tax = pos.grossAmount - net;

    validPositions.push({
      ticker: pos.ticker,
      type: pos.type,
      jurisdiction: "BR",
      currency,
      grossAmount: pos.grossAmount,
      netAmount: net,
      withheldTax: tax,
      taxRate: rate,
      customTaxRate: pos.customTaxRate,
      isJCP: false,
    });

    totalGross += pos.grossAmount;
    totalNet += net;
    totalTax += tax;
  }

  const effectiveTaxRate = totalGross > 0 ? totalTax / totalGross : 0;

  return {
    jurisdiction: "BR",
    totalGross,
    totalNet,
    totalTax,
    effectiveTaxRate,
    positions: validPositions,
    ...(errors.length > 0 ? { errors } : {}),
    calculatedAt: asOf || new Date().toISOString().split("T")[0],
  };
}
