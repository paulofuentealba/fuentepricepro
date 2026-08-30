import type { AssetType, Currency } from "@/lib/domain";
import type { RealizedGainEvent } from "./types";

/**
 * Resolves the AssetType for a RealizedGainEvent from the event itself
 * or from an optional ticker-to-assetType dictionary/map.
 */
export function getEventAssetType(
  ev: RealizedGainEvent,
  assetTypeByTicker?: Record<string, AssetType | undefined> | Map<string, AssetType>,
): AssetType | undefined {
  if (ev.assetType) {
    return ev.assetType;
  }
  if (!assetTypeByTicker) {
    return undefined;
  }
  if (assetTypeByTicker instanceof Map) {
    return assetTypeByTicker.get(ev.ticker);
  }
  return assetTypeByTicker[ev.ticker];
}

/**
 * Resolves the trading Currency for a RealizedGainEvent's ticker from an optional
 * ticker-to-currency dictionary/map (e.g. sourced from WatchlistItem.currency).
 * RealizedGainEvent itself carries no currency field, so this always relies on the map.
 */
export function getEventCurrency(
  ev: RealizedGainEvent,
  currencyByTicker?: Record<string, Currency | undefined> | Map<string, Currency>,
): Currency | undefined {
  if (!currencyByTicker) {
    return undefined;
  }
  if (currencyByTicker instanceof Map) {
    return currencyByTicker.get(ev.ticker);
  }
  return currencyByTicker[ev.ticker];
}
