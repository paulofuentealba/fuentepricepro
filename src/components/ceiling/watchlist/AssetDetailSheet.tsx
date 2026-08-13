import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AssetCard } from "@/components/shared/AssetCard";
import { ResultSkeleton } from "@/components/ceiling/ResultSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { assetQueryOptions } from "@/lib/queryOptions";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useI18n } from "@/lib/i18n-provider";
import { Info, Calendar as CalendarIcon, ChevronDown, Pencil, Scissors } from "lucide-react";
import { useAssetCardDerived } from "./assetCard/useAssetCardDerived";
import { AssetCardFinancials } from "./assetCard/AssetCardFinancials";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { DividendsHistoryPanel } from "./DividendsHistoryPanel";
import { IndicatorGrid } from "@/components/ceiling/IndicatorGrid";
import { DividendHistoryChart } from "@/components/ceiling/result/DividendHistoryChart";

import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { formatCurrency, displayTicker, toIntlLocale } from "@/lib/i18n";

import { getAssetValuation } from "@/lib/calculations";
import { useSelic } from "@/lib/useSelic";
import { ConsensusPyramid } from "./ConsensusPyramid";
import { FixedIncomePanel } from "./FixedIncomePanel";
import { TransactionsPanel } from "./TransactionsPanel";
import { InvestingSinceField } from "../shared/InvestingSinceField";
import { useTransactions } from "@/lib/transactions";
import { EditPositionFields } from "./EditPositionFields";
import { CorporateEventFields } from "@/components/portfolio/CorporateEventFields";
import { usePendingEvents } from "@/lib/corporateEvents";

