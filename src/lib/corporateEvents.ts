export type CorporateEventType = "split" | "grouping";

export interface CorporateEventPayload {
  type: CorporateEventType;
  /**
   * factor represents the multiplier for quantity.
   * For a 1:4 split (4 new shares for 1 old share), factor = 4.
   * For a 10:1 grouping (1 new share for 10 old shares), factor = 0.1.
   */
  factor: number;
}

export interface AssetPosition {
  ticker: string;
  quantity: number;
  averagePrice: number;
}

export interface ProcessedPosition extends AssetPosition {
  /**
   * Cash returned if fractional shares were liquidated during a grouping.
   */
  fractionalCash?: number;
}

/**
 * Applies a corporate event (split or grouping) to an asset position.
 *
 * @param position The user's current holding for the asset.
 * @param event The corporate event details.
 * @param liquidateFractional Whether to liquidate fractional shares resulting from a grouping.
 * @param currentMarketPrice The market price used to calculate cash from fractional liquidation. Falls back to the new average price if undefined.
 */
export function applyCorporateEvent(
  position: AssetPosition,
  event: CorporateEventPayload,
  liquidateFractional: boolean = true,
  currentMarketPrice?: number,
): ProcessedPosition {
  if (position.quantity <= 0) return position;

  let newQuantity = position.quantity * event.factor;
  // To keep Total Invested Capital identical (quantity * avgPrice),
  // the new average price must be divided by the factor.
  const newAveragePrice = position.averagePrice / event.factor;

  let fractionalCash = 0;

  // Handle grouping fractionals (Inplit)
  if (event.type === "grouping" && liquidateFractional) {
    // Avoid floating point precision issues with small decimals
    const roundedQuantity = Math.round(newQuantity * 1000000) / 1000000;
    const wholeShares = Math.floor(roundedQuantity);
    const fraction = roundedQuantity - wholeShares;

    if (fraction > 0) {
      newQuantity = wholeShares;
      // In B3, fractional shares are usually auctioned at market price.
      // If no market price is provided, we simulate the cash value using the new average price.
      const priceToUse = currentMarketPrice ?? newAveragePrice;
      fractionalCash = fraction * priceToUse;
    }
  }

  return {
    ticker: position.ticker,
    quantity: newQuantity,
    averagePrice: newAveragePrice,
    ...(fractionalCash > 0 ? { fractionalCash } : {}),
  };
}

// -------- Automated Detection (Yahoo Finance Integration) --------

export interface PendingCorporateEvent {
  eventId: string;
  date: number;
  type: CorporateEventType;
  ratio: number;
  status?: "confirmed" | "divergent" | "unconfirmed";
  confidence?: "confirmed" | "single_source" | "divergent";
  sources?: string[];
  divergenceDetails?: string;
}

export function isPendingCorporateEvent(ev: unknown): ev is PendingCorporateEvent {
  if (typeof ev !== "object" || ev === null) return false;
  const e = ev as Record<string, unknown>;
  return (
    typeof e.eventId === "string" &&
    typeof e.date === "number" &&
    (e.type === "split" || e.type === "grouping") &&
    typeof e.ratio === "number" &&
    Number.isFinite(e.ratio) &&
    e.ratio > 0
  );
}

import { recalculateHoldingFromTransactions, type Transaction } from "./transactionsLogic";
import { cleanTicker } from "./formatters";
import { isBrTicker } from "./classify";

export interface CorporateEventImpact {
  /** The quantity eligible for the event on the event date */
  eligibleQuantity: number;
  /** Current total quantity before applying event */
  currentQuantity: number;
  /** Current average price before applying event */
  currentAveragePrice: number;
  /** Projected total quantity after applying event */
  newQuantity: number;
  /** Projected average price after applying event */
  newAveragePrice: number;
  /** Delta quantity (+ for split, - for grouping) */
  deltaQuantity: number;
  /** Price variation percentage */
  priceVariationPct: number;
  /** True if the user had eligible shares (> 0) on the event date */
  isApplicable: boolean;
  /** Processed position preview */
  preview: ProcessedPosition;
  /** Fractional shares / sobras left over from grouping (destined for B3 Leilão de Frações) */
  fractionalShares?: number;
  /** Estimated cash proceeds from fraction auction (in R$) */
  fractionalCashEstimate?: number;
}

