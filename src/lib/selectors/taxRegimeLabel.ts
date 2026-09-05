import type { AssetType, Currency } from "@/lib/domain";

export type TaxRegimeKey = "exemptDouble" | "exemptDividend" | "whtCompensable" | "jcpWithholding" | "standard";

/**
 * Maps an asset's type/currency to its dividend tax-exemption regime, mirroring the rules
 * already applied by netAfterTax/dividendTaxRate in calculations.ts, as a display-facing label key.
 */
export function computeTaxRegimeKey(type: AssetType, currency: Currency): TaxRegimeKey {
  if (type === "FII_INFRA") return "exemptDouble";
  if (type === "FII" || type === "FIAGRO") return "exemptDividend";
  if (currency === "USD") return "whtCompensable";
  if (type === "STOCK_BR") return "jcpWithholding";
  return "standard";
}
