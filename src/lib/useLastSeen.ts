import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "fpp_last_seen_";

/**
 * Per-viewer "last visited" timestamp for a named section, persisted in localStorage — same
 * pattern as the sidebar's own collapse-state persistence (fpp_sidebar_collapsed). Used to
 * derive real "what's new since you last checked" indicators (e.g. the Sidebar's nav badges)
 * without inventing a fake unread count: it's always computed from data the user actually has.
 */
export function useLastSeen(key: string) {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        setLastSeen(localStorage.getItem(storageKey));
      }
    } catch {
      // Ignore storage access errors
    }
  }, [storageKey]);

  const markSeenNow = useCallback(() => {
    const nowISO = new Date().toISOString();
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        localStorage.setItem(storageKey, nowISO);
      }
    } catch {
      // Ignore storage access errors
    }
    setLastSeen(nowISO);
  }, [storageKey]);

  return { lastSeen, isMounted, markSeenNow };
}
