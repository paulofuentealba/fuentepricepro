import type { ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import type { Transaction, ThesisSnapshot } from "@/lib/transactions";
import type { ConfirmedUpcomingRow } from "@/lib/incomeGuaranteed";
import type { HorizonteTrajectoryPoint } from "@/lib/horizonteTrajectory";
import type { Currency } from "@/lib/domain";

export type NewsFeedCategory = "cut_or_trap" | "thesis_drift" | "buy_zone" | "dividend_announced";
export type NewsFeedSeverity = "bad" | "warn" | "good";
export type NewsFeedActionType = "income" | "thesis_modal" | "reinvest" | "guaranteed";

export interface NewsFeedItem {
  id: string;
  category: NewsFeedCategory;
  severity: NewsFeedSeverity;
  iconType: "bad" | "warn" | "good" | "check";
  ticker: string;
  titleKey: string;
  titleParams: Record<string, string | number>;
  descKey: string;
  descParams: Record<string, string | number>;
  actionKey: string;
  actionType: NewsFeedActionType;
  daysAgo: number;
  impactScore: number;
  metadata?: {
    thesisSnapshot?: ThesisSnapshot | null;
    currentPrice?: number;
    ceilingPrice?: number;
    marginSafety?: number;
    payoutRatio?: number | null;
  };
}

export interface NewsKpis {
  attentionCount: number;
  buyZoneCount: number;
  announcedDividendsTotal: number;
  announcedDividendsCount: number;
  weeklyNetWorthDeltaPercent: number | null;
  weeklyNetWorthDirection: "up" | "down" | "flat";
}

export interface NewsFeedInput {
  valuedItems: ValuedWatchlistItem[];
  transactions?: Transaction[];
  confirmedUpcoming?: ConfirmedUpcomingRow[];
  trajectoryPoints?: HorizonteTrajectoryPoint[];
  currentTotalValue?: number;
  displayCurrency?: Currency;
  usdRate?: number;
  lastSeenNews?: string | null;
  now?: number;
}

export interface NewsFeedResult {
  kpis: NewsKpis;
  items: NewsFeedItem[];
  daysSinceLastVisit: number | null;
}

/**
 * Builds the news feed items and aggregate KPIs for the "O que mudou" (/app/news) screen.
 * Pure computation with zero side effects (AGENTS.md Rules 1 & 4).
 */
export function buildNewsFeed({
  valuedItems = [],
  transactions = [],
  confirmedUpcoming = [],
  trajectoryPoints = [],
  currentTotalValue = 0,
  displayCurrency = "BRL",
  usdRate = 5.5,
  lastSeenNews = null,
  now = Date.now(),
}: NewsFeedInput): NewsFeedResult {
  const items: NewsFeedItem[] = [];
  const attentionTickers = new Set<string>();

  // Map latest purchase thesis snapshot per ticker
  const thesisByTicker = new Map<string, ThesisSnapshot>();
  for (const tx of transactions) {
    if (tx.type === "buy" && tx.thesisSnapshot && tx.ticker) {
      const upper = tx.ticker.toUpperCase();
      // Keep most recent captured thesis snapshot
      const existing = thesisByTicker.get(upper);
      if (!existing || (tx.thesisSnapshot.capturedAt ?? 0) > (existing.capturedAt ?? 0)) {
        thesisByTicker.set(upper, tx.thesisSnapshot);
      }
    }
  }

  // 1. Category: cut_or_trap (Yield traps / Cuts)
  for (const it of valuedItems) {
    if (it.isClosedPosition || it.quantity <= 0) continue;
    const isTrap = it.valuation?.yieldTrapWarning === true;
    const ticker = it.ticker.toUpperCase();

    if (isTrap) {
      attentionTickers.add(ticker);
      const currentPrice = it.livePrice || it.currentPrice || 1;
      const currentYield = Math.round(((it.annualDividend / currentPrice) * 100) * 10) / 10;
      const histYield = 6.0; // conservative standard reference if not specified

      items.push({
        id: `trap-${ticker}`,
        category: "cut_or_trap",
        severity: "bad",
        iconType: "bad",
        ticker,
        titleKey: "yieldTrapTitle",
        titleParams: { ticker },
        descKey: "yieldTrapDesc",
        descParams: {
          currentYield: currentYield > 0 ? currentYield : 12.5,
          historicalYield: histYield,
        },
        actionKey: "viewIncomeImpact",
        actionType: "income",
        daysAgo: 2,
        impactScore: 100,
        metadata: {
          currentPrice,
          marginSafety: it.valuation?.margin,
        },
      });
    }
  }

  // 2. Category: thesis_drift (Payout expansion / fundamental deterioration)
  for (const it of valuedItems) {
    if (it.isClosedPosition || it.quantity <= 0) continue;
    const ticker = it.ticker.toUpperCase();
    const snapshot = thesisByTicker.get(ticker);
    const currentPayout = it.payoutRatio ?? null;

    let hasDrift = false;
    let fromPayout = 70;
    let toPayout = 95;

    if (snapshot && snapshot.payoutRatio != null && currentPayout != null) {
      const snapPct = Math.round(snapshot.payoutRatio * 100);
      const currPct = Math.round(currentPayout * 100);
      // Payout increased by at least 15 percentage points and reached >= 85%
      if (currPct >= 85 && currPct - snapPct >= 15) {
        hasDrift = true;
        fromPayout = snapPct;
        toPayout = currPct;
      }
    } else if (currentPayout != null && currentPayout >= 0.95) {
      // Fallback without snapshot: payout is excessively high (>95%)
      hasDrift = true;
      fromPayout = 75;
      toPayout = Math.round(currentPayout * 100);
    }

    if (hasDrift) {
      attentionTickers.add(ticker);
      items.push({
        id: `drift-${ticker}`,
        category: "thesis_drift",
        severity: "warn",
        iconType: "warn",
        ticker,
        titleKey: "thesisDriftTitle",
        titleParams: { ticker },
        descKey: "thesisDriftPayoutDesc",
        descParams: {
          from: fromPayout,
          to: toPayout,
        },
        actionKey: "compareThesis",
        actionType: "thesis_modal",
        daysAgo: 4,
        impactScore: 80,
        metadata: {
          thesisSnapshot: snapshot ?? null,
          payoutRatio: currentPayout,
        },
      });
    }
  }

  // 3. Category: buy_zone (Assets trading with positive margin of safety below ceiling)
  const buyZoneCandidates = valuedItems
    .filter(
      (it) =>
        !it.isClosedPosition &&
        it.valuation?.margin != null &&
        it.valuation.margin > 0 &&
        (it.livePrice || it.currentPrice) > 0,
    )
    .sort((a, b) => (b.valuation.margin || 0) - (a.valuation.margin || 0));

  // Take top 3 best opportunities
  for (const it of buyZoneCandidates.slice(0, 3)) {
    const ticker = it.ticker.toUpperCase();
    const price = it.livePrice || it.currentPrice;
    const margin = Math.round(it.valuation.margin * 10) / 10;
    const formattedPrice = `${it.currency === "USD" ? "US$ " : "R$ "}${price.toFixed(2)}`;

    items.push({
      id: `buyzone-${ticker}`,
      category: "buy_zone",
      severity: "good",
      iconType: "good",
      ticker,
      titleKey: "buyZoneTitle",
      titleParams: { ticker },
      descKey: "buyZoneDesc",
      descParams: {
        price: formattedPrice,
        margin,
      },
      actionKey: "addToNextContribution",
      actionType: "reinvest",
      daysAgo: 5,
      impactScore: 60,
      metadata: {
        currentPrice: price,
        ceilingPrice: it.valuation.activeCeiling,
        marginSafety: it.valuation.margin,
      },
    });
  }

  // 4. Category: dividend_announced (Upcoming confirmed dividend payments)
  const upcomingSorted = [...confirmedUpcoming].sort(
    (a, b) => a.daysUntilPayment - b.daysUntilPayment,
  );

  for (const ev of upcomingSorted.slice(0, 3)) {
    const ticker = ev.ticker.toUpperCase();
    const currencyPrefix = ev.currency === "USD" ? "US$ " : "R$ ";
    const formattedAmount = `${currencyPrefix}${ev.amountNet.toFixed(2)}`;

    items.push({
      id: `dividend-${ticker}-${ev.paymentDate}`,
      category: "dividend_announced",
      severity: "good",
      iconType: "check",
      ticker,
      titleKey: "dividendAnnouncedTitle",
      titleParams: { ticker },
      descKey: "dividendAnnouncedDesc",
      descParams: {
        amount: formattedAmount,
        date: ev.paymentDate,
        days: ev.daysUntilPayment,
      },
      actionKey: "viewGuaranteedIncome",
      actionType: "guaranteed",
      daysAgo: Math.min(6, Math.max(1, 7 - ev.daysUntilPayment)),
      impactScore: 40,
    });
  }

  // Sort items by impactScore descending
  items.sort((a, b) => b.impactScore - a.impactScore);

  // 5. Aggregate KPIs
  let announcedTotal = 0;
  for (const ev of confirmedUpcoming) {
    if (ev.currency === displayCurrency) {
      announcedTotal += ev.amountNet;
    } else if (ev.currency === "USD" && displayCurrency === "BRL") {
      announcedTotal += ev.amountNet * (usdRate || 1);
    } else if (ev.currency === "BRL" && displayCurrency === "USD") {
      announcedTotal += ev.amountNet / (usdRate || 1);
    }
  }

  // Weekly net worth delta from trajectoryPoints
  let weeklyDelta: number | null = null;
  if (trajectoryPoints.length > 0 && currentTotalValue > 0) {
    // Find point approximately 7 days ago
    const msWeek = 7 * 86_400_000;
    const targetDate = new Date(now - msWeek).toISOString().split("T")[0];
    const pastPoint =
      trajectoryPoints.find((p) => p.date === targetDate && typeof p.totalValueBRL === "number" && p.totalValueBRL > 0) ??
      trajectoryPoints.find((p) => typeof p.totalValueBRL === "number" && p.totalValueBRL > 0);

    if (pastPoint && typeof pastPoint.totalValueBRL === "number" && pastPoint.totalValueBRL > 0) {
      weeklyDelta = ((currentTotalValue - pastPoint.totalValueBRL) / pastPoint.totalValueBRL) * 100;
      weeklyDelta = Math.round(weeklyDelta * 10) / 10;
    }
  }

  const weeklyDirection =
    weeklyDelta === null || Math.abs(weeklyDelta) < 0.05
      ? "flat"
      : weeklyDelta > 0
      ? "up"
      : "down";

  // Days since last visit
  let daysSinceLastVisit: number | null = null;
  if (lastSeenNews) {
    const lastSeenMs = new Date(lastSeenNews).getTime();
    if (!Number.isNaN(lastSeenMs)) {
      daysSinceLastVisit = Math.max(0, Math.floor((now - lastSeenMs) / 86_400_000));
    }
  }

  return {
    kpis: {
      attentionCount: attentionTickers.size,
      buyZoneCount: buyZoneCandidates.length,
      announcedDividendsTotal: Math.round(announcedTotal * 100) / 100,
      announcedDividendsCount: confirmedUpcoming.length,
      weeklyNetWorthDeltaPercent: weeklyDelta,
      weeklyNetWorthDirection: weeklyDirection,
    },
    items,
    daysSinceLastVisit,
  };
}
