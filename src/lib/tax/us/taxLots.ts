import type { Transaction, AccountType } from "@/lib/transactionsLogic";

export interface AssetTaxLot {
  id: string;
  ticker: string;
  accountType: AccountType;
  acquisitionDate: number;
  quantity: number;
  costBasisPerShare: number;
  totalCostBasis: number;
  currentValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPct: number;
  term: "SHORT_TERM" | "LONG_TERM";
  daysHeld: number;
  daysUntilLongTerm: number;
  isLongTerm: boolean;
}

export interface AssetTaxLotsSummary {
  ticker: string;
  currentPrice: number;
  totalQuantity: number;
  totalCostBasis: number;
  totalCurrentValue: number;
  totalUnrealizedGainLoss: number;
  shortTermQuantity: number;
  longTermQuantity: number;
  shortTermCostBasis: number;
  longTermCostBasis: number;
  shortTermPct: number;
  longTermPct: number;
  lots: AssetTaxLot[];
}

const ONE_YEAR_DAYS = 365;

/**
 * Computes individual open tax lots and aggregated short/long term breakdown
 * using standard IRS FIFO methodology.
 */
export function computeAssetTaxLots(
  transactions: Transaction[],
  ticker: string,
  currentPrice: number,
  asOfTs: number = Date.now(),
): AssetTaxLotsSummary {
  const cleanTicker = ticker.toUpperCase().trim();
  const sortedTxs = [...transactions]
    .filter((tx) => tx.ticker.toUpperCase().trim() === cleanTicker)
    .sort((a, b) => a.date - b.date);

  const buyLots: {
    id: string;
    date: number;
    quantityRemaining: number;
    pricePerShare: number;
    feesPerShare: number;
    accountType: AccountType;
  }[] = [];

  for (const tx of sortedTxs) {
    if (tx.type === "buy") {
      const feesPerShare = tx.quantity > 0 ? (tx.fees || 0) / tx.quantity : 0;
      buyLots.push({
        id: tx.id,
        date: tx.date,
        quantityRemaining: tx.quantity,
        pricePerShare: tx.pricePerShare,
        feesPerShare,
        accountType: tx.accountType || "taxable",
      });
    } else if (tx.type === "corporate_action") {
      const factor = tx.factor || 1;
      if (factor > 0) {
        for (const lot of buyLots) {
          lot.quantityRemaining *= factor;
          lot.pricePerShare /= factor;
          lot.feesPerShare /= factor;
        }
      }
    } else if (tx.type === "sell") {
      let qtyToSell = tx.quantity;
      while (qtyToSell > 0.000001 && buyLots.length > 0) {
        const lot = buyLots[0];
        const qtyFromLot = Math.min(qtyToSell, lot.quantityRemaining);
        lot.quantityRemaining -= qtyFromLot;
        qtyToSell -= qtyFromLot;
        if (lot.quantityRemaining <= 0.000001) {
          buyLots.shift();
        }
      }
    }
  }

  const lots: AssetTaxLot[] = [];
  let totalQuantity = 0;
  let totalCostBasis = 0;
  let shortTermQuantity = 0;
  let longTermQuantity = 0;
  let shortTermCostBasis = 0;
  let longTermCostBasis = 0;

  for (let idx = 0; idx < buyLots.length; idx++) {
    const rawLot = buyLots[idx];
    if (rawLot.quantityRemaining <= 0.000001) continue;

    const qty = Math.round(rawLot.quantityRemaining * 10000) / 10000;
    const costBasisPerShare =
      Math.round((rawLot.pricePerShare + rawLot.feesPerShare) * 100) / 100;
    const lotCostBasis = Math.round(qty * costBasisPerShare * 100) / 100;
    const currentValue = Math.round(qty * currentPrice * 100) / 100;
    const unrealizedGainLoss = Math.round((currentValue - lotCostBasis) * 100) / 100;
    const unrealizedGainLossPct =
      lotCostBasis > 0
        ? Math.round(((currentValue - lotCostBasis) / lotCostBasis) * 10000) / 100
        : 0;

    const daysHeld = Math.max(
      0,
      Math.floor((asOfTs - rawLot.date) / (1000 * 60 * 60 * 24)),
    );
    const isLongTerm = daysHeld > ONE_YEAR_DAYS;
    const term: "SHORT_TERM" | "LONG_TERM" = isLongTerm ? "LONG_TERM" : "SHORT_TERM";
    const daysUntilLongTerm = isLongTerm ? 0 : Math.max(1, ONE_YEAR_DAYS + 1 - daysHeld);

    totalQuantity += qty;
    totalCostBasis += lotCostBasis;

    if (isLongTerm) {
      longTermQuantity += qty;
      longTermCostBasis += lotCostBasis;
    } else {
      shortTermQuantity += qty;
      shortTermCostBasis += lotCostBasis;
    }

    lots.push({
      id: `${rawLot.id}_open_${idx + 1}`,
      ticker: cleanTicker,
      accountType: rawLot.accountType,
      acquisitionDate: rawLot.date,
      quantity: qty,
      costBasisPerShare,
      totalCostBasis: lotCostBasis,
      currentValue,
      unrealizedGainLoss,
      unrealizedGainLossPct,
      term,
      daysHeld,
      daysUntilLongTerm,
      isLongTerm,
    });
  }

  // Sort open lots chronologically (oldest / closest to long-term first)
  lots.sort((a, b) => a.acquisitionDate - b.acquisitionDate);

  const roundedTotalQty = Math.round(totalQuantity * 10000) / 10000;
  const roundedTotalCost = Math.round(totalCostBasis * 100) / 100;
  const totalCurrentValue = Math.round(roundedTotalQty * currentPrice * 100) / 100;
  const totalUnrealizedGainLoss =
    Math.round((totalCurrentValue - roundedTotalCost) * 100) / 100;

  const shortTermPct =
    roundedTotalQty > 0
      ? Math.round((shortTermQuantity / roundedTotalQty) * 100)
      : 0;
  const longTermPct = roundedTotalQty > 0 ? 100 - shortTermPct : 0;

  return {
    ticker: cleanTicker,
    currentPrice,
    totalQuantity: roundedTotalQty,
    totalCostBasis: roundedTotalCost,
    totalCurrentValue,
    totalUnrealizedGainLoss,
    shortTermQuantity: Math.round(shortTermQuantity * 10000) / 10000,
    longTermQuantity: Math.round(longTermQuantity * 10000) / 10000,
    shortTermCostBasis: Math.round(shortTermCostBasis * 100) / 100,
    longTermCostBasis: Math.round(longTermCostBasis * 100) / 100,
    shortTermPct,
    longTermPct,
    lots,
  };
}
