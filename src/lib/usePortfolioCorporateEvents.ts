import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWatchlist, type WatchlistItem } from "./watchlist";
import { useTransactions } from "./transactions";
import { useI18n } from "./i18n-provider";
import {
  applyCorporateEvent,
  getHoldingAcquisitionDate,
  type ProcessedPosition,
} from "./corporateEvents";
import { fetchCorporateEventsBatchFn } from "./apiService.functions";
import type { ReconciledCorporateEvent } from "./api/corporateEventsReconciler.server";
import { toast } from "sonner";

export interface PendingPortfolioEvent {
  event: ReconciledCorporateEvent;
  item: WatchlistItem;
  preview: ProcessedPosition;
  factor: number;
  deltaQuantity: number;
  priceVariationPct: number;
  displayRatioText: string;
}

export function formatRatioDisplay(type: "split" | "grouping", ratio: number): string {
  if (type === "split") {
    const cleanRatio = ratio.toFixed(2).replace(/\.?0+$/, "");
    return `1:${cleanRatio}`;
  } else {
    const inverse = Math.round(1 / ratio);
    return `${inverse}:1`;
  }
}

export function usePortfolioCorporateEvents() {
  const { items, upsertAsync } = useWatchlist();
  const { transactions, upsert: upsertTransaction } = useTransactions();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [applyingEventId, setApplyingEventId] = useState<string | null>(null);

  // Consider only owned assets (quantity > 0)
  const ownedItems = useMemo(
    () => items.filter((it) => typeof it.quantity === "number" && it.quantity > 0),
    [items],
  );

  const tickers = useMemo(
    () => Array.from(new Set(ownedItems.map((it) => it.ticker.trim().toUpperCase()))),
    [ownedItems],
  );

  const queryKey = useMemo(
    () => ["corporateEvents", "batch", tickers.sort().join(",")],
    [tickers],
  );

  const { data: eventsByTicker, isLoading, isError, refetch } = useQuery({
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
      const acquisitionDate = getHoldingAcquisitionDate(item, transactions, item.ticker);

      for (const ev of tickerEvents) {
        if (appliedIds.has(ev.eventId)) continue;

        // Corporate events before asset purchase date are not applicable to the user's holding
        if (acquisitionDate > 0 && ev.date < acquisitionDate) continue;

        const factor = ev.ratio;
        const currentAvgPrice = item.averagePrice ?? item.currentPrice;

        const preview = applyCorporateEvent(
          {
            ticker: item.ticker,
            quantity: item.quantity,
            averagePrice: currentAvgPrice,
          },
          { type: ev.type, factor },
          true,
          item.currentPrice,
        );

        const deltaQuantity = preview.quantity - item.quantity;
        const priceVariationPct =
          currentAvgPrice > 0
            ? ((preview.averagePrice - currentAvgPrice) / currentAvgPrice) * 100
            : 0;

        list.push({
          event: ev,
          item,
          preview,
          factor,
          deltaQuantity,
          priceVariationPct,
          displayRatioText: formatRatioDisplay(ev.type, ev.ratio),
        });
      }
    }

    return list.sort((a, b) => b.event.date - a.event.date);
  }, [eventsByTicker, ownedItems, transactions]);

  const applyEvent = async (pending: PendingPortfolioEvent) => {
    if (applyingEventId) return;
    setApplyingEventId(pending.event.eventId);

    try {
      const { item, event, preview, factor } = pending;
      const newAppliedEvents = [...(item.appliedEvents || [])];

      newAppliedEvents.push({
        eventId: event.eventId,
        date: event.date,
        type: event.type,
        ratio: event.ratio,
      });

      const updatedItem: WatchlistItem = {
        ...item,
        quantity: preview.quantity,
        averagePrice: preview.averagePrice,
        appliedEvents: newAppliedEvents,
      };

      const hasLedger = transactions.some((tx) => tx.ticker === item.ticker);
      if (hasLedger) {
        await upsertTransaction({
          id: `corp-${event.eventId}`,
          ticker: item.ticker,
          type: "corporate_action",
          date: event.date,
          quantity: 0,
          pricePerShare: 0,
          factor,
          notes: t.transactions.corporateAction,
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
