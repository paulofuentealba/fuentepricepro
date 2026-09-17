import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWatchlist, type WatchlistItem } from "./watchlist";
import { useTransactions } from "./transactions";
import { useI18n } from "./i18n-provider";
import {
  calculateCorporateEventImpact,
  type ProcessedPosition,
} from "./corporateEvents";
import { fetchCorporateEventsBatchFn } from "./apiService.functions";
import type { ReconciledCorporateEvent } from "./api/corporateEventsReconciler.server";
import { cleanTicker } from "./formatters";
import { toast } from "sonner";

export interface PendingPortfolioEvent {
  event: ReconciledCorporateEvent;
  item: WatchlistItem;
  preview: ProcessedPosition;
  factor: number;
  deltaQuantity: number;
  priceVariationPct: number;
  displayRatioText: string;
  eligibleQuantity?: number;
}

export function formatRatioDisplay(type: "split" | "grouping", ratio: number): string {
  if (type === "split") {
    const cleanRatio = ratio.toFixed(2).replace(/\.?0+$/, "");
    return `1:${cleanRatio}`;
  } else {
    const cleanRatio = (1 / ratio).toFixed(2).replace(/\.?0+$/, "");
    return `${cleanRatio}:1`;
  }
}

export function usePortfolioCorporateEvents() {
  const { items, upsertAsync } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [applyingEventId, setApplyingEventId] = useState<string | null>(null);

  const ownedItems = useMemo(() => {
    return items.filter((item) => (item.quantity ?? 0) > 0);
  }, [items]);

  const tickers = useMemo(() => {
    return ownedItems.map((it) => it.ticker.toUpperCase());
  }, [ownedItems]);

  const queryKey = useMemo(() => ["corporateEventsBatch", tickers.sort().join(",")], [tickers]);

  const { data: eventsByTicker, isPending: isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (tickers.length === 0) return {};
      return fetchCorporateEventsBatchFn({ data: { tickers } });
    },
    enabled: tickers.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });

  const pendingEvents: PendingPortfolioEvent[] = useMemo(() => {
    if (!eventsByTicker || ownedItems.length === 0) return [];
    const list: PendingPortfolioEvent[] = [];

    for (const item of ownedItems) {
      const tickerEvents = eventsByTicker[item.ticker.toUpperCase()] || [];
      const appliedIds = new Set(item.appliedEvents?.map((e) => e.eventId) ?? []);

      for (const ev of tickerEvents) {
        if (appliedIds.has(ev.eventId)) continue;

        const factor = ev.ratio;
        const impact = calculateCorporateEventImpact(
          item,
          { date: ev.date, type: ev.type, factor },
          transactions,
          item.currentPrice,
        );

        if (!impact.isApplicable) continue;

        list.push({
          event: ev,
          item,
          preview: impact.preview,
          factor,
          deltaQuantity: impact.deltaQuantity,
          priceVariationPct: impact.priceVariationPct,
          displayRatioText: formatRatioDisplay(ev.type, ev.ratio),
          eligibleQuantity: impact.eligibleQuantity,
        });
      }
    }

    return list.sort((a, b) => b.event.date - a.event.date);
  }, [eventsByTicker, ownedItems, transactions]);

  const applyEvent = async (pending: PendingPortfolioEvent) => {
    if (applyingEventId) return;
    setApplyingEventId(pending.event.eventId);

    try {
      const { item, event, factor } = pending;
      const impact = calculateCorporateEventImpact(
        item,
        { date: event.date, type: event.type, factor },
        transactions,
        item.currentPrice,
      );
      const newAppliedEvents = [...(item.appliedEvents || [])];

      newAppliedEvents.push({
        eventId: event.eventId,
        date: event.date,
        type: event.type,
        ratio: event.ratio,
      });

      const updatedItem: WatchlistItem = {
        ...item,
        quantity: impact.newQuantity,
        averagePrice: impact.newAveragePrice,
        appliedEvents: newAppliedEvents,
      };

      const hasLedger = transactions.some((tx) => cleanTicker(tx.ticker) === cleanTicker(item.ticker));
      if (hasLedger) {
        await upsertTransaction({
          id: `corp-${event.eventId}`,
          ticker: cleanTicker(item.ticker),
          type: "corporate_action",
          date: event.date,
          quantity: 0,
          pricePerShare: 0,
          factor,
          notes: t.transactions.corporateAction,
          fees: null,
          broker: null,
          thesisSnapshot: null,
          accountType: item.accountType ?? null,
        });
      }

      await upsertAsync(updatedItem);
      toast.success(`${item.ticker} — ${t.corporateEvents.successMessage}`);
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["corporateEvents"] });
    } catch (err: any) {
      console.error("[usePortfolioCorporateEvents] applyEvent error:", err);
      toast.error(err?.message || t.authModal.error);
    } finally {
      setApplyingEventId(null);
    }
  };

  return {
    pendingEvents,
    count: pendingEvents.length,
    isLoading,
    isError,
    applyingEventId,
    applyEvent,
    refetch,
  };
}
