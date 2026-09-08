import type { AssetType, Currency } from "@/lib/domain";

export type TaxRegimeKey =
  | "exemptDouble"
  | "exemptDividend"
  | "whtCompensable"
  | "jcpWithholding"
  | "standard"
  | "usQualified"
  | "usReitQbi"
  | "usEtf"
  | "foreignBr";

/**
 * Maps an asset's type/currency and the investor's tax jurisdiction to its dividend tax-exemption regime.
 */
export function computeTaxRegimeKey(
  type: AssetType,
  currency: Currency,
  jurisdiction: "BR" | "US" = "BR",
): TaxRegimeKey {
  if (jurisdiction === "US") {
    if (type === "REIT") return "usReitQbi";
    if (type === "ETF") return "usEtf";
    if (type === "STOCK_US" || currency === "USD") return "usQualified";
    if (
      currency === "BRL" ||
      type === "STOCK_BR" ||
      type === "FII" ||
      type === "FIAGRO" ||
      type === "FII_INFRA"
    ) {
      return "foreignBr";
    }
    return "standard";
  }

  // Brazilian tax jurisdiction:
  if (type === "FII_INFRA") return "exemptDouble";
  if (type === "FII" || type === "FIAGRO") return "exemptDividend";
  if (currency === "USD") return "whtCompensable";
  if (type === "STOCK_BR") return "jcpWithholding";
  return "standard";
}
