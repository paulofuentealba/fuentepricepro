import { useEffect, useRef } from "react";
import { db } from "@/integrations/firebase/client";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "./auth-provider";

export interface PortfolioSnapshot {
  date: string; // ISO format YYYY-MM-DD
  totalValueBRL: number;
  totalInvestedBRL: number;
  createdAt: number;
}

const STORAGE_KEY_PREFIX = "fuente.snapshot.v1.";

/**
 * Hook to record periodic daily snapshots of portfolio value in Firestore.
 *
 * Path: users/{userId}/portfolioSnapshots/{YYYY-MM-DD}
 *
 * IDEMPOTENCY GUARANTEE:
 * 1. Uses fixed YYYY-MM-DD doc ID in Firestore, making setDoc 100% idempotent.
 * 2. Uses localStorage cache to avoid redundant network writes on the same day.
 */
export function usePortfolioSnapshot(totalValueBRL: number, totalInvestedBRL: number) {
  const { user } = useAuth();
  const hasAttemptedToday = useRef(false);

  useEffect(() => {
    if (!user?.uid || totalValueBRL <= 0 || hasAttemptedToday.current) {
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const localStorageKey = `${STORAGE_KEY_PREFIX}${todayStr}`;

    // Layer 1 network optimization: skip if already recorded in this browser today
    if (localStorage.getItem(localStorageKey) === "1") {
      hasAttemptedToday.current = true;
      return;
    }

    hasAttemptedToday.current = true;

    async function recordSnapshot() {
      try {
        const payload: PortfolioSnapshot = {
          date: todayStr,
          totalValueBRL: Math.round(totalValueBRL * 100) / 100,
          totalInvestedBRL: Math.round(totalInvestedBRL * 100) / 100,
          createdAt: Date.now(),
        };

        const docRef = doc(db, "users", user!.uid, "portfolioSnapshots", todayStr);
        await setDoc(docRef, payload, { merge: true });
        localStorage.setItem(localStorageKey, "1");
      } catch (err) {
        console.warn("[PortfolioSnapshot] Failed to write snapshot:", err);
      }
    }

    recordSnapshot();
  }, [user?.uid, totalValueBRL, totalInvestedBRL]);
}
