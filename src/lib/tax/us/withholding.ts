import { dividendTaxRate, netAfterTax, isUsAsset } from "@/lib/calculations";
import type {
  TaxSimulationPositionInput,
  TaxSimulationPosition,
  TaxSimulationResult,
  TaxSimulationError,
} from "../types";

/**
 * Pure adapter for US dividend withholding tax (W-8BEN 30% default).
 * Consumes the SSOT (`dividendTaxRate`, `netAfterTax`, `isUsAsset`) from `src/lib/calculations.ts`.
 *
 * Dividends and distributions from US equities/REITs/ETFs paid to non-resident aliens
 * are subject to 30% statutory withholding tax at source.
 */
export function simulateUsWithholdingTax(
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

    const currency = pos.currency || "USD";

    // 2. Validation: US asset eligibility via SSOT
    if (!isUsAsset(pos.type, currency)) {
      errors.push({
        ticker: pos.ticker,
        code: "INCOMPATIBLE_JURISDICTION",
        message: "Ativo não elegível para retenção US (não é STOCK_US, REIT ou ETF em USD)",
      });
      continue;
    }

    // 3. Compute via SSOT (isJCP = false)
    const rate = dividendTaxRate(pos.type, currency, pos.customTaxRate, false);
    const net = netAfterTax(pos.grossAmount, pos.type, currency, pos.customTaxRate, false);
    const tax = pos.grossAmount - net;

    validPositions.push({
      ticker: pos.ticker,
      type: pos.type,
      jurisdiction: "US",
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
    jurisdiction: "US",
    totalGross,
    totalNet,
    totalTax,
    effectiveTaxRate,
    positions: validPositions,
    ...(errors.length > 0 ? { errors } : {}),
    calculatedAt: asOf || new Date().toISOString().split("T")[0],
  };
}
