import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWatchlist, type WatchlistItem } from "./watchlist";
import { useSettings } from "./settings";
import { useLiveQuotesAndMeta } from "@/components/ceiling/watchlist/useLiveQuotesAndMeta";
import {
  getAssetValuation,
  netAfterTax,
  calculateFixedIncomeBalance,
  getPositionValue,
  calculateBvps,
  GORDON_TERMINAL_GROWTH_RATE,
  type ValuationResult,
} from "./calculations";
import { useSelic } from "./useSelic";
import { SELIC_FALLBACK, EXCHANGE_RATE_FALLBACK } from "./macroDefaults";
import { exchangeRateQueryOptions, macroRatesQueryOptions, ipcaFiveYearAverageQueryOptions } from "./queryOptions";
import { useAuth } from "./auth-provider";
import { useI18n } from "./i18n-provider";
import { useTransactions, recalculateHoldingFromTransactions, recalculateInvestingSinceFromTransactions, type Transaction } from "./transactions";
import { useFeatureGate } from "./useFeatureGate";
import { fetchValuedPortfolioFn } from "./api/portfolioBff.functions";

export interface ValuedWatchlistItem extends WatchlistItem {
  // Live computed fields
  livePrice: number; // Actual current price used (quote or fallback)
  // Overrides item.sector with meta.sector if available
  sector: string;
  valuation: ValuationResult;
  isClosedPosition: boolean;
  /**
   * True when valuedItems originated from the BFF server function (ADR-001).
   * Optional — defaults to false. Existing mocks in tests need not add this field.
   */
  isBffMode?: boolean;
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
// Client-side computation (legacy path, gate = false)
// ---------------------------------------------------------------------------

function useValuedPortfolioClientSide(
  items: WatchlistItem[],
  transactions: Transaction[],
  globalYield: number,
  isAppLoading: boolean,
  watchlistRest: ReturnType<typeof useWatchlist>,
) {
  const { t } = useI18n();

  const txByTicker = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const tx of transactions) {
      if (!map[tx.ticker]) map[tx.ticker] = [];
      map[tx.ticker].push(tx);
    }
    return map;
  }, [transactions]);

  const baseItems = useMemo(() => {
    return (items || []).map((it) => {
      const txs = txByTicker[it.ticker];
      let quantity = it.quantity;
      let averagePrice = it.averagePrice;
      let investingSince = it.investingSince;
      const hasTransactions = Boolean(txs && txs.length > 0);

      if (hasTransactions && txs) {
        const computed = recalculateHoldingFromTransactions(txs);
        quantity = computed.quantity;
        averagePrice = computed.averagePrice;
        const computedInvestingSince = recalculateInvestingSinceFromTransactions(txs);
        if (computedInvestingSince != null) {
          investingSince = Math.min(
            typeof it.investingSince === "number" && !isNaN(it.investingSince) && it.investingSince > 0
              ? it.investingSince
              : Infinity,
            computedInvestingSince
          );
        }
      }

      const isClosedPosition = hasTransactions && quantity === 0;

      return {
        ...it,
        quantity,
        averagePrice,
        investingSince,
        isClosedPosition,
        targetYield: it.targetYield ?? globalYield,
      };
    });
  }, [items, globalYield, txByTicker]);

  const { quotes, meta, dataUpdatedAt: lastUpdatedAt } = useLiveQuotesAndMeta(baseItems);
  const { data: selic } = useSelic();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const { data: macroRates } = useQuery(macroRatesQueryOptions());
  const { data: ipcaAvg } = useQuery(ipcaFiveYearAverageQueryOptions());

  const valuedItems = useMemo<ValuedWatchlistItem[]>(() => {
    return baseItems.map((it) => {
      const q = quotes[it.ticker];
      const m = meta[it.ticker];
      const livePrice = q?.price ?? it.currentPrice;
      const valuation = getAssetValuation({
        targetYield: it.targetYield,
        currentPrice: livePrice,
        avgDividend: m?.canonicalDividend3y ?? it.annualDividend,
        eps: m?.eps,
        bvps: calculateBvps(m?.bvps, m?.pbRatio, livePrice),
        dividendCagr: m?.dividendCagr5y,
        selicPct: selic ?? SELIC_FALLBACK,
        terminalGrowthRate: ipcaAvg ?? GORDON_TERMINAL_GROWTH_RATE,
        currency: it.currency,
        type: it.type,
      });

      return {
        ...it,
        annualDividend: m?.canonicalDividend3y ?? it.annualDividend,
        currentPrice: livePrice,
        livePrice,
        ceilingPrice: valuation.activeCeiling ?? 0,
        safetyMargin: valuation.margin ?? 0,
        sector: m?.sector || it.sector || t.common.other,
        valuation,
        isClosedPosition: it.isClosedPosition,
        isBffMode: false,
      };
    });
  }, [baseItems, quotes, meta, selic, ipcaAvg, t]);

  const totals = useMemo(
    () => computeTotals(valuedItems, fx, macroRates),
    [valuedItems, fx, macroRates],
  );

  return {
    ...watchlistRest,
    items,
    valuedItems,
    totals,
    quotes,
    meta,
    isAppLoading,
    lastUpdatedAt,
    macroRates,
    fx,
    selic,
    isBffMode: false,
  };
}

