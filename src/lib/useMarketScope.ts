import { useMemo } from "react";
import { useUserSettings } from "@/lib/useUserSettings";
import { useValuedPortfolio, type ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Currency } from "@/lib/domain";
import {
  EIGHT_CLASSES_ORDER,
  US_CLASSES_ORDER,
  type EightClassKey,
} from "@/lib/selectors/eightClassAllocation";
import {
  US_SUPPORTED_BROKERS,
  BR_SUPPORTED_BROKERS,
  type SupportedBroker,
} from "@/lib/brokers";

export interface MarketScope {
  taxJurisdiction: "US" | "BR";
  isUS: boolean;
  hasBrPositions: boolean;
  hasUsPositions: boolean;
  isUSNative: boolean;
  isBRNative: boolean;
  isDual: boolean;
  defaultCurrency: Currency;
  currency: Currency;
  defaultScreenerMarket: "US" | "ALL" | "BR";
  visibleAllocationClasses: EightClassKey[];
  priorityBrokers: SupportedBroker[];
  secondaryBrokers: SupportedBroker[];
}

export function computeMarketScope(
  taxJurisdiction: "US" | "BR" = "BR",
  positions: ValuedWatchlistItem[] = [],
  explicitCurrency?: Currency,
): MarketScope {
  const isUS = taxJurisdiction === "US";
  const defaultCurrency: Currency = isUS ? "USD" : "BRL";
  const currency: Currency = explicitCurrency || defaultCurrency;

  let hasBrPositions = false;
  let hasUsPositions = false;

  for (const pos of positions) {
    if (pos.isClosedPosition || (pos.quantity ?? 0) <= 0) continue;

    if (
      pos.currency === "BRL" ||
      pos.type === "STOCK_BR" ||
      pos.type === "FII" ||
      pos.type === "FIAGRO" ||
      pos.type === "FII_INFRA"
    ) {
      hasBrPositions = true;
    }

    if (
      pos.currency === "USD" ||
      pos.type === "STOCK_US" ||
      pos.type === "REIT"
    ) {
      hasUsPositions = true;
    }
  }

  const isUSNative = isUS && !hasBrPositions;
  const isBRNative = !isUS && !hasUsPositions;
  const isDual = (isUS && hasBrPositions) || (!isUS && hasUsPositions);

  const defaultScreenerMarket: "US" | "ALL" | "BR" = isUS ? "US" : "ALL";

  // Visible classes for allocation card & radar:
  // If US native, show only US classes
  const visibleAllocationClasses: EightClassKey[] = isUSNative
    ? US_CLASSES_ORDER
    : EIGHT_CLASSES_ORDER;

  const priorityBrokers: SupportedBroker[] = isUS
    ? US_SUPPORTED_BROKERS
    : BR_SUPPORTED_BROKERS;

  const secondaryBrokers: SupportedBroker[] = isUS
    ? BR_SUPPORTED_BROKERS
    : US_SUPPORTED_BROKERS;

  return {
    taxJurisdiction,
    isUS,
    hasBrPositions,
    hasUsPositions,
    isUSNative,
    isBRNative,
    isDual,
    defaultCurrency,
    currency,
    defaultScreenerMarket,
    visibleAllocationClasses,
    priorityBrokers,
    secondaryBrokers,
  };
}

export function useMarketScope(): MarketScope {
  const { settings } = useUserSettings();
  const { valuedItems } = useValuedPortfolio();

  const taxJurisdiction = settings?.taxJurisdiction === "US" ? "US" : "BR";

  return useMemo(
    () => computeMarketScope(taxJurisdiction, valuedItems, settings?.displayCurrency),
    [taxJurisdiction, valuedItems, settings?.displayCurrency],
  );
}
