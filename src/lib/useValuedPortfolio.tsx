import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWatchlist, type WatchlistItem } from "./watchlist";
import { useUserSettings, type UserSettings } from "./useUserSettings";
import {
  netAfterTax,
  calculateFixedIncomeBalance,
  getPositionValue,
  type ValuationResult,
} from "./calculations";
import { useAuth } from "./auth-provider";
import { useI18n } from "./i18n-provider";
import { fetchValuedPortfolioFn } from "./api/portfolioBff.functions";
import { SELIC_FALLBACK, EXCHANGE_RATE_FALLBACK } from "./macroDefaults";
import { exchangeRateQueryOptions, macroRatesQueryOptions } from "./queryOptions";
import { useLiveQuotesAndMeta } from "@/components/ceiling/watchlist/useLiveQuotesAndMeta";

export interface ValuedWatchlistItem extends WatchlistItem {
  // Live computed fields
  livePrice: number; // Actual current price used (quote or fallback)
  // Overrides item.sector with meta.sector if available
  sector: string;
  valuation: ValuationResult;
  isClosedPosition: boolean;
  /**
   * True when valuedItems originated from the BFF server function (ADR-001).
   * Always true after legacy shutdown (Prompt 125). Optional for test mocks.
   */
  isBffMode: boolean;
}

// ---------------------------------------------------------------------------
// Shared totals computation
// ---------------------------------------------------------------------------

export function computeTotals(
  valuedItems: ValuedWatchlistItem[],
  fx: { USDBRL: number } | undefined,
  macroRates: Parameters<typeof calculateFixedIncomeBalance>[1] | undefined,
) {
  let usd = 0;
  let brl = 0;
  let usdWorth = 0;
  let brlWorth = 0;
  let usdInvested = 0;
  let brlInvested = 0;
  let countUsd = 0;
  let countBrl = 0;

  for (const it of valuedItems) {
    if (it.isClosedPosition) continue;

    const income = netAfterTax(
      it.annualDividend * it.quantity,
      it.type,
      it.currency,
      it.customTaxRate,
    );

    const worth = getPositionValue(it, macroRates);
    const avgPrice =
      typeof it.averagePrice === "number" && Number.isFinite(it.averagePrice) && it.averagePrice > 0
        ? it.averagePrice
        : 0;
    const qty =
      typeof it.quantity === "number" && Number.isFinite(it.quantity) && it.quantity > 0
        ? it.quantity
        : 0;
    const invested = avgPrice * qty;

    if (it.currency === "USD") {
      usd += income;
      usdWorth += worth;
      usdInvested += invested;
      countUsd++;
    } else if (it.currency === "BRL") {
      brl += income;
      brlWorth += worth;
      brlInvested += invested;
      countBrl++;
    }
  }

  const rate = fx?.USDBRL ?? 1;
  const consolidatedNetWorth = brlWorth + usdWorth * rate;
  const consolidatedInvested = brlInvested + usdInvested * rate;
  const consolidatedIncome = brl + usd * rate;

  return {
    usd,
    brl,
    usdWorth,
    brlWorth,
    usdInvested,
    brlInvested,
    countUsd,
    countBrl,
    consolidatedNetWorth,
    consolidatedInvested,
    consolidatedIncome,
  };
}

// ---------------------------------------------------------------------------
// BFF computation (ADR-001 path - ONLY path after Prompt 125)
// ---------------------------------------------------------------------------

