export const ASSET_TYPE_COLORS: Record<string, string> = {
  STOCK_US: "hsl(var(--asset-stock-us))",
  STOCK_BR: "hsl(var(--asset-stock-br))",
  REIT: "hsl(var(--asset-reit))",
  FII: "hsl(var(--asset-fii))",
  ETF: "hsl(var(--asset-etf))",
  FII_INFRA: "hsl(var(--asset-fii-infra))",
  FIAGRO: "hsl(var(--asset-fiagro))",
  FIXED_INCOME: "hsl(var(--asset-stock-br))",
  OTHER: "hsl(var(--asset-other))",
  amount: "var(--success)",
};

export function getColorForAsset(type?: string): string {
  if (!type) return ASSET_TYPE_COLORS.OTHER;
  if (type in ASSET_TYPE_COLORS) return ASSET_TYPE_COLORS[type];
  return ASSET_TYPE_COLORS.OTHER;
}
