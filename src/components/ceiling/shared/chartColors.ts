import type { AssetType } from "@/lib/domain";

export const ASSET_TYPE_COLORS: Record<string, string> = {
  STOCK_US: "#8b5cf6", // purple-500
  STOCK_BR: "#f97316", // orange-500
  REIT: "#3b82f6",     // blue-500
  FII: "#10b981",      // emerald-500
  ETF: "#ec4899",      // pink-500
  FII_INFRA: "#06b6d4",// cyan-500
  FIAGRO: "#f43f5e",   // rose-500
  FIXED_INCOME: "#eab308", // yellow-500
  OTHER: "#6b7280",    // gray-500
  amount: "var(--color-success, var(--success))",
};

export function getColorForAsset(type?: string): string {
  if (!type) return ASSET_TYPE_COLORS.OTHER;
  if (type in ASSET_TYPE_COLORS) return ASSET_TYPE_COLORS[type];
  return ASSET_TYPE_COLORS.OTHER;
}