// ---------------------------------------------------------------------------
// BFF computation (ADR-001 path, gate = true)
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
      bazin: null, graham: null, gordon: null,
    },
    assumptions: (bffAny["assumptions"] as ValuationResult["assumptions"] | undefined) ?? [],
    investorProfile: (bffAny["investorProfile"] as ValuationResult["investorProfile"] | undefined) ?? "moderate",
    bazin: (bffAny["bazin"] as number | null | undefined) ?? null,
    graham: (bffAny["graham"] as number | null | undefined) ?? null,
    gordon: (bffAny["gordon"] as number | null | undefined) ?? null,
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
  globalYield: number,
  isAppLoading: boolean,
  watchlistRest: ReturnType<typeof useWatchlist>,
  useBff: boolean,
) {
  const { t } = useI18n();
  const { data: selic } = useSelic();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const { data: macroRates } = useQuery(macroRatesQueryOptions());
  const { data: ipcaAvg } = useQuery(ipcaFiveYearAverageQueryOptions());
  const { loading: isAuthLoading } = useAuth();

  const itemsWithYield = useMemo(
    () => items.map((it) => ({ ...it, targetYield: it.targetYield ?? globalYield })),
    [items, globalYield],
  );

  const bffQuery = useQuery({
    queryKey: ["bffPortfolio", itemsWithYield.map((i) => i.ticker).join(","), transactions.length],
    queryFn: () =>
      fetchValuedPortfolioFn({
        data: {
          uid: "",
          items: itemsWithYield,
          transactions,
          selicPct: selic ?? SELIC_FALLBACK,
          terminalGrowthRate: ipcaAvg ?? GORDON_TERMINAL_GROWTH_RATE,
          exchangeRate: fx?.USDBRL ?? EXCHANGE_RATE_FALLBACK,
        },
      }),
    enabled: useBff && !isAppLoading && !isAuthLoading && itemsWithYield.length > 0,
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
    quotes: {} as ReturnType<typeof useLiveQuotesAndMeta>["quotes"],
    meta: {} as ReturnType<typeof useLiveQuotesAndMeta>["meta"],
    isAppLoading: isAppLoading || bffQuery.isLoading,
    lastUpdatedAt: bffQuery.dataUpdatedAt ?? 0,
    macroRates,
    fx,
    selic,
    isBffMode: true,
  };
}

// ---------------------------------------------------------------------------
// Gate dispatcher — both hooks always run (Rules of Hooks compliance)
// ---------------------------------------------------------------------------

function useValuedPortfolioComputation() {
  const watchlistResult = useWatchlist();
  const { items, isPending: isWatchlistPending } = watchlistResult;
  const { transactions = [], isLoading: isTxLoading } = useTransactions();
  const { loading: isAuthLoading } = useAuth();
  const { targetYield: globalYield } = useSettings();
  const useBff = Boolean(useFeatureGate("USE_BFF_PORTFOLIO_VALUATION"));

  const isAppLoading = isAuthLoading || isWatchlistPending || isTxLoading;

  const clientResult = useValuedPortfolioClientSide(
    items ?? [],
    transactions,
    globalYield,
    isAppLoading,
    watchlistResult,
  );

  const bffResult = useValuedPortfolioBff(
    items ?? [],
    transactions,
    globalYield,
    isAppLoading,
    watchlistResult,
    useBff,
  );

  return useBff ? bffResult : clientResult;
}

type ValuedPortfolioValue = ReturnType<typeof useValuedPortfolioComputation>;

const ValuedPortfolioContext = createContext<ValuedPortfolioValue | null>(null);

/**
 * Fix #5 (auditoria 3.2): `useValuedPortfolio` registra listeners reais
 * (onSnapshot de `users/{uid}/assets` via useWatchlist e de `users/{uid}/
 * transactions`). Montá-lo 5× na home (`/app`) → ~10 listeners na mesma
 * coleção. React Query deduplica queries, NÃO listeners. Elevamos a uma
 * única instância via Provider no root; consumidores leem do contexto.
 *
 * O fallback para computação direta mantém o hook utilizável fora do
 * provider (testes, rotas isoladas) sem quebrar o comportamento atual.
 *
 * BFF mode (ADR-001): quando USE_BFF_PORTFOLIO_VALUATION = true no Firestore,
 * o hook usa fetchValuedPortfolioFn (TanStack Start server function) em vez
 * do merge client-side. O gate é false por default → zero regressão.
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
