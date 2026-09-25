import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useMarketScope } from "@/lib/useMarketScope";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useTransactions } from "@/lib/transactions";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { useHorizonteTrajectory } from "@/lib/horizonteTrajectory";
import { useLastSeen } from "@/lib/useLastSeen";
import { buildConfirmedUpcoming } from "@/lib/incomeGuaranteed";
import { buildNewsFeed, type NewsFeedItem } from "@/lib/news/newsFeedLogic";
import { NewsKpiGrid } from "@/components/news/NewsKpiGrid";
import { NewsFeedCard } from "@/components/news/NewsFeedCard";
import { NewsDigestModal } from "@/components/news/NewsDigestModal";
import { ThesisSnapshotModal } from "@/components/transactions/ThesisSnapshotModal";
import { Button } from "@/components/ui/button";
import type { ThesisSnapshot } from "@/lib/transactions";

export const Route = createFileRoute("/app/news")({
  head: () => ({
    meta: [{ title: "O Que Mudou | Fuente Price Pro" }],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { currency } = useMarketScope();

  // SSOT domain hooks
  const { valuedItems, totals, fx } = useValuedPortfolio();
  const usdRate = fx?.USDBRL || 5.5;
  const { transactions } = useTransactions();
  const { events } = useRealizedIncomeSummary(currency);
  const { points: trajectoryPoints } = useHorizonteTrajectory();
  const { lastSeen, isMounted, markSeenNow } = useLastSeen("news");

  // Keep initial last-seen snapshot for the eyebrow header before marking as seen
  const initialLastSeenRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  if (!hasInitializedRef.current && isMounted) {
    initialLastSeenRef.current = lastSeen;
    hasInitializedRef.current = true;
  }

  // Clear unread badge in navigation upon visiting
  useEffect(() => {
    if (isMounted) {
      markSeenNow();
    }
  }, [isMounted, markSeenNow]);

  // Modals state
  const [digestModalOpen, setDigestModalOpen] = useState(false);
  const [thesisModalState, setThesisModalState] = useState<{
    open: boolean;
    snapshot: ThesisSnapshot | null;
    ticker: string;
  }>({
    open: false,
    snapshot: null,
    ticker: "",
  });

  // Confirmed upcoming dividends (announced within 60 days)
  const confirmedUpcoming = useMemo(() => {
    return buildConfirmedUpcoming(events ?? []);
  }, [events]);

  // Pure feed calculation (AGENTS.md Rule 4)
  const { kpis, items, daysSinceLastVisit } = useMemo(() => {
    const currentTotal =
      currency === "USD" ? totals.usdWorth : totals.brlWorth;

    return buildNewsFeed({
      valuedItems,
      transactions,
      confirmedUpcoming,
      trajectoryPoints,
      currentTotalValue: currentTotal,
      displayCurrency: currency,
      usdRate,
      lastSeenNews: initialLastSeenRef.current,
    });
  }, [
    valuedItems,
    transactions,
    confirmedUpcoming,
    trajectoryPoints,
    totals.usdWorth,
    totals.brlWorth,
    currency,
    usdRate,
  ]);

  // Eyebrow string
  const eyebrowText = useMemo(() => {
    const prefix = t.newsScreen.eyebrowPrefix;
    if (daysSinceLastVisit === null || daysSinceLastVisit === 0) {
      return `${prefix} ${t.newsScreen.eyebrowToday}`;
    }
    if (daysSinceLastVisit === 1) {
      return `${prefix} ${t.newsScreen.eyebrowDayAgo}`;
    }
    return `${prefix} ${t.newsScreen.eyebrowDaysAgo.replace(
      "{{days}}",
      String(daysSinceLastVisit),
    )}`;
  }, [daysSinceLastVisit, t.newsScreen]);

  // Handle CTA clicks
  const handleActionClick = (item: NewsFeedItem) => {
    switch (item.actionType) {
      case "income":
      case "guaranteed":
        navigate({ to: "/app/income" });
        break;
      case "reinvest":
        navigate({ to: "/app/reinvestir" });
        break;
      case "thesis_modal":
        if (item.metadata?.thesisSnapshot) {
          setThesisModalState({
            open: true,
            snapshot: item.metadata.thesisSnapshot,
            ticker: item.ticker,
          });
        } else {
          // If no purchase snapshot was captured, open myportfolio to inspect asset
          navigate({ to: "/app/myportfolio" });
        }
        break;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
            {eyebrowText}
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight text-foreground mt-0.5">
            {t.newsScreen.title}
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="self-start sm:self-auto gap-2 border-border/80 text-foreground hover:bg-muted/30"
          onClick={() => setDigestModalOpen(true)}
        >
          <Mail className="h-3.5 w-3.5 text-accent-text" />
          <span>{t.newsScreen.receiveByEmail}</span>
        </Button>
      </div>

      {/* 4 KPIs Grid */}
      <NewsKpiGrid kpis={kpis} currency={currency} />

      {/* Main Feed Card */}
      <NewsFeedCard items={items} onActionClick={handleActionClick} />

      {/* Modals */}
      <NewsDigestModal
        open={digestModalOpen}
        onClose={() => setDigestModalOpen(false)}
      />

      <ThesisSnapshotModal
        open={thesisModalState.open}
        snapshot={thesisModalState.snapshot}
        ticker={thesisModalState.ticker}
        currency={currency}
        onClose={() =>
          setThesisModalState((prev) => ({ ...prev, open: false }))
        }
      />
    </div>
  );
}
