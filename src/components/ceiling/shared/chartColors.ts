import type { AssetType } from "@/lib/domain";

export const ASSET_COLORS: Record<AssetType | "OTHER" | "amount", string> = {
  FII: "hsl(var(--asset-fii))",
  REIT: "hsl(var(--asset-reit))",
  STOCK_BR: "hsl(var(--asset-stock-br))",
  STOCK_US: "hsl(var(--asset-stock-us))",
  ETF: "hsl(var(--asset-etf))",
  FII_INFRA: "hsl(var(--asset-fii-infra))",
  FIAGRO: "hsl(var(--asset-fiagro))",
  FIXED_INCOME: "hsl(var(--asset-fixed-income, 160 84% 39%))",
  OTHER: "hsl(var(--asset-other))",
  amount: "var(--color-success, var(--success))",
};

export function getColorForAsset(type?: string): string {
  if (!type) return ASSET_COLORS.OTHER;
  if (type in ASSET_COLORS) return ASSET_COLORS[type as keyof typeof ASSET_COLORS];
  return ASSET_COLORS.OTHER;
}
