import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { AssetType } from "@/lib/domain";
import { convertCurrency } from "@/lib/currency";

export type EightClassKey =
  | "acoes_br"
  | "fiis"
  | "fiagros"
  | "fi_infras"
  | "reits_us"
  | "etfs_us"
  | "etfs_br"
  | "acoes_us";

export interface EightClassAllocationItem {
  key: EightClassKey;
  currentPct: number;
  targetPct: number;
  status: "invest" | "balanced" | "above";
  priority: "priority" | "balanced";
}

export const EIGHT_CLASSES_ORDER: EightClassKey[] = [
  "acoes_br",
  "fiis",
  "fiagros",
  "fi_infras",
  "reits_us",
  "etfs_us",
  "etfs_br",
  "acoes_us",
];

export const PROTOTYPE_DEFAULT_TARGETS: Record<EightClassKey, number> = {
  acoes_br: 25.0,
  fiis: 15.0,
  fiagros: 5.0,
  fi_infras: 15.0,
  reits_us: 10.0,
  etfs_us: 20.0,
  etfs_br: 5.0,
  acoes_us: 5.0,
};

export function classifyPositionToEightClass(pos: ValuedWatchlistItem): EightClassKey {
  if (pos.type === "STOCK_BR") return "acoes_br";
  if (pos.type === "FII") return "fiis";
  if (pos.type === "FIAGRO") return "fiagros";
  if (pos.type === "FII_INFRA") return "fi_infras";
  if (pos.type === "REIT") return "reits_us";
  if (pos.type === "STOCK_US") return "acoes_us";
  if (pos.type === "ETF") {
    return pos.currency === "USD" ? "etfs_us" : "etfs_br";
  }
  if (pos.type === "FIXED_INCOME") return "etfs_br";
  return "acoes_br";
}

export function computeEightClassAllocations(
  positions: ValuedWatchlistItem[],
  userTargets?: Partial<Record<AssetType, number>>,
  fxRate?: number,
): EightClassAllocationItem[] {
  // 1. Calculate current value in BRL for each of the 8 classes
  const classValues: Record<EightClassKey, number> = {
    acoes_br: 0,
    fiis: 0,
    fiagros: 0,
    fi_infras: 0,
    reits_us: 0,
    etfs_us: 0,
    etfs_br: 0,
    acoes_us: 0,
  };
  let totalPortfolioValue = 0;

  for (const pos of positions) {
    const qty = pos.quantity ?? 0;
    if (qty <= 0) continue;
    const price = pos.livePrice ?? pos.currentPrice ?? 0;
    const rawVal = qty * price;
    const valBRL = fxRate != null ? convertCurrency(rawVal, pos.currency, "BRL", fxRate) : rawVal;
    const classKey = classifyPositionToEightClass(pos);
    classValues[classKey] += valBRL;
    totalPortfolioValue += valBRL;
  }

  // 2. Determine target percentages for each of the 8 classes
  const targets: Record<EightClassKey, number> = { ...PROTOTYPE_DEFAULT_TARGETS };

  const totalUserWeight = Object.values(userTargets || {}).reduce(
    (sum: number, w) => sum + (typeof w === "number" && w > 0 ? w : 0),
    0,
  );

  if (totalUserWeight > 0 && userTargets) {
    const wStockBR = userTargets.STOCK_BR ?? 0;
    const wStockUS = userTargets.STOCK_US ?? 0;
    const wFii = userTargets.FII ?? 0;
    const wReit = userTargets.REIT ?? 0;
    const wEtf = userTargets.ETF ?? 0;
    const wFixed = userTargets.FIXED_INCOME ?? 0;

    targets.acoes_br = (wStockBR / totalUserWeight) * 100;
    targets.acoes_us = (wStockUS / totalUserWeight) * 100;
    targets.reits_us = (wReit / totalUserWeight) * 100;

    // FII target is split into FII (15/35), FI-Infra (15/35), Fiagro (5/35) according to prototype benchmark
    const fiiTargetPct = (wFii / totalUserWeight) * 100;
    targets.fiis = fiiTargetPct * (15 / 35);
    targets.fi_infras = fiiTargetPct * (15 / 35);
    targets.fiagros = fiiTargetPct * (5 / 35);

    // ETF target is split into ETFs US (80%) and ETFs BR (20%) + Fixed Income
    const etfTargetPct = ((wEtf + wFixed) / totalUserWeight) * 100;
    targets.etfs_us = etfTargetPct * 0.8;
    targets.etfs_br = etfTargetPct * 0.2;
  }

  // 3. Assemble the 8 classes in exact prototype order
  return EIGHT_CLASSES_ORDER.map((key) => {
    const currentVal = classValues[key];
    const currentPct = totalPortfolioValue > 0 ? (currentVal / totalPortfolioValue) * 100 : 0;
    const targetPct = targets[key];
    const diff = currentPct - targetPct;

    let status: "invest" | "balanced" | "above" = "balanced";
    if (diff < -1.5) {
      status = "invest";
    } else if (diff > 1.5) {
      status = "above";
    }

    const priority: "priority" | "balanced" = currentPct <= targetPct ? "priority" : "balanced";

    return {
      key,
      currentPct,
      targetPct,
      status,
      priority,
    };
  });
}