function WowInsights({
  item,
  asset,
  valuation,
}: {
  item: WatchlistItem;
  asset?: any;
  valuation: ReturnType<typeof getAssetValuation>;
}) {
  const { t, locale } = useI18n();

  const margin = valuation.margin;
  const marginStr = Math.abs(margin).toFixed(1);
  const isImplausibleMargin = margin > 100 || !Number.isFinite(margin);
  const isBargain = margin > 10;
  const isFair = margin >= 0 && margin <= 10;

  let insightText = "";
  let badgeColor = "";
  let iconColor = "";
  if (isImplausibleMargin) {
    insightText = t.result.insights.dataInsufficient;
    badgeColor = "bg-muted/30 border-border/50";
    iconColor = "text-muted-foreground";
  } else if (isBargain) {
    insightText = t.result.insights.bargain.replace("{{margin}}", marginStr);
    badgeColor = "bg-success/5 border-success/20";
    iconColor = "text-success";
  } else if (isFair) {
    insightText = t.result.insights.fair.replace("{{margin}}", marginStr);
    badgeColor = "bg-warning/5 border-warning/20";
    iconColor = "text-warning";
  } else {
    insightText = t.result.insights.overvalued.replace("{{margin}}", marginStr);
    badgeColor = "bg-danger/5 border-danger/20";
    iconColor = "text-danger";
  }

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  let nextPayment = null;
  if (item.paymentMonths && item.paymentMonths.length > 0) {
    const sorted = [...item.paymentMonths].sort((a, b) => a - b);
    nextPayment = sorted.find((m) => m >= currentMonth) || sorted[0];
  }

  let monthName = "";
  if (nextPayment) {
    const date = new Date(2024, nextPayment - 1, 1);
    monthName = new Intl.DateTimeFormat(toIntlLocale(locale), {
      month: "long",
    }).format(date);
    // Capitalize first letter
    monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <div className={`flex flex-col gap-2 rounded-lg border p-4 ${badgeColor}`}>
        <div className={`flex items-center gap-2 font-semibold ${iconColor}`}>
          <Info className="h-4 w-4" />
          <span className="text-foreground">{t.result.insights.title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{insightText}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex items-center gap-2 font-semibold text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span>{t.result.insights.nextPayment}</span>
        </div>
        <p className="text-sm font-medium">
          {nextPayment
            ? t.result.insights.predictedMonth.replace("{{month}}", monthName)
            : t.result.insights.noPaymentData}
        </p>
      </div>
    </div>
  );
}

function AssetHoldings({ item, activeMargin }: { item: WatchlistItem; activeMargin: number }) {
  const { t } = useI18n();
  const { update } = useWatchlist();
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
              if (firstTransactionDate == null) {
                update(item.id, { investingSince: newDate.getTime() });
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
      trigger.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
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
}

export function AssetDetailSheet({
  item,
  onClose,
  hidePlayground,
  hideGoalPlanner,
  hidePositionTabs,
  initialTab,
}: AssetDetailSheetProps) {
  const { t, locale } = useI18n();
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

  return (
    <Sheet open={item != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        closeLabel={t.common.close}
        side="right"
        className="w-full overflow-y-auto border-border/50 bg-background/95 backdrop-blur-xl p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-4">
          <SheetTitle className="text-base font-semibold">{displayTickerStr}</SheetTitle>
          {item?.currency === "USD" && fx?.USDBRL && (
            <p className="text-sm text-muted-foreground mt-1">
              ~{" "}
              {formatCurrency(
                (asset?.currentPrice ?? item.currentPrice) * fx.USDBRL,
                "BRL",
                locale,
              )}{" "}
              (converted)
            </p>
          )}
        </SheetHeader>
        <div className="p-4 sm:p-6">
          {loading && <ResultSkeleton />}
          {!loading && error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
              {error}
            </div>
          )}
          {!loading && asset && item && valuation && (
            <ErrorBoundary label="asset_detail_sheet">
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
                  <TabsTrigger value="highlights" className="shrink-0 text-xs sm:text-sm px-3 py-1.5">{t.watchlist.tabs.highlights}</TabsTrigger>
                  {!hidePositionTabs && (
                    <TabsTrigger value="myPosition" className="shrink-0 text-xs sm:text-sm px-3 py-1.5">{t.watchlist.tabs.myPosition}</TabsTrigger>
                  )}
                  {item.type !== "FIXED_INCOME" && !hidePositionTabs && (
                    <TabsTrigger value="transactions" className="shrink-0 text-xs sm:text-sm px-3 py-1.5">{t.watchlist.tabs.transactions}</TabsTrigger>
                  )}
                  {item.type !== "FIXED_INCOME" && (
                    <TabsTrigger value="dividends" className="shrink-0 text-xs sm:text-sm px-3 py-1.5">{t.watchlist.tabs.dividends}</TabsTrigger>
                  )}
                </ScrollableTabsList>

                <TabsContent value="highlights" className="space-y-6 mt-0">
                  {item.type !== "FIXED_INCOME" ? (
                    <>
                      <WowInsights item={item} asset={asset} valuation={valuation} />
                      <ConsensusPyramid valuation={valuation} currency={asset.currency} />
                      <IndicatorGrid asset={asset} />
                      {(asset.dividendHistory ?? []).filter((p: any) => p.amount > 0).length > 1 && (
                        <DividendHistoryChart
                          data={asset.dividendHistory}
                          currency={asset.currency}
                          locale={locale}
                          title={t.result.dividendHistory}
                        />
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-border/50 bg-background/50">
                      <p className="text-sm text-muted-foreground">{t.watchlist.highlightsNotApplicableFI}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="myPosition" className="space-y-6 mt-0">
                  {!hidePositionTabs && (
                    <>
                      <AssetHoldings item={item} activeMargin={valuation.margin} />
                      {item.type === "FIXED_INCOME" && (
                        <FixedIncomePanel item={item} />
                      )}

                      <div className="space-y-3">
                        <MyPositionSection
                          title={t.watchlist.updateTitle}
                          icon={<Pencil className="h-4 w-4 text-muted-foreground" />}
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
                    </>
                  )}
                </TabsContent>

                {item.type !== "FIXED_INCOME" && !hidePositionTabs && (
                  <TabsContent value="transactions" className="space-y-6 mt-0">
                    <TransactionsPanel item={item} />
                  </TabsContent>
                )}

                {item.type !== "FIXED_INCOME" && (
                  <TabsContent value="dividends" className="space-y-6 mt-0">
                    <DividendsHistoryPanel
                      item={item}
                      events={asset.dividendEvents ?? []}
                      currency={asset.currency}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </ErrorBoundary>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
