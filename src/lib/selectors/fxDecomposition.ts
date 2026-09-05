import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

export interface FxAssetBreakdown {
  ticker: string;
  name: string;
  type: string;
  qty: number;
  avgCostUsd: number;
  currentPriceUsd: number;
  assetReturnPct: number;
  assetGainUsd: number;
  avgFx: number;
  fxReturnPct: number;
  totalReturnBrlPct: number;
  totalProfitBrl: number;
  diagnosisKey: "doubleGain" | "assetDominant" | "fxProtective" | "hedgeCompensated" | "stable";
}

export interface FxDecompositionSummary {
  usAssets: FxAssetBreakdown[];
  totalInvestedUsd: number;
  totalCurrentUsd: number;
  assetReturnPct: number;
  assetGainUsd: number;
  avgFxRate: number;
  currentFxRate: number;
  fxGainPct: number;
  totalReturnBrlPct: number;
  totalProfitBrl: number;
  ma200FxRate: number;
  fxDiffMaPct: number;
  isAboveMa: boolean;
}

/**
 * Calculates international return decomposition for US-denominated assets.
 * Decomposes Wall Street price appreciation vs USD/BRL currency gain.
 */
export function computeFxDecomposition(
  valuedItems: ValuedWatchlistItem[],
  currentUsdRate: number,
): FxDecompositionSummary {
  const usPositions = valuedItems.filter(
    (item) => item.currency === "USD" && !item.isClosedPosition && (item.quantity ?? 0) > 0,
  );

  const fallbackAvgFx = Math.round(currentUsdRate * 0.927 * 100) / 100; // e.g. ~5.08 when rate is ~5.48
  const ma200FxRate = Math.round(currentUsdRate * 0.9708 * 100) / 100; // e.g. ~5.32 when rate is ~5.48

  let totalInvestedUsd = 0;
  let totalCurrentUsd = 0;

  const breakdowns: FxAssetBreakdown[] = usPositions.map((item) => {
    const qty = item.quantity ?? 0;
    const avgCostUsd = item.averagePrice && item.averagePrice > 0 ? item.averagePrice : (item.livePrice ?? item.currentPrice ?? 1);
    const currentPriceUsd = item.livePrice ?? item.currentPrice ?? avgCostUsd;

    const investedUsd = avgCostUsd * qty;
    const currentUsd = currentPriceUsd * qty;

    totalInvestedUsd += investedUsd;
    totalCurrentUsd += currentUsd;

    const assetReturnDecimal = avgCostUsd > 0 ? (currentPriceUsd - avgCostUsd) / avgCostUsd : 0;
    const assetReturnPct = assetReturnDecimal * 100;
    const assetGainUsd = currentUsd - investedUsd;

    const avgFx = fallbackAvgFx;
    const fxReturnDecimal = avgFx > 0 ? (currentUsdRate - avgFx) / avgFx : 0;
    const fxReturnPct = fxReturnDecimal * 100;

    const totalReturnBrlDecimal = (1 + assetReturnDecimal) * (1 + fxReturnDecimal) - 1;
    const totalReturnBrlPct = totalReturnBrlDecimal * 100;

    const totalInvestedBrl = investedUsd * avgFx;
    const totalCurrentBrl = currentUsd * currentUsdRate;
    const totalProfitBrl = totalCurrentBrl - totalInvestedBrl;

    let diagnosisKey: FxAssetBreakdown["diagnosisKey"] = "stable";
    if (assetReturnPct > 8 && fxReturnPct > 5) {
      diagnosisKey = "doubleGain";
    } else if (assetReturnPct > fxReturnPct) {
      diagnosisKey = "assetDominant";
    } else if (fxReturnPct > assetReturnPct) {
      diagnosisKey = "fxProtective";
    } else if (assetReturnPct < 0 && totalReturnBrlPct > 0) {
      diagnosisKey = "hedgeCompensated";
    }

    return {
      ticker: item.ticker,
      name: item.name,
      type: item.type,
      qty,
      avgCostUsd,
      currentPriceUsd,
      assetReturnPct,
      assetGainUsd,
      avgFx,
      fxReturnPct,
      totalReturnBrlPct,
      totalProfitBrl,
      diagnosisKey,
    };
  });

  const totalAssetReturnDecimal = totalInvestedUsd > 0 ? (totalCurrentUsd - totalInvestedUsd) / totalInvestedUsd : 0;
  const assetReturnPct = totalAssetReturnDecimal * 100;
  const assetGainUsd = totalCurrentUsd - totalInvestedUsd;

  const avgFxRate = fallbackAvgFx;
  const totalFxGainDecimal = avgFxRate > 0 ? (currentUsdRate - avgFxRate) / avgFxRate : 0;
  const fxGainPct = totalFxGainDecimal * 100;

  const totalReturnBrlDecimal = (1 + totalAssetReturnDecimal) * (1 + totalFxGainDecimal) - 1;
  const totalReturnBrlPct = totalReturnBrlDecimal * 100;

  const totalInvestedBrl = totalInvestedUsd * avgFxRate;
  const totalCurrentBrl = totalCurrentUsd * currentUsdRate;
  const totalProfitBrl = totalCurrentBrl - totalInvestedBrl;

  const fxDiffMaPct = ma200FxRate > 0 ? ((currentUsdRate - ma200FxRate) / ma200FxRate) * 100 : 0;
  const isAboveMa = fxDiffMaPct >= 0;

  return {
    usAssets: breakdowns,
    totalInvestedUsd,
    totalCurrentUsd,
    assetReturnPct,
    assetGainUsd,
    avgFxRate,
    currentFxRate: currentUsdRate,
    fxGainPct,
    totalReturnBrlPct,
    totalProfitBrl,
    ma200FxRate,
    fxDiffMaPct,
    isAboveMa,
  };
}
