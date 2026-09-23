import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "./auth-provider";
import { useI18n } from "./i18n-provider";
import { type Transaction } from "./transactionsLogic";
export * from "./transactionsLogic";
import { TRANSACTIONS_STORAGE_KEY } from "./localStorageKeys";
import { blockWriteInDemoMode, isDemoModeActive, isDemoStorage, isDemoTransactions, endDemoMode } from "./demoMode";

const STORAGE_KEY = TRANSACTIONS_STORAGE_KEY;
const USE_LOCAL_ONLY = import.meta.env.DEV; // Local-only só no dev server (npm run dev); build de produção sempre usa Firestore automaticamente, sem depender de lembrar de trocar antes do commit

async function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("A operação demorou muito. Verifique sua conexão ou permissões."));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

import { cleanTicker } from "./formatters";

// ---------- Local storage helpers (guest mode) ----------
function readLocal(): Transaction[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => rowToItem(item as Record<string, unknown>));
  } catch (e) {
    console.error("Failed to read local transactions", e);
    return [];
  }
}

function writeLocal(items: Transaction[]) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to write local transactions", e);
  }
}

function clearLocal() {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// ---------- Firestore conversions ----------
export function rowToItem(row: Record<string, unknown>): Transaction {
  return {
    id: (row.id as string) || "",
    ticker: cleanTicker((row.ticker as string) || ""),
    type: (row.type as Transaction["type"]) || "buy",
    date: typeof row.date === "number" ? row.date : 0,
    quantity: typeof row.quantity === "number" ? row.quantity : 0,
    pricePerShare: typeof row.pricePerShare === "number" ? row.pricePerShare : 0,
    factor: typeof row.factor === "number" ? row.factor : null,
    fees: typeof row.fees === "number" ? row.fees : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    broker: typeof row.broker === "string" ? row.broker : null,
    thesisSnapshot: (row.thesisSnapshot as Transaction["thesisSnapshot"] | undefined) ?? null,
    accountType: (row.accountType as Transaction["accountType"] | undefined) ?? null,
  };
}

export function itemToRow(item: Transaction, userId: string): Record<string, unknown> {
  return {
    id: item.id,
    user_id: userId,
    ticker: cleanTicker(item.ticker),
    type: item.type,
    date: typeof item.date === "number" ? item.date : Date.now(),
    quantity: typeof item.quantity === "number" ? item.quantity : 0,
    pricePerShare: typeof item.pricePerShare === "number" ? item.pricePerShare : 0,
    factor: item.factor ?? null,
    fees: item.fees ?? null,
    notes: item.notes ?? null,
    broker: item.broker ?? null,
    thesisSnapshot: item.thesisSnapshot ?? null,
    accountType: item.accountType ?? null,
  };
}

// ---------- React Query Hook ----------
export function useTransactions() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  // Fix #5 (auditoria 3.1): a key era criada inline (identidade nova a cada
  // render) e era dependência do useEffect do onSnapshot → cada snapshot
  // re-renderizava, o efeito re-executava (unsubscribe + nova assinatura) e
  // o loop se autossustentava. Memoizada como já é feito em useWatchlist.
  const queryKey = useMemo(() => ["transactions", user?.uid ?? "local"], [user?.uid]);

  // 1. Fetch
  const { data = [], isLoading } = useQuery<Transaction[]>({
    queryKey,
    queryFn: async () => {
      if (USE_LOCAL_ONLY || !user) {
        return readLocal();
      }

      // Guard: NEVER migrate demo transactions to Firestore!
      const isDemo = isDemoModeActive() || isDemoStorage();
      if (isDemo) {
        console.warn("[transactions] Demo mode detected during cloud load — discarding local demo transactions without migrating to Firestore");
        clearLocal();
        endDemoMode();
      } else {
        const local = readLocal();
        if (local.length > 0) {
          if (isDemoTransactions(local)) {
            console.warn("[transactions] Demo transactions payload detected — discarding without migrating to Firestore");
            clearLocal();
            endDemoMode();
          } else {
            try {
              const batch = writeBatch(db);
              local.forEach((item) => {
                const ref = doc(db, "users", user.uid, "transactions", item.id);
                batch.set(ref, itemToRow(item, user.uid), { merge: true });
              });
              await batch.commit();
              clearLocal();
            } catch (e) {
              console.error("[transactions] migration error", e);
            }
          }
        }
      }

      const ref = collection(db, "users", user.uid, "transactions");
      const q = query(ref);
      const snap = await withTimeout(getDocs(q));
      return snap.docs.map((d) => rowToItem({ id: d.id, ...d.data() }));
    },
    staleTime: Infinity,
  });

  // 2. Real-time Subscription
  useEffect(() => {
    if (USE_LOCAL_ONLY || !user) return;
    const ref = collection(db, "users", user.uid, "transactions");
    const q = query(ref);

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => rowToItem({ id: d.id, ...d.data() }));
        queryClient.setQueryData(queryKey, items);
      },
      (error) => {
        console.error("Transactions realtime error:", error);
      }
    );

    return () => unsubscribe();
  }, [user, queryClient, queryKey]);

  // 3. Upsert Mutation
  const upsert = useMutation({
    mutationFn: async (item: Transaction) => {
      if (USE_LOCAL_ONLY || !user) {
        if (blockWriteInDemoMode()) throw new Error("Demo mode: sign in required to save");
        const current = readLocal();
        const existingIdx = current.findIndex((it) => it.id === item.id);
        const next = [...current];
        if (existingIdx >= 0) {
          next[existingIdx] = item;
        } else {
          next.push(item);
        }
        writeLocal(next);
        return item;
      }

      const docRef = doc(db, "users", user.uid, "transactions", item.id);
      await withTimeout(setDoc(docRef, itemToRow(item, user.uid)));
      return item;
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<Transaction[]>(queryKey, (old = []) => {
        const existingIdx = old.findIndex((it) => it.id === newItem.id);
        if (existingIdx >= 0) {
          const next = [...old];
          next[existingIdx] = newItem;
          return next;
        }
        return [...old, newItem];
      });
    },
    onError: (error) => {
      toast.error(t.errors.saveTransactionFailed);
      console.error(error);
    },
  });

  // 4. Remove Mutation
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (USE_LOCAL_ONLY || !user) {
        if (blockWriteInDemoMode()) throw new Error("Demo mode: sign in required to save");
        const current = readLocal();
        writeLocal(current.filter((it) => it.id !== id));
        return id;
      }

      const docRef = doc(db, "users", user.uid, "transactions", id);
      await withTimeout(deleteDoc(docRef));
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Transaction[]>(queryKey, (old = []) => {
        return old.filter((it) => it.id !== deletedId);
      });
    },
    onError: (error) => {
      toast.error(t.errors.deleteTransactionFailed);
      console.error(error);
    },
  });

  return {
    transactions: data,
    isLoading,
    upsert: upsert.mutateAsync,
    remove: remove.mutateAsync,
  };
}
