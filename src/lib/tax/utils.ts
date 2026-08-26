import type { AssetType } from "@/lib/domain";
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
