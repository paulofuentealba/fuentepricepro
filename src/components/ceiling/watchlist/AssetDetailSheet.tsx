import { useMemo, useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ResultSkeleton } from "@/components/ceiling/ResultSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { type WatchlistItem } from "@/lib/watchlist";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useI18n } from "@/lib/i18n-provider";
import { Calendar as CalendarIcon, ChevronDown, Scissors, Target } from "lucide-react";
import { toast } from "sonner";
import { useAssetCardDerived } from "./assetCard/useAssetCardDerived";
import { AssetCardFinancials } from "./assetCard/AssetCardFinancials";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { AssetDeepDiveView } from "@/components/explore/AssetDeepDiveView";

import { exchangeRateQueryOptions, assetQueryOptions, quoteQueryOptions } from "@/lib/queryOptions";
import { formatCurrency, displayTicker, toIntlLocale, formatPercent } from "@/lib/i18n";
import { convertCurrency } from "@/lib/currency";

import { getAssetValuation } from "@/lib/calculations";
import { useSelic } from "@/lib/useSelic";
import { InvestingSinceField } from "../shared/InvestingSinceField";
import { useTransactions } from "@/lib/transactions";
import { EditPositionFields } from "./EditPositionFields";
import { CorporateEventFields } from "@/components/portfolio/CorporateEventFields";
import { usePendingEvents } from "@/lib/corporateEvents";

const DividendsHistoryPanel = lazy(() =>
  import("./DividendsHistoryPanel").then((m) => ({ default: m.DividendsHistoryPanel }))
);
const AssetProjectionPanel = lazy(() =>
  import("./AssetProjectionPanel").then((m) => ({ default: m.AssetProjectionPanel }))
);
const TransactionsPanel = lazy(() =>
  import("./TransactionsPanel").then((m) => ({ default: m.TransactionsPanel }))
);
const FixedIncomePanel = lazy(() =>
  import("./FixedIncomePanel").then((m) => ({ default: m.FixedIncomePanel }))
);


function AssetHoldings({
  item,
  activeMargin,
  onUpdateInvestingSince,
}: {
  item: WatchlistItem;
  activeMargin: number;
  onUpdateInvestingSince?: (id: string, timestamp: number) => Promise<void>;
}) {
  const { t } = useI18n();
  const { transactions } = useTransactions();
  const derived = useAssetCardDerived(item);

  const firstTransactionDate = useMemo(() => {
    const tickerTxs = transactions.filter((tx) => tx.ticker === item.ticker);
    return tickerTxs.length ? Math.min(...tickerTxs.map((tx) => tx.date)) : null;
  }, [transactions, item.ticker]);

  return (
    <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t.tabs.portfolio}
        </h3>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{t.form.investingSince}:</span>
          <InvestingSinceField
            value={item.investingSince ?? item.addedAt}
            onChange={(newDate) => {
              if (firstTransactionDate == null && onUpdateInvestingSince) {
                onUpdateInvestingSince(item.id, newDate.getTime()).catch(() => {
                  toast.error(t.errors.updateAssetFailedPrefix + " / " + t.toasts.assetsUpdateFailed.replace("{{count}}", "1"));
                });
              }
            }}
            firstTransactionDate={firstTransactionDate}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AssetCardFinancials item={item} derived={derived} activeMargin={activeMargin} />
      </div>
    </div>
  );
}

/* ── Collapsible section wrapper used by the "My Position" tab for the
 * Update Holdings / Apply Corporate Event content. ── */
