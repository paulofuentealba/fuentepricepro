import { useEffect, useMemo } from "react";
import type React from "react";
import {
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Bell,
  CalendarCheck,
  FileText,
  TrendingUp,
  Search,
  Clock,
  Target,
  Home,
} from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n-provider";
import { useUserSettings } from "@/lib/useUserSettings";
import { useRealizedIncomeSummary } from "@/lib/useRealizedIncomeSummary";
import { useLastSeen } from "@/lib/useLastSeen";
import { formatNumber } from "@/lib/formatters";

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  disabled?: boolean;
  badge?: string | number;
  /** Small unread-style dot (no count), e.g. "new fiscal data since your last visit". */
  dot?: boolean;
  /** Require an exact pathname match instead of the default startsWith() prefix check — needed
   * for a shorter path (e.g. "/app/") that would otherwise also match every nested route. */
  exact?: boolean;
}

/** Shared active-state check for both Sidebar and Header's mobile menu (same NavItem, same
 * rule): prefix match by default, exact match when the item opts in via `exact`. */
export function isNavItemActive(pathname: string, item: Pick<NavItem, "path" | "exact">): boolean {
  if (!item.path) return false;
  if (!item.exact) return pathname.startsWith(item.path);
  return pathname === item.path || pathname === item.path.replace(/\/$/, "");
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Single source of truth for the app's primary navigation (Decide / Track / Analyze), including
 * dynamic badges and "unread" dots. Consumed by both the desktop Sidebar and the mobile menu in
 * Header — previously the mobile menu hardcoded its own stale item list that drifted out of sync
 * with Sidebar's (AGENTS.md Rule 1: reusability, single source of truth).
 */
export function useNavSections(): { sections: NavSection[] } {
  const { t, locale } = useI18n();
  const { settings } = useUserSettings();
  const currency = settings?.displayCurrency || "BRL";
  const { summary, events } = useRealizedIncomeSummary(currency);
  const location = useLocation();

  // Compact pill badge — no space, no decimals (matches the prototype's "R$1.130"), unlike the
  // full formatCurrency used elsewhere for real money figures. Falls back to the same default
  // amount as the Reinvest screen itself (src/routes/app/reinvestir.tsx) so the badge never goes
  // blank when nothing was paid yet this calendar month.
  const reinvestAmount =
    summary?.currentMonth && summary.currentMonth > 0 ? summary.currentMonth : 1000;
  const reinvestBadge = `${currency === "USD" ? "US$" : "R$"}${formatNumber(reinvestAmount, locale, 0)}`;

  // "What has changed" badge and "Fiscal reality" dot — both derived from real realized-income
  // events (never a fake/hardcoded count), gated by a per-viewer localStorage "last seen"
  // timestamp so they clear once the user actually opens the corresponding page.
  const { lastSeen: lastSeenNews, isMounted: newsMounted, markSeenNow: markNewsSeen } =
    useLastSeen("news");
  const { lastSeen: lastSeenTax, isMounted: taxMounted, markSeenNow: markTaxSeen } =
    useLastSeen("tax");

  const startOfCurrentMonthISO = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }, []);

  const whatChangedCount = useMemo(() => {
    if (!newsMounted) return 0;
    const since = lastSeenNews ?? startOfCurrentMonthISO;
    return (events ?? []).filter(
      (e) => e.isPaid && e.paymentDate && `${e.paymentDate}T00:00:00.000Z` > since,
    ).length;
  }, [events, lastSeenNews, newsMounted, startOfCurrentMonthISO]);

  const hasNewFiscalData = taxMounted && (!lastSeenTax || lastSeenTax < startOfCurrentMonthISO);

  useEffect(() => {
    if (location.pathname.startsWith("/app/news")) markNewsSeen();
    if (location.pathname.startsWith("/app/tax")) markTaxSeen();
  }, [location.pathname, markNewsSeen, markTaxSeen]);

  const sections: NavSection[] = useMemo(
    () => [
      {
        title: t.nav.sections.decide,
        items: [
          {
            key: "reinvestir",
            label: t.nav.reinvest,
            path: "/app/reinvestir",
            icon: RotateCcw,
            disabled: false,
            badge: reinvestBadge,
          },
          {
            key: "plano-aporte",
            label: t.nav.contributionPlan,
            path: "/app/contributionplan",
            icon: ArrowUp,
            disabled: false,
          },
          {
            key: "retirar",
            label: t.nav.withdraw,
            path: "/app/withdraw",
            icon: ArrowDown,
            disabled: false,
          },
          {
            key: "metas",
            label: t.nav.goals,
            path: "/app/goals",
            icon: Target,
            disabled: false,
          },
        ],
      },
      {
        title: t.nav.sections.track,
        items: [
          {
            key: "o-que-mudou",
            label: t.nav.whatChanged,
            path: "/app/news",
            icon: Bell,
            disabled: false,
            badge: whatChangedCount > 0 ? whatChangedCount : undefined,
          },
          {
            key: "renda-garantida",
            label: t.nav.guaranteedIncome,
            path: "/app/income",
            icon: CalendarCheck,
            disabled: false,
          },
          {
            key: "realidade-fiscal",
            label: t.nav.taxReality,
            icon: FileText,
            path: "/app/tax",
            disabled: false,
            dot: hasNewFiscalData,
          },
        ],
      },
      {
        title: t.nav.sections.analyze,
        items: [
          {
            key: "independencia-financeira",
            label: t.nav.dashboard,
            path: "/app/",
            icon: Home,
            disabled: false,
            exact: true,
          },
          {
            key: "minha-carteira",
            label: t.nav.myPortfolio,
            path: "/app/myportfolio",
            icon: TrendingUp,
            disabled: false,
          },
          {
            key: "explorar-ativos",
            label: t.nav.exploreAssets,
            path: "/app/explore",
            icon: Search,
            disabled: false,
          },
          {
            key: "auditoria",
            label: t.nav.audit,
            path: "/app/audit",
            icon: Clock,
            disabled: false,
          },
        ],
      },
    ],
    [t, reinvestBadge, whatChangedCount, hasNewFiscalData],
  );

  return { sections };
}
