import { dividendTaxRate, netAfterTax } from "@/lib/calculations";
import type {
  TaxSimulationPositionInput,
  TaxSimulationPosition,
  TaxSimulationResult,
  TaxSimulationError,
} from "../types";

/**
 * Pure adapter for Brazilian JCP (Juros sobre Capital Próprio).
 * Consumes the SSOT (`dividendTaxRate` and `netAfterTax`) from `src/lib/calculations.ts`.
 *
 * Brazilian JCP is subject to 15% withholding income tax at source (IRRF).
 */
export function simulateBrJcpTax(
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
        message: "Ativo US incompatível com adaptador de JCP BR",
      });
      continue;
    }

    // 3. Compute via SSOT (isJCP = true)
    const currency = pos.currency || "BRL";
    const rate = dividendTaxRate(pos.type, currency, pos.customTaxRate, true);
    const net = netAfterTax(pos.grossAmount, pos.type, currency, pos.customTaxRate, true);
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
      isJCP: true,
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
