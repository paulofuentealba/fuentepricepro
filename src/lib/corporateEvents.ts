export type CorporateEventType = 'split' | 'grouping';

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
  currentMarketPrice?: number 
): ProcessedPosition {
  if (position.quantity <= 0) return position;

  let newQuantity = position.quantity * event.factor;
  // To keep Total Invested Capital identical (quantity * avgPrice), 
  // the new average price must be divided by the factor.
  const newAveragePrice = position.averagePrice / event.factor;
  
  let fractionalCash = 0;

  // Handle grouping fractionals (Inplit)
  if (event.type === 'grouping' && liquidateFractional) {
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
    ...(fractionalCash > 0 ? { fractionalCash } : {})
  };
}

// -------- Automated Detection (Yahoo Finance Integration) --------

export interface PendingCorporateEvent {
  eventId: string;
  date: number;
  type: CorporateEventType;
  ratio: number;
}

import { useQuery } from "@tanstack/react-query";
import { checkPendingSplitsFn } from "./apiService.functions";
import { type WatchlistItem } from "./watchlist";

export function usePendingEvents(item: WatchlistItem | null) {
  // If the user manually added applied events, check the most recent one.
  // Otherwise fallback to addedAt, minus a 24h buffer for safety.
  const lastSync = item?.appliedEvents?.length 
    ? Math.max(...item.appliedEvents.map(e => e.date))
    : (item?.addedAt ? item.addedAt - (1000 * 60 * 60 * 24) : Date.now());

  const { data: pendingEvents, isPending } = useQuery({
    queryKey: ["pendingSplits", item?.ticker, lastSync],
    queryFn: async () => {
      if (!item) return [];
      try {
        const results = await checkPendingSplitsFn({ data: { ticker: item.ticker, sinceTimestamp: lastSync } });
        
        // Filter out anything already in appliedEvents
        const appliedIds = new Set(item.appliedEvents?.map(e => e.eventId) ?? []);
        return results.filter((ev: any) => !appliedIds.has(ev.eventId)) as PendingCorporateEvent[];
      } catch (err) {
        console.error("Error fetching pending splits for", item.ticker, err);
        return [];
      }
    },
    enabled: !!item && item.quantity > 0,
    staleTime: 1000 * 60 * 60 * 24, // Check at most once per 24 hours per asset to save bandwidth
  });

  return {
    pendingEvent: pendingEvents?.[0] ?? null,
    isPending
  };
}