function isTxOnOrBeforeEventDate(txDateMs: number, eventDateMs: number): boolean {
  if (txDateMs <= eventDateMs) return true;
  // For realistic modern dates (> year 2000), allow daytime transactions on the same calendar day (Data-Com)
  if (txDateMs > 946684800000 && eventDateMs > 946684800000) {
    const txIso = new Date(txDateMs).toISOString().split("T")[0];
    const evIso = new Date(eventDateMs).toISOString().split("T")[0];
    return txIso <= evIso;
  }
  return false;
}

/**
 * Computes the financial impact of a corporate event (split or grouping),
 * strictly applying the adjustment ONLY to the shares that existed on the event date (Data-Com/Data-Ex cutoff).
 * Shares acquired after the event date are preserved without alteration.
 * On B3 assets (Ações and FIIs), custody is strictly whole numbers and any grouping fractions
 * are identified as leftovers for the B3 Fraction Auction (Leilão de Frações).
 */
export function calculateCorporateEventImpact(
  item: WatchlistItem,
  event: { date: number; type: CorporateEventType; factor: number },
  transactions: Transaction[] = [],
  currentMarketPrice?: number,
): CorporateEventImpact {
  const cleanT = cleanTicker(item.ticker);
  const tickerTxs = transactions.filter((tx) => cleanTicker(tx.ticker) === cleanT);
  const currentAvgPrice = item.averagePrice ?? item.currentPrice;
  const isBR = isBrTicker(item.ticker);
  const sanitizedItemQty = isBR ? Math.round(item.quantity) : item.quantity;

  if (tickerTxs.length > 0) {
    // 1. Calculate how many shares existed on or before the event cutoff date (Data-Com)
    const eligibleTxs = tickerTxs.filter((tx) => isTxOnOrBeforeEventDate(tx.date, event.date));
    const eligibleHolding = recalculateHoldingFromTransactions(eligibleTxs);
    let eligibleQuantity = eligibleHolding.quantity;
    if (isBR) {
      eligibleQuantity = Math.round(eligibleQuantity);
    }

    // If 0 shares existed on that date, the event is not applicable to this holding
    if (eligibleQuantity <= 0) {
      return {
        eligibleQuantity: 0,
        currentQuantity: sanitizedItemQty,
        currentAveragePrice: currentAvgPrice,
        newQuantity: sanitizedItemQty,
        newAveragePrice: currentAvgPrice,
        deltaQuantity: 0,
        priceVariationPct: 0,
        isApplicable: false,
        preview: {
          ticker: item.ticker,
          quantity: sanitizedItemQty,
          averagePrice: currentAvgPrice,
        },
      };
    }

    // 2. Current holding from the ledger
    const currentHolding = recalculateHoldingFromTransactions(tickerTxs);
    let currentQuantity = currentHolding.quantity > 0 ? currentHolding.quantity : sanitizedItemQty;
    if (isBR) {
      currentQuantity = Math.round(currentQuantity);
    }
    const effectiveAvgPrice =
      currentHolding.quantity > 0 ? currentHolding.averagePrice : currentAvgPrice;

    // 3. Simulate inserting the corporate_action transaction at the close of event.date (Data-Com)
    let simulatedCorpDate = event.date;
    if (event.date > 946684800000) {
      const eventEndOfDay = new Date(event.date);
      eventEndOfDay.setUTCHours(23, 59, 59, 999);
      simulatedCorpDate = Math.max(event.date, eventEndOfDay.getTime());
    }

    const simulatedTxs: Transaction[] = [
      ...tickerTxs,
      {
        id: `simulated-corp-${simulatedCorpDate}`,
        ticker: item.ticker,
        type: "corporate_action",
        date: simulatedCorpDate,
        quantity: 0,
        pricePerShare: 0,
        factor: event.factor,
      },
    ];

    const postEventHolding = recalculateHoldingFromTransactions(simulatedTxs);
    let newQuantity = postEventHolding.quantity;
    let newAveragePrice = postEventHolding.averagePrice;
    let fractionalShares = 0;
    let fractionalCashEstimate = 0;

    if (isBR) {
      // In B3 (Ações e FIIs), custody is strictly whole numbers
      newQuantity = Math.round(newQuantity);

      // If grouping, calculate fraction leftovers for the B3 auction
      if (event.type === "grouping") {
        const rawGrouped = eligibleQuantity * event.factor;
        const wholeGrouped = Math.floor(rawGrouped + 1e-7);
        const fraction = rawGrouped - wholeGrouped;
        if (fraction > 1e-6) {
          fractionalShares = Math.round(fraction * 1e4) / 1e4;
          const priceToUse = currentMarketPrice ?? newAveragePrice;
          fractionalCashEstimate = Math.round(fraction * priceToUse * 100) / 100;
        }
      }
    } else {
      // Foreign assets (US Stocks/ETFs) might permit fractional shares or liquidation
      if (event.type === "grouping") {
        const roundedQuantity = Math.round(newQuantity * 1000000) / 1000000;
        const wholeShares = Math.floor(roundedQuantity);
        const fraction = roundedQuantity - wholeShares;
        if (fraction > 0) {
          newQuantity = wholeShares;
          const priceToUse = currentMarketPrice ?? newAveragePrice;
          fractionalCashEstimate = fraction * priceToUse;
          fractionalShares = fraction;
        }
      }
    }

    const deltaQuantity = newQuantity - currentQuantity;
    const priceVariationPct =
      effectiveAvgPrice > 0
        ? ((newAveragePrice - effectiveAvgPrice) / effectiveAvgPrice) * 100
        : 0;

    return {
      eligibleQuantity,
      currentQuantity,
      currentAveragePrice: effectiveAvgPrice,
      newQuantity,
      newAveragePrice,
      deltaQuantity,
      priceVariationPct,
      isApplicable: true,
      fractionalShares: fractionalShares > 0 ? fractionalShares : undefined,
      fractionalCashEstimate: fractionalCashEstimate > 0 ? fractionalCashEstimate : undefined,
      preview: {
        ticker: item.ticker,
        quantity: newQuantity,
        averagePrice: newAveragePrice,
        ...(fractionalCashEstimate > 0 ? { fractionalCash: fractionalCashEstimate } : {}),
      },
    };
  }

  // Fallback: User does NOT have a transaction ledger for this ticker
  const acquisitionDate = item.investingSince || item.addedAt || 0;
  if (acquisitionDate > 0 && !isTxOnOrBeforeEventDate(acquisitionDate, event.date)) {
    return {
      eligibleQuantity: 0,
      currentQuantity: sanitizedItemQty,
      currentAveragePrice: currentAvgPrice,
      newQuantity: sanitizedItemQty,
      newAveragePrice: currentAvgPrice,
      deltaQuantity: 0,
      priceVariationPct: 0,
      isApplicable: false,
      preview: {
        ticker: item.ticker,
        quantity: sanitizedItemQty,
        averagePrice: currentAvgPrice,
      },
    };
  }

  let newQuantity: number;
  let newAveragePrice = currentAvgPrice / event.factor;
  let fractionalShares = 0;
  let fractionalCashEstimate = 0;

  if (isBR) {
    if (event.type === "grouping") {
      const rawGrouped = sanitizedItemQty * event.factor;
      const wholeGrouped = Math.floor(rawGrouped + 1e-7);
      const fraction = rawGrouped - wholeGrouped;
      newQuantity = wholeGrouped;
      if (fraction > 1e-6) {
        fractionalShares = Math.round(fraction * 1e4) / 1e4;
        const priceToUse = currentMarketPrice ?? newAveragePrice;
        fractionalCashEstimate = Math.round(fraction * priceToUse * 100) / 100;
      }
    } else {
      newQuantity = Math.round(sanitizedItemQty * event.factor);
    }
  } else {
    const preview = applyCorporateEvent(
      {
        ticker: item.ticker,
        quantity: item.quantity,
        averagePrice: currentAvgPrice,
      },
      { type: event.type, factor: event.factor },
      true,
      currentMarketPrice ?? item.currentPrice,
    );
    newQuantity = preview.quantity;
    newAveragePrice = preview.averagePrice;
    fractionalCashEstimate = preview.fractionalCash ?? 0;
    fractionalShares = 0;
  }

  const deltaQuantity = newQuantity - sanitizedItemQty;
  const priceVariationPct =
    currentAvgPrice > 0
      ? ((newAveragePrice - currentAvgPrice) / currentAvgPrice) * 100
      : 0;

  return {
    eligibleQuantity: sanitizedItemQty,
    currentQuantity: sanitizedItemQty,
    currentAveragePrice: currentAvgPrice,
    newQuantity,
    newAveragePrice,
    deltaQuantity,
    priceVariationPct,
    isApplicable: sanitizedItemQty > 0,
    fractionalShares: fractionalShares > 0 ? fractionalShares : undefined,
    fractionalCashEstimate: fractionalCashEstimate > 0 ? fractionalCashEstimate : undefined,
    preview: {
      ticker: item.ticker,
      quantity: newQuantity,
      averagePrice: newAveragePrice,
      ...(fractionalCashEstimate > 0 ? { fractionalCash: fractionalCashEstimate } : {}),
    },
  };
}

