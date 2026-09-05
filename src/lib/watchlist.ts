import { useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "./auth-provider";
import { useI18n } from "./i18n-provider";
import type { AssetType, Currency } from "./domain";
import { assetQueryOptions } from "./queryOptions";
import { cleanTicker } from "./formatters";
import { WATCHLIST_STORAGE_KEY } from "./localStorageKeys";
import { blockWriteInDemoMode } from "./demoMode";
import { DEV_MOCK_DATA } from "@/__fixtures__/devMockData";

const STORAGE_KEY = WATCHLIST_STORAGE_KEY;
const ONBOARDED_KEY = "ceilingPricePro.onboarded.v1";
const USE_LOCAL_ONLY = import.meta.env.DEV; // Local-only só no dev server (npm run dev); build de produção sempre usa Firestore automaticamente, sem depender de lembrar de trocar antes do commit

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  type: AssetType;
  currency: Currency;
  currentPrice: number;
  /** Projected annual dividend per share (3y avg). */
  annualDividend: number;
  targetYield: number;
  ceilingPrice: number;
  safetyMargin: number;
  quantity: number;
  averagePrice: number | null;
  /** Months (1-12) the asset historically pays dividends. Empty if unknown. */
  paymentMonths: number[];
  /** Optional per-asset monthly income goal (Goal Planner). */
  targetMonthlyIncome?: number | null;
  /** Payout ratio to detect dividend traps. */
  payoutRatio: number | null;
  /** Custom tax rate (percentage) to deduct from yields. */
  customTaxRate?: number | null;
  /** Economic sector for diversification. */
  sector?: string | null;
  /** History of applied corporate events to prevent double-applying. */
  appliedEvents?: { eventId: string; date: number; type: string; ratio: number }[];
  indexer?: string | null;
  rate?: number | null;
  maturityDate?: string | null;
  startDate?: string | null;
  /**
   * When `type === "ETF"`, marks this ETF as fixed-income (e.g. LFTS11, IMAB11, B5P211)
   * rather than equity (e.g. BOVA11, IVVB11). Drives which capital-gains tax module applies:
   * equity ETFs use `br/etfCapitalGains.ts` (15% flat), fixed-income ETFs use
   * `br/etfFixedIncomeCapitalGains.ts` (regressive table). Undefined/false = equity ETF.
   */
  isFixedIncomeEtf?: boolean | null;
  addedAt: number;
  /** When the user originally started investing in this asset. */
  investingSince: number;
  /** Custody institution (free text; suggestions come from src/lib/brokers.ts). Null/undefined
   * for positions created before this field existed, or never assigned one manually. */
  broker?: string | null;
}

export function makeId(ticker: string, type: AssetType) {
  return `${type}:${ticker.toUpperCase()}`;
}

async function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("A operação demorou muito. Verifique sua conexão ou permissões."));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// ---------- Local storage helpers (guest mode) ----------
function readLocal(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Auto-heal NaNs that might have been saved as null during JSON.stringify
    // or loaded from corrupted state.
    return parsed.map((item: any) => {
      const clean = cleanTicker(item.ticker);
      const isUsdType = item.type === "STOCK_US" || item.type === "REIT";
      const isBdrOrB3 = clean.endsWith("34") || clean.endsWith("35") || clean.endsWith(".SA");
      const currency: Currency =
        item.currency || (isUsdType && !isBdrOrB3 ? "USD" : "BRL");

      return {
        ...item,
        ticker: clean,
        currency,
        currentPrice:
          typeof item.currentPrice === "number" && !isNaN(item.currentPrice) ? item.currentPrice : 0,
        annualDividend:
          typeof item.annualDividend === "number" && !isNaN(item.annualDividend)
            ? item.annualDividend
            : 0,
        targetYield:
          typeof item.targetYield === "number" && !isNaN(item.targetYield) ? item.targetYield : 6,
        ceilingPrice:
          typeof item.ceilingPrice === "number" && !isNaN(item.ceilingPrice) ? item.ceilingPrice : 0,
        safetyMargin:
          typeof item.safetyMargin === "number" && !isNaN(item.safetyMargin) ? item.safetyMargin : 0,
        quantity: typeof item.quantity === "number" && !isNaN(item.quantity) ? item.quantity : 0,
        averagePrice:
          typeof item.averagePrice === "number" && !isNaN(item.averagePrice)
            ? item.averagePrice
            : null,
        targetMonthlyIncome:
          typeof item.targetMonthlyIncome === "number" && !isNaN(item.targetMonthlyIncome)
            ? item.targetMonthlyIncome
            : null,
        payoutRatio:
          typeof item.payoutRatio === "number" && !isNaN(item.payoutRatio) ? item.payoutRatio : null,
        customTaxRate:
          typeof item.customTaxRate === "number" && !isNaN(item.customTaxRate)
            ? item.customTaxRate
            : null,
        indexer: item.indexer ?? null,
        rate: typeof item.rate === "number" && !isNaN(item.rate) ? item.rate : null,
        maturityDate: item.maturityDate ?? null,
        startDate: item.startDate ?? null,
        investingSince:
          typeof item.investingSince === "number" && !isNaN(item.investingSince)
            ? item.investingSince
            : item.addedAt,
        broker:
          item.broker?.trim() ||
          DEV_MOCK_DATA.find((m) => m.ticker === clean)?.broker ||
          null,
      };
    }) as WatchlistItem[];
  } catch {
    return [];
  }
}