export function transformBffItemToValuedItem(
  bffItem: any,
  fallbackSector: string = "Outros",
): ValuedWatchlistItem {
  const bffAny = bffItem as unknown as Record<string, unknown>;
  const valuation: ValuationResult = {
    ticker: bffItem.ticker,
    activeCeiling: bffItem.activeCeiling,
    margin: bffItem.margin,
    fuenteConsensus: (bffAny["fuenteConsensus"] as number | null | undefined) ?? null,
    methods: (bffAny["methods"] as ValuationResult["methods"] | undefined) ?? {
      bazin: null, graham: null, gordon: null, lynch: null,
    },
    assumptions: (bffAny["assumptions"] as ValuationResult["assumptions"] | undefined) ?? [],
    investorProfile: (bffAny["investorProfile"] as ValuationResult["investorProfile"] | undefined) ?? "moderate",
    bazin: (bffAny["bazin"] as number | null | undefined) ?? null,
    graham: (bffAny["graham"] as number | null | undefined) ?? null,
    gordon: (bffAny["gordon"] as number | null | undefined) ?? null,
    lynch: (bffAny["lynch"] as number | null | undefined) ?? null,
    gordonConfidence: (bffAny["gordonConfidence"] as "high" | "low" | null | undefined) ?? null,
    consensus: (bffAny["consensus"] as number | null | undefined) ?? null,
    dividendYield: (bffAny["dividendYield"] as number | undefined) ?? 0,
    positive: (bffAny["positive"] as boolean | undefined) ?? (bffItem.activeCeiling > bffItem.currentPrice),
    isUnavailable: (bffAny["isUnavailable"] as boolean | undefined) ?? false,
    yieldTrapWarning: (bffAny["yieldTrapWarning"] as ValuationResult["yieldTrapWarning"] | undefined) ?? null,
    shareholderYield: (bffAny["shareholderYield"] as number | null | undefined) ?? null,
  };

  return {
    ...bffItem,
    livePrice: bffItem.currentPrice,
    sector: bffItem.sector ?? fallbackSector,
    valuation,
    isClosedPosition: bffItem.quantity === 0,
    isBffMode: true,
  };
}

function useValuedPortfolioBff(
  items: WatchlistItem[],
  transactions: Transaction[],
  settings: UserSettings,
  isAppLoading: boolean,
  watchlistRest: ReturnType<typeof useWatchlist>,
) {
  const { t } = useI18n();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const { data: macroRates } = useQuery(macroRatesQueryOptions());
  const { loading: isAuthLoading } = useAuth();

  // Portfolio VALUATION itself comes exclusively from the BFF (fetchValuedPortfolioFn) per the
  // Prompt 125 migration — this client-side fan-out is kept only for what that migration's own
  // scope explicitly preserved: quotes/meta/dividendEventsMap consumed by non-valuation screens
  // (Income, Tax Reality, the Reinvest "paid today" eyebrow) that the BFF payload doesn't carry.
  const { quotes: liveQuotes, meta: liveMeta, dividendEventsMap: liveDividendEventsMap } =
    useLiveQuotesAndMeta(items);

  const itemsWithYield = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        targetYield: it.targetYield ?? settings.targetYield,
      })),
    [items, settings.targetYield],
  );

  const bffQuery = useQuery({
    queryKey: ["bffPortfolio", itemsWithYield.map((i) => i.ticker).join(","), transactions.length, settings.targetYield, JSON.stringify(settings.classTargetYields || {})],
    queryFn: () =>
      fetchValuedPortfolioFn({
        data: {
          uid: "",
          items: itemsWithYield,
          transactions,
          selicPct: SELIC_FALLBACK,
          terminalGrowthRate: 0.045,
          exchangeRate: fx?.USDBRL ?? EXCHANGE_RATE_FALLBACK,
          classTargetYields: settings.classTargetYields,
          targetYield: settings.targetYield,
        },
      }),
    enabled: !isAppLoading && !isAuthLoading && itemsWithYield.length > 0,
    staleTime: 60_000,
  });

  const valuedItems = useMemo<ValuedWatchlistItem[]>(() => {
    if (!bffQuery.data) return [];
    return bffQuery.data.items.map((bffItem) => transformBffItemToValuedItem(bffItem, t.common.other));
  }, [bffQuery.data, t]);

  const totals = useMemo(
    () => computeTotals(valuedItems, fx, macroRates),
    [valuedItems, fx, macroRates],
  );

  return {
    ...watchlistRest,
    items,
    valuedItems,
    totals,
    quotes: liveQuotes,
    meta: liveMeta,
    dividendEventsMap: liveDividendEventsMap,
    isAppLoading: isAppLoading || bffQuery.isLoading,
    lastUpdatedAt: bffQuery.dataUpdatedAt ?? 0,
    macroRates,
    fx,
    selic: SELIC_FALLBACK,
    isBffMode: true,
  };
}

