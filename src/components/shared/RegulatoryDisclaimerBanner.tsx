import { useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n-provider";

/**
 * Persistent regulatory (CVM-oriented) disclaimer, shown as a discreet
 * informational footer — not a dismissible/error-style alert — on every
 * screen that performs a calculation or projection.
 *
 * Item 74 of the SSOT: this is the "always visible in the tool" companion
 * to the equivalent clause already living in the full Terms of Use
 * (`/terms`, clause 3, "This is NOT investment advice"). Both coexist —
 * this banner must never replace or reword that clause, only echo it in a
 * compact, persistent form. Unlike the cookie consent banner (item 73),
 * this is not opt-in/closeable: it is a standing regulatory notice.
 *
 * Centralized here (rendered once from the `/app` layout) rather than
 * duplicated across the 6 calculation screens, gated by an explicit
 * allow-list of route pathnames so it never leaks into administrative
 * routes (Settings, /privacy, /terms) where the full clause already lives.
 */
const DISCLAIMER_ROUTES = [
  "/app/screener",
  "/app/myportfolio",
  "/app/comparator",
  "/app/cashflow",
  "/app/smartallocation",
  "/app/snowballeffectsimulator",
];

export function RegulatoryDisclaimerBanner() {
  const { t } = useI18n();
  const location = useLocation();

  const isDisclaimerRoute = DISCLAIMER_ROUTES.some(
    (route) => location.pathname === route || location.pathname.startsWith(`${route}/`),
  );

  if (!isDisclaimerRoute) return null;

  return (
    <div
      role="note"
      aria-label={t.regulatoryDisclaimer.message}
      className="border-t border-border/60 bg-muted/30 px-4 py-2 sm:px-6"
    >
      <p className="mx-auto max-w-6xl text-center text-[11px] leading-relaxed text-muted-foreground">
        {t.regulatoryDisclaimer.message}
      </p>
    </div>
  );
}