function MyPositionSection({
  title,
  icon,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border/60 bg-background/40">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 p-4 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {icon}
            {title}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/* ── Scrollable Tabs wrapper (mobile: horizontal scroll, desktop: grid) ── */
function ScrollableTabsList({
  children,
  className,
  cols,
}: {
  children: React.ReactNode;
  className?: string;
  cols: 2 | 4;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const trigger = (e.target as HTMLElement).closest("[role='tab']");
    if (trigger) {
      trigger.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, []);

  const gridClass = cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-4";

  return (
    <div className="relative mb-4">
      {/* Left fade indicator */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 rounded-l-lg transition-opacity duration-200",
          "bg-gradient-to-r from-muted to-transparent",
          "sm:hidden",
          canScrollLeft ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Right fade indicator */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 rounded-r-lg transition-opacity duration-200",
          "bg-gradient-to-l from-muted to-transparent",
          "sm:hidden",
          canScrollRight ? "opacity-100" : "opacity-0",
        )}
      />
      <TabsList
        ref={scrollRef as unknown as React.Ref<HTMLDivElement>} // Justification: scrollRef is a HTMLDivElement ref passed to Radix TabsList
        className={cn(
          /* Mobile: single horizontal row, scrollable, no fixed height */
          "flex w-full overflow-x-auto scrollbar-none gap-1 p-1 h-auto",
          /* Desktop (sm+): proper grid, fixed height, no overflow */
          `sm:grid ${gridClass} sm:h-10 sm:overflow-visible`,
          className,
        )}
        onClick={handleClick}
      >
        {children}
      </TabsList>
    </div>
  );
}

interface AssetDetailSheetProps {
  item: ValuedWatchlistItem | null;
  onClose: () => void;
  hidePlayground?: boolean;
  hideGoalPlanner?: boolean;
  /** When true, hides the "My Position" and "Transactions" tabs — used when
   * opening the sheet for a hypothetical/comparison item that isn't a real
   * portfolio holding (e.g. from the Decision Desk / Comparator). */
  hidePositionTabs?: boolean;
  /** When set, the sheet opens directly on the "My Position" tab instead of
   * its usual default (e.g. triggered from the watchlist card's "pending
   * corporate event" badge or from an inline edit affordance). */
  initialTab?: "myPosition";
  onUpdateInvestingSince?: (id: string, timestamp: number) => Promise<void>;
}

export function AssetDetailSheet({
  item,
  onClose,
  hidePlayground,
  hideGoalPlanner,
  hidePositionTabs,
  initialTab,
  onUpdateInvestingSince,
}: AssetDetailSheetProps) {
  const { t, locale } = useI18n();
  const [isAssumptionsSheetOpen, setIsAssumptionsSheetOpen] = useState(false);
  const [isAssumptionsUpdating, setIsAssumptionsUpdating] = useState(false);
  const { data: selic } = useSelic();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const { pendingEvent } = usePendingEvents(item);

  const query = useQuery({
    ...assetQueryOptions(item?.ticker ?? ""),
    enabled: !!item,
  });

  const asset = useMemo(() => {
    if (!query.data || !item) return null;
    return { ...query.data, type: item.type };
  }, [query.data, item]);

  const loading = !!item && query.isPending;
  const error = query.isError ? t.errors.notFound : null;

  const valuation = useMemo(() => {
    if (!item) return null;
    return item.valuation || null;
  }, [item]);

  const displayTickerStr = displayTicker(item?.ticker ?? "");

  const { data: quote } = useQuery({
    ...quoteQueryOptions(item?.ticker ?? ""),
    enabled: !!item && item.type !== "FIXED_INCOME",
  });
  const livePrice = quote?.price ?? item?.currentPrice ?? 0;
  const changePct = quote?.changePct ?? null;
  const changeUp = changePct != null && changePct >= 0;

  return (
    <Sheet open={item != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        closeLabel={t.common.close}
        side="right"
        className="w-full overflow-y-auto border-border/50 bg-background/95 backdrop-blur-xl p-0 sm:max-w-5xl"
      >
        <TooltipProvider delayDuration={150}>
          <SheetHeader className="border-b border-border/60 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <SheetTitle className="text-base font-semibold">{displayTickerStr}</SheetTitle>
                {item && (
                  <span className="text-sm font-semibold text-foreground/90 tabular-nums">
                    {formatCurrency(livePrice, item.currency, locale)}
                  </span>
                )}
                {changePct != null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
                      changeUp ? "text-success" : "text-danger",
                    )}
                  >
                    {changeUp ? "▲ +" : "▼ "}
                    {formatPercent(Math.abs(changePct), locale, 2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {asset?.name ?? item?.name}
              </p>
            </div>
            {item && item.currency === "USD" && fx?.USDBRL && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground tabular-nums">
                  ~ {formatCurrency(convertCurrency(livePrice, "USD", "BRL", fx.USDBRL), "BRL", locale)} ({t.common.converted})
                </p>
              </div>
            )}
          </div>
        </SheetHeader>
        <div className="p-4 sm:p-6">
          {loading && <ResultSkeleton />}
          {!loading && error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
          )}
          {!loading && asset && item && valuation && (
            <Tabs
              key={`${item.id}-${initialTab ?? ""}`}
              defaultValue={
                !hidePositionTabs && (initialTab === "myPosition" || item.type === "FIXED_INCOME")
                  ? "myPosition"
                  : "highlights"
              }
              className="w-full"
            >
              <ScrollableTabsList cols={item.type === "FIXED_INCOME" || hidePositionTabs ? 2 : 4}>
                <TabsTrigger value="highlights" className="shrink-0 text-xs sm:text-sm px-3 py-1.5">
                  {t.tabs?.deepDive || t.watchlist.tabs.highlights}
                </TabsTrigger>
                {!hidePositionTabs && (
                  <TabsTrigger value="myPosition" className="shrink-0 text-xs sm:text-sm px-3 py-1.5">{t.watchlist.tabs.myPosition}</TabsTrigger>
                )}
                {item.type !== "FIXED_INCOME" && (
                  <TabsTrigger value="dividends" className="shrink-0 text-xs sm:text-sm px-3 py-1.5">{t.watchlist.tabs.dividends}</TabsTrigger>
                )}
                {item.type !== "FIXED_INCOME" && (
                  <TabsTrigger value="projection" className="shrink-0 text-xs sm:text-sm px-3 py-1.5">{t.watchlist.tabs.projection}</TabsTrigger>
                )}
              </ScrollableTabsList>

              <TabsContent value="highlights" className="space-y-6 mt-0">
                <ErrorBoundary label="asset_detail_highlights">
                  {item.type !== "FIXED_INCOME" ? (
                    <AssetDeepDiveView
                      initialTicker={item.ticker}
                      mode="modal"
                      onCloseModal={onClose}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-border/50 bg-background/50">
                      <p className="text-sm text-muted-foreground">{t.watchlist.highlightsNotApplicableFI}</p>
                    </div>
                  )}
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="myPosition" className="space-y-6 mt-0">
                <ErrorBoundary label="asset_detail_my_position">
                  {!hidePositionTabs && (
                    <>
                       <AssetHoldings
                         item={item}
                         activeMargin={valuation.margin}
                         onUpdateInvestingSince={onUpdateInvestingSince}
                       />
                      {item.type === "FIXED_INCOME" && (
                        <Suspense fallback={<ResultSkeleton />}>
                          <FixedIncomePanel item={item} />
                        </Suspense>
                      )}

                      <div className="space-y-3">
                        <MyPositionSection
                          title={t.watchlist.goalsAndAssumptions}
                          icon={<Target className="h-4 w-4 text-muted-foreground" />}
                          defaultOpen={true}
                        >
                          <EditPositionFields item={item} />
                        </MyPositionSection>

                        <MyPositionSection
                          title={t.corporateEvents.menuTitle}
                          icon={<Scissors className="h-4 w-4 text-muted-foreground" />}
                          defaultOpen={initialTab === "myPosition" && !!pendingEvent}
                        >
                          <CorporateEventFields item={item} pendingEvent={pendingEvent} />
                        </MyPositionSection>
                      </div>

                      {item.type !== "FIXED_INCOME" && (
                        <div className="pt-2">
                          <Suspense fallback={<ResultSkeleton />}>
                            <TransactionsPanel item={item} />
                          </Suspense>
                        </div>
                      )}
                    </>
                  )}
                </ErrorBoundary>
              </TabsContent>

              {item.type !== "FIXED_INCOME" && (
                <TabsContent value="dividends" className="space-y-6 mt-0">
                  <ErrorBoundary label="asset_detail_dividends">
                    <Suspense fallback={<ResultSkeleton />}>
                      <DividendsHistoryPanel
                        item={item}
                        events={asset.dividendEvents ?? []}
                        currency={asset.currency}
                        asset={asset}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </TabsContent>
              )}

              {item.type !== "FIXED_INCOME" && (
                <TabsContent value="projection" className="space-y-6 mt-0">
                  <ErrorBoundary label="asset_detail_projection">
                    <Suspense fallback={<ResultSkeleton />}>
                      <AssetProjectionPanel
                        item={item}
                        asset={asset}
                        currency={asset.currency}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}
