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

import { cleanTicker } from "./formatters";

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
  const acquisitionDate = useMemo(
    () => getHoldingAcquisitionDate(item, transactions, item?.ticker),
    [item, transactions],
  );

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
      .filter((ev) => acquisitionDate === 0 || ev.date >= acquisitionDate);
  }, [rawEvents, item, acquisitionDate]);

  return {
    pendingEvent: pendingEvents?.[0] ?? null,
    pendingEvents,
    isPending,
  };
}