// ---------------------------------------------------------------------------
// Gate dispatcher — BFF only (Legacy path removed in Prompt 125)
// ---------------------------------------------------------------------------

function useValuedPortfolioComputation() {
  const watchlistResult = useWatchlist();
  const { items, isPending: isWatchlistPending } = watchlistResult;
  const { transactions = [], isLoading: isTxLoading } = useTransactions();
  const { loading: isAuthLoading } = useAuth();
  const { settings } = useUserSettings();

  const isAppLoading = isAuthLoading || isWatchlistPending || isTxLoading;

  // Always use BFF path - legacy client-side computation removed
  const bffResult = useValuedPortfolioBff(
    items ?? [],
    transactions,
    settings,
    isAppLoading,
    watchlistResult,
  );

  return bffResult;
}

type ValuedPortfolioValue = ReturnType<typeof useValuedPortfolioComputation>;

const ValuedPortfolioContext = createContext<ValuedPortfolioValue | null>(null);

/**
 * useValuedPortfolio - Single source of truth for portfolio valuation via BFF.
 *
 * Legacy client-side merge (7 redundant queries) removed in Prompt 125.
 * This hook now exclusively uses fetchValuedPortfolioFn (TanStack Start server function)
 * which consolidates: positions + assets cache + exchange rates + macro rates + valuation
 * in a single network round-trip.
 */
export function ValuedPortfolioProvider({ children }: { children: ReactNode }) {
  const value = useValuedPortfolioComputation();
  return (
    <ValuedPortfolioContext.Provider value={value}>
      {children}
    </ValuedPortfolioContext.Provider>
  );
}

export function useValuedPortfolio() {
  const ctx = useContext(ValuedPortfolioContext);
  if (ctx) return ctx;
  return useValuedPortfolioComputation();
}

/**
 * Granular selector: returns only portfolio totals and core rates.
 * Memoized to prevent re-renders when individual items or quotes update.
 */
export function useValuedTotals() {
  const portfolio = useValuedPortfolio();
  return useMemo(
    () => ({
      totals: portfolio.totals,
      isAppLoading: portfolio.isAppLoading,
      fx: portfolio.fx,
      macroRates: portfolio.macroRates,
      lastUpdatedAt: portfolio.lastUpdatedAt,
      isBffMode: portfolio.isBffMode,
    }),
    [portfolio.totals, portfolio.isAppLoading, portfolio.fx, portfolio.macroRates, portfolio.lastUpdatedAt, portfolio.isBffMode]
  );
}

/**
 * Granular selector: returns a single ValuedWatchlistItem by ticker.
 */
export function useValuedItem(ticker: string | undefined): ValuedWatchlistItem | undefined {
  const portfolio = useValuedPortfolio();
  return useMemo(() => {
    if (!ticker) return undefined;
    const upper = ticker.toUpperCase();
    return portfolio.valuedItems.find((it) => it.ticker.toUpperCase() === upper);
  }, [portfolio.valuedItems, ticker]);
}

/**
 * Granular selector: returns only the valuedItems list.
 */
export function useValuedItems(): ValuedWatchlistItem[] {
  const portfolio = useValuedPortfolio();
  return portfolio.valuedItems;
}

// Re-export useTransactions for components that still need it
import { useTransactions, type Transaction } from "./transactions";
export { useTransactions, type Transaction };