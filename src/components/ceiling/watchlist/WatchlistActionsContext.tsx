import { createContext, useContext, ReactNode } from "react";
import type { LiveQuote, SearchHit } from "@/lib/apiService.server";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";

interface WatchlistActionsContextValue {
  quotes: Record<string, LiveQuote | null>;
  meta: Record<string, any>;
  onRemove?: (id: string) => void;
  onOpenDetail?: (item: ValuedWatchlistItem, initialTab?: "myPosition") => void;
  concentrationViolators?: Set<string>;
}

const WatchlistActionsContext = createContext<WatchlistActionsContextValue | null>(null);

export function WatchlistActionsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WatchlistActionsContextValue;
}) {
  return (
    <WatchlistActionsContext.Provider value={value}>
      {children}
    </WatchlistActionsContext.Provider>
  );
}

export function useWatchlistActions() {
  return useContext(WatchlistActionsContext);
}
