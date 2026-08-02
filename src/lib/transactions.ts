import { useEffect } from "react";
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

export interface Transaction {
  id: string;
  ticker: string;
  type: "buy" | "sell";
  date: number; // timestamp
  quantity: number;
  pricePerShare: number;
  fees?: number | null; // corretagem/taxas, a Receita manda incluir no custo
}

const STORAGE_KEY = "ceilingPricePro.transactions.v1";
const USE_LOCAL_ONLY = import.meta.env.DEV; // Local-only só no dev server (npm run dev); build de produção sempre usa Firestore automaticamente, sem depender de lembrar de trocar antes do commit

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

// ---------- Logic Functions ----------

/**
 * Calculates current quantity and average price purely from a list of transactions.
 * Assumes Brazilian Revenue rule:
 * - Weighted average for buys.
 * - Sells only reduce quantity, do not affect average price.
 * - Fees on buys are added to the cost basis.
 */
export function recalculateHoldingFromTransactions(transactions: Transaction[]): { quantity: number; averagePrice: number } {
  const sorted = [...transactions].sort((a, b) => a.date - b.date);

  let quantity = 0;
  let averagePrice = 0;

  for (const tx of sorted) {
    if (tx.type === "buy") {
      const currentTotalCost = averagePrice * quantity;
      const txCost = (tx.pricePerShare * tx.quantity) + (tx.fees || 0);
      quantity += tx.quantity;
      if (quantity > 0) {
        averagePrice = (currentTotalCost + txCost) / quantity;
      }
    } else if (tx.type === "sell") {
      quantity -= tx.quantity;
      if (quantity <= 0) {
        quantity = 0;
        averagePrice = 0; // Reset average price when position is fully closed
      }
    }
  }

  return { quantity, averagePrice };
}

/**
 * Returns the quantity of an asset held at a specific point in time in the past.
 */
export function getQuantityAtDate(transactions: Transaction[], date: number): number {
  const pastTx = transactions.filter((tx) => tx.date <= date);
  const sorted = [...pastTx].sort((a, b) => a.date - b.date);

  let quantity = 0;
  for (const tx of sorted) {
    if (tx.type === "buy") {
      quantity += tx.quantity;
    } else if (tx.type === "sell") {
      quantity -= tx.quantity;
      if (quantity < 0) quantity = 0;
    }
  }

  return quantity;
}

// ---------- Local storage helpers (guest mode) ----------
function readLocal(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("Failed to read local transactions", e);
    return [];
  }
}

function writeLocal(items: Transaction[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to write local transactions", e);
  }
}

function clearLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// ---------- Firestore conversions ----------
function rowToItem(row: any): Transaction {
  return {
    id: row.id,
    ticker: row.ticker,
    type: row.type,
    date: typeof row.date === "number" ? row.date : 0,
    quantity: typeof row.quantity === "number" ? row.quantity : 0,
    pricePerShare: typeof row.pricePerShare === "number" ? row.pricePerShare : 0,
    fees: row.fees ?? null,
  };
}

function itemToRow(item: Transaction, userId: string) {
  return {
    ...item,
    user_id: userId,
  };
}

// ---------- React Query Hook ----------
export function useTransactions() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const queryKey = ["transactions", user?.uid ?? "local"];

  // 1. Fetch
  const { data = [], isLoading } = useQuery<Transaction[]>({
    queryKey,
    queryFn: async () => {
      if (USE_LOCAL_ONLY || !user) {
        return readLocal();
      }

      // Migrate local transactions to Firestore on first cloud load for this user
      // (mirrors the same pattern already used in watchlist.ts)
      const local = readLocal();
      if (local.length > 0) {
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