export function getHoldingAcquisitionDate(
  item: Pick<WatchlistItem, "investingSince" | "addedAt"> | null | undefined,
  transactions?: Array<{ ticker: string; type?: string; quantity?: number; date: number }>,
  ticker?: string,
): number {
  if (!item && !transactions) return 0;
  if (transactions && ticker) {
    const cleanT = cleanTicker(ticker);
    const tickerTx = transactions.filter(
      (tx) => cleanTicker(tx.ticker) === cleanT && (tx.type === "buy" || (tx.quantity ?? 0) > 0),
    );
    if (tickerTx.length > 0) {
      return Math.min(...tickerTx.map((tx) => tx.date));
    }
  }
  return item?.investingSince ?? item?.addedAt ?? 0;
}

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { corporateEventsQueryOptions } from "./queryOptions";
import { type WatchlistItem } from "./watchlist";
import { useTransactions } from "./transactions";

export function usePendingEvents(item: WatchlistItem | null) {
  const { transactions = [] } = useTransactions();

  const { data: rawEvents, isPending } = useQuery({
    ...corporateEventsQueryOptions(item?.ticker),
    enabled: !!item && (item.quantity ?? 0) > 0,
  });

  const pendingEvents = useMemo(() => {
    if (!Array.isArray(rawEvents) || !item) return [];
    const appliedIds = new Set(item.appliedEvents?.map((e) => e.eventId) ?? []);
    return rawEvents
      .filter(isPendingCorporateEvent)
      .filter((ev) => !appliedIds.has(ev.eventId))
      .filter((ev) => {
        const factor =
          ev.type === "split" ? ev.ratio : ev.ratio < 1 ? ev.ratio : 1 / ev.ratio;
        const impact = calculateCorporateEventImpact(
          item,
          { date: ev.date, type: ev.type, factor },
          transactions,
        );
        return impact.isApplicable;
      });
  }, [rawEvents, item, transactions]);

  return {
    pendingEvent: pendingEvents?.[0] ?? null,
    pendingEvents,
    isPending,
  };
}