function writeLocal(items: WatchlistItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function clearLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// ---------- Row mapping ----------
interface Row {
  id: string;
  user_id: string;
  ticker: string;
  name: string;
  type: string;
  currency?: string;
  current_price: number;
  annual_dividend: number;
  target_yield: number;
  ceiling_price: number;
  safety_margin: number;
  quantity: number;
  average_price: number | null;
  payment_months: number[];
  target_monthly_income?: number | null;
  payout_ratio?: number | null;
  custom_tax_rate?: number | null;
  sector?: string | null;
  applied_events?: any[] | null;
  indexer?: string | null;
  rate?: number | string | null;
  maturity_date?: string | null;
  start_date?: string | null;
  added_at: string;
  investing_since?: string | null;
  broker?: string | null;
}

function rowToItem(r: Row): WatchlistItem {
  const safeNumber = (val: any, fallback: number = 0) => {
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  };

  const safeNullableNumber = (val: any) => {
    if (val == null) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const clean = cleanTicker(r.ticker);
  const isUsdType = r.type === "STOCK_US" || r.type === "REIT";
  const isBdrOrB3 = clean.endsWith("34") || clean.endsWith("35") || clean.endsWith(".SA");
  const currency: Currency =
    (r.currency as Currency) ||
    (isUsdType && !isBdrOrB3 ? "USD" : "BRL");

  return {
    id: makeId(r.ticker, r.type as AssetType),
    ticker: clean,
    name: r.name,
    type: r.type as AssetType,
    currency,
    currentPrice: safeNumber(r.current_price, 0),
    annualDividend: safeNumber(r.annual_dividend, 0),
    targetYield: safeNumber(r.target_yield, 6),
    ceilingPrice: safeNumber(r.ceiling_price, 0),
    safetyMargin: safeNumber(r.safety_margin, 0),
    quantity: safeNumber(r.quantity, 0),
    averagePrice: safeNullableNumber(r.average_price),
    paymentMonths: Array.isArray(r.payment_months)
      ? r.payment_months.filter((m) => Number.isFinite(m) && !isNaN(m))
      : [],
    targetMonthlyIncome: safeNullableNumber(r.target_monthly_income),
    payoutRatio: safeNullableNumber(r.payout_ratio),
    customTaxRate: safeNullableNumber(r.custom_tax_rate),
    sector: r.sector ?? null,
    appliedEvents: Array.isArray(r.applied_events) ? r.applied_events : [],
    indexer: r.indexer ?? null,
    rate: safeNullableNumber(r.rate),
    maturityDate: r.maturity_date ?? null,
    startDate: r.start_date ?? null,
    addedAt: safeNumber(new Date(r.added_at).getTime(), Date.now()),
    investingSince: r.investing_since ? safeNumber(new Date(r.investing_since).getTime(), safeNumber(new Date(r.added_at).getTime(), Date.now())) : safeNumber(new Date(r.added_at).getTime(), Date.now()),
    broker: r.broker ?? null,
  };
}

function safeToISOString(val: any, fallbackMs: number = Date.now()): string {
  if (val == null) {
    return new Date(fallbackMs).toISOString();
  }
  if (typeof val === "object" && typeof val.toDate === "function") {
    try {
      const d = val.toDate();
      if (!isNaN(d.getTime())) return d.toISOString();
    } catch {}
  }
  if (typeof val === "object" && typeof val.seconds === "number") {
    const d = new Date(val.seconds * 1000);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }
  return new Date(fallbackMs).toISOString();
}

function itemToRow(item: WatchlistItem, userId: string): Row {
  return {
    id: item.id,
    user_id: userId,
    ticker: item.ticker,
    name: item.name,
    type: item.type,
    currency: item.currency,
    current_price: item.currentPrice,
    annual_dividend: item.annualDividend,
    target_yield: item.targetYield,
    ceiling_price: item.ceilingPrice,
    safety_margin: item.safetyMargin,
    quantity: item.quantity,
    average_price: item.averagePrice,
    payment_months: item.paymentMonths ?? [],
    target_monthly_income: item.targetMonthlyIncome ?? null,
    payout_ratio: item.payoutRatio ?? null,
    custom_tax_rate: item.customTaxRate ?? null,
    sector: item.sector ?? null,
    applied_events: item.appliedEvents ?? [],
    indexer: item.indexer ?? null,
    rate: item.rate ?? null,
    maturity_date: item.maturityDate ?? null,
    start_date: item.startDate ?? null,
    added_at: safeToISOString(item.addedAt, Date.now()),
    investing_since: safeToISOString(item.investingSince ?? item.addedAt, Date.now()),
    broker: item.broker ?? null,
  };
}

// ---------- Seeding Logic Removed ----------
export function useWatchlist() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? null;

  const queryKey = useMemo(() => ["watchlist", userId], [userId]);

  const { data: items = [], isPending } = useQuery({
    queryKey,
    queryFn: async () => {
      let data: WatchlistItem[] = [];
      const hasOnboarded = window.localStorage.getItem(ONBOARDED_KEY) === "true";

      if (userId && !USE_LOCAL_ONLY) {
        // Migrate local items on first cloud load
        const local = readLocal();
        if (local.length > 0) {
          try {
            const batch = writeBatch(db);
            const rows = local.map((i) => itemToRow(i, userId));
            rows.forEach((r) => {
              const ref = doc(db, "users", userId, "assets", `${r.type}_${r.ticker}`);
              batch.set(ref, r, { merge: true });
            });
            await batch.commit();
            clearLocal();
            window.localStorage.setItem(ONBOARDED_KEY, "true");
          } catch (e) {
            console.error("[watchlist] migration error", e);
          }
        }

        // Load from cloud
        try {
          const q = collection(db, "users", userId, "assets");
          const snap = await getDocs(q);
          const rows = snap.docs.map((d) => d.data() as Row);
          rows.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
          data = rows.map(rowToItem);

          if (data.length === 0 && !hasOnboarded) {
            window.localStorage.setItem(ONBOARDED_KEY, "true");
          }
        } catch (error) {
          console.error("[watchlist] load failed", error);
        }
      } else {
        // Guest mode
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw && !hasOnboarded) {
          window.localStorage.setItem(ONBOARDED_KEY, "true");
        } else {
          data = readLocal();
        }
      }
      return data;
    },
    staleTime: Infinity,
  });

  // Realtime Sync (onSnapshot)
  useEffect(() => {
    if (!userId || USE_LOCAL_ONLY) return;
    const q = collection(db, "users", userId, "assets");
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => d.data() as Row);
        rows.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
        queryClient.setQueryData(queryKey, rows.map(rowToItem));
      },
      (error) => {
        console.error("[watchlist] realtime sync failed", error);
        toast.error(t.errors.syncFailedPrefix + error.message);
      },
    );
    return () => unsubscribe();
  }, [userId, queryClient, queryKey]);

  // Heal payment months effect
  const healAttempted = useRef(new Set<string>());
  useEffect(() => {
    if (items.length === 0) return;

    let isMounted = true;
    const stale = items.filter(
      (i) =>
        (!Array.isArray(i.paymentMonths) || i.paymentMonths.length === 0) &&
        !healAttempted.current.has(i.ticker),
    );

    if (stale.length === 0) return;

    // Add them synchronously so subsequent rapid renders don't duplicate heal efforts!
    stale.forEach((item) => healAttempted.current.add(item.ticker));

    const heal = async () => {
      const patches = new Map<string, number[]>();
      for (const item of stale) {
        try {
          const fresh = await queryClient.ensureQueryData(assetQueryOptions(item.ticker));
          if (fresh?.paymentMonths?.length) {
            patches.set(item.id, fresh.paymentMonths);
          }
        } catch (err) {
          // Expected for tickers with no dividend/payment-schedule data available from the
          // providers (e.g. fixed income ETFs like IMAB11) — not a bug, so debug-only.
          console.debug("[watchlist] heal skipped (no data) for", item.ticker);
        }
      }

      if (patches.size > 0 && isMounted) {
        const next = items.map((i) =>
          patches.has(i.id) ? { ...i, paymentMonths: patches.get(i.id)! } : i,
        );
        if (userId && !USE_LOCAL_ONLY) {
          const rows = next.filter((i) => patches.has(i.id)).map((i) => itemToRow(i, userId));
          try {
            const chunkSize = 400;
            for (let i = 0; i < rows.length; i += chunkSize) {
              const chunk = rows.slice(i, i + chunkSize);
              const batch = writeBatch(db);
              chunk.forEach((r) => {
                const ref = doc(db, "users", userId, "assets", `${r.type}_${r.ticker}`);
                batch.set(ref, r, { merge: true });
              });
              await batch.commit();
            }
          } catch (e) {
            console.error("[watchlist] heal persist failed", e);
          }
        } else {
          writeLocal(next);
        }
        queryClient.setQueryData(queryKey, next);
      }
    };
    void heal();
    return () => {
      isMounted = false;
    };
  }, [items, userId, queryClient, queryKey]);

  // Sync with cross-tab local storage
  useEffect(() => {
    if (userId && !USE_LOCAL_ONLY) return; // Only guest mode needs cross-tab storage sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        queryClient.setQueryData(queryKey, readLocal());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [userId, queryClient, queryKey]);

  const upsertMutation = useMutation({
    mutationFn: async (item: WatchlistItem) => {
      if (blockWriteInDemoMode()) throw new Error("Demo mode: sign in required to save");
      if (userId && !USE_LOCAL_ONLY) {
        if (!userId) throw new Error("Usuário não autenticado");
        try {
          const row = itemToRow(item, userId);
          const ref = doc(db, "users", userId, "assets", `${row.type}_${row.ticker}`);
          await withTimeout(setDoc(ref, row, { merge: true }));
        } catch (error: any) {
          console.error("[watchlist] error saving item:", error);
          toast.error(`${t.errors.saveAssetFailedPrefix}: ${error.message}`);
          throw error;
        }
      } else {
        const list = [...(queryClient.getQueryData<WatchlistItem[]>(queryKey) || [])];
        const idx = list.findIndex((i) => i.id === item.id);
        if (idx >= 0) list[idx] = item;
        else list.unshift(item);
        writeLocal(list);
      }
      return item;
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<WatchlistItem[]>(queryKey);
      const list = prev ? [...prev] : [];
      const idx = list.findIndex((i) => i.id === newItem.id);
      if (idx >= 0) list[idx] = newItem;
      else list.unshift(newItem);
      queryClient.setQueryData(queryKey, list);
      return { prev };
    },
    onError: (error: any, __, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSuccess: () => {
      toast.success(t.toasts.assetSaved);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (blockWriteInDemoMode()) throw new Error("Demo mode: sign in required to save");
      if (userId && !USE_LOCAL_ONLY) {
        if (!userId) throw new Error("Usuário não autenticado");
        try {
          const target = items.find((i) => i.id === id);
          if (target) {
            const ref = doc(db, "users", userId, "assets", `${target.type}_${target.ticker}`);
            await withTimeout(deleteDoc(ref));
          }
        } catch (error: any) {
          console.error("[watchlist] error removing item:", error);
          toast.error(`${t.errors.deleteAssetFailedPrefix}: ${error.message}`);
          throw error;
        }
      } else {
        writeLocal(items.filter((i) => i.id !== id));
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<WatchlistItem[]>(queryKey);
      if (prev)
        queryClient.setQueryData(
          queryKey,
          prev.filter((i) => i.id !== id),
        );
      return { prev };
    },
    onError: (error: any, __, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSuccess: () => {
      toast.success(t.toasts.assetRemoved);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (blockWriteInDemoMode()) throw new Error("Demo mode: sign in required to save");
      if (userId && !USE_LOCAL_ONLY) {
        if (!userId) throw new Error("Usuário não autenticado");
        try {
          const chunkSize = 400;
          for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach((item) => {
              const row = itemToRow(item, userId);
              const ref = doc(db, "users", userId, "assets", `${row.type}_${row.ticker}`);
              batch.delete(ref);
            });
            await batch.commit();
          }
        } catch (error: any) {
          console.error("[watchlist] error clearing items:", error);
          toast.error(`${t.errors.clearAssetsFailedPrefix}: ${error.message}`);
          throw error;
        }
      } else {
        clearLocal();
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<WatchlistItem[]>(queryKey);
      queryClient.setQueryData(queryKey, []);
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSuccess: () => {
      toast.success(t.toasts.watchlistCleared);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const upsertManyMutation = useMutation({
    mutationFn: async (newItems: WatchlistItem[]) => {
      if (blockWriteInDemoMode()) throw new Error("Demo mode: sign in required to save");
      if (userId && !USE_LOCAL_ONLY) {
        if (!userId) throw new Error("Usuário não autenticado");
        try {
          const chunkSize = 400;
          for (let i = 0; i < newItems.length; i += chunkSize) {
            const chunk = newItems.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach((item) => {
              const row = itemToRow(item, userId);
              const ref = doc(db, "users", userId, "assets", `${row.type}_${row.ticker}`);
              batch.set(ref, row, { merge: true });
            });
            const commitPromise = batch.commit();
            const timeoutPromise = new Promise((resolve) =>
              setTimeout(() => {
                resolve(null);
              }, 5000),
            );
            await Promise.race([commitPromise, timeoutPromise]);
          }
        } catch (error: any) {
          console.error("[watchlist] error saving batch:", error);
          toast.error(`${t.errors.saveBatchFailedPrefix}: ${error.message}`);
          throw error;
        }
      } else {
        const list = [...(queryClient.getQueryData<WatchlistItem[]>(queryKey) || [])];
        newItems.forEach((item) => {
          const idx = list.findIndex((i) => i.id === item.id);
          if (idx >= 0) list[idx] = item;
          else list.unshift(item);
        });
        writeLocal(list);
      }
      return newItems;
    },
    onMutate: async (newItems) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<WatchlistItem[]>(queryKey);

      // OPTIMISTIC UPDATE
      const list = prev ? [...prev] : [];
      newItems.forEach((item) => {
        const idx = list.findIndex((i) => i.id === item.id);
        if (idx >= 0) list[idx] = item;
        else list.unshift(item);
      });
      queryClient.setQueryData(queryKey, list);

      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<WatchlistItem> }) => {
      if (blockWriteInDemoMode()) throw new Error("Demo mode: sign in required to save");
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new Error("Item not found");
      const merged = { ...existing, ...patch };

      if (userId) {
        if (!userId) throw new Error("Usuário não autenticado");
        try {
          const row = itemToRow(merged, userId);
          const ref = doc(db, "users", userId, "assets", `${row.type}_${row.ticker}`);
          await withTimeout(setDoc(ref, row, { merge: true }));
        } catch (error: any) {
          console.error("[watchlist] error updating item:", error);
          toast.error(`${t.errors.updateAssetFailedPrefix}: ${error.message}`);
          throw error;
        }
      } else {
        const list = [...(queryClient.getQueryData<WatchlistItem[]>(queryKey) || [])];
        const idx = list.findIndex((i) => i.id === id);
        if (idx >= 0) list[idx] = merged;
        writeLocal(list);
      }
      return merged;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<WatchlistItem[]>(queryKey);
      if (prev) {
        queryClient.setQueryData(
          queryKey,
          prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        );
      }
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const upsert = useCallback(
    (item: WatchlistItem) => upsertMutation.mutate(item),
    [upsertMutation],
  );
  const upsertAsync = useCallback(
    (item: WatchlistItem) => upsertMutation.mutateAsync(item),
    [upsertMutation],
  );
  const upsertManyAsync = useCallback(
    (items: WatchlistItem[]) => upsertManyMutation.mutateAsync(items),
    [upsertManyMutation],
  );
  const remove = useCallback((id: string) => removeMutation.mutate(id), [removeMutation]);
  const update = useCallback(
    (id: string, patch: Partial<WatchlistItem>) => updateMutation.mutate({ id, patch }),
    [updateMutation],
  );
  const updateAsync = useCallback(
    (id: string, patch: Partial<WatchlistItem>) => updateMutation.mutateAsync({ id, patch }),
    [updateMutation],
  );

  return { items: items || [], isPending, upsert, upsertAsync, upsertManyAsync, remove, update, updateAsync };
}
