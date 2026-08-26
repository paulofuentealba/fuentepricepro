import { useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n-provider";
import { resolveDisclaimerText, type RegulatoryDisclaimerVariant } from "@/lib/disclaimer";
import { cn } from "@/lib/utils";

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
 * Centralized here (rendered once from the `/app` layout) with a
 * secure-by-default policy: all authenticated application routes under `/app`
 * render the disclaimer by default, while strictly informational routes
 * (e.g. `/app/docs`) or administrative routes outside `/app` are excluded.
 */
export const EXCLUDED_APP_ROUTES = [
  "/app/docs",
];

export interface RegulatoryDisclaimerBannerProps {
  variant?: RegulatoryDisclaimerVariant;
  className?: string;
  forceShow?: boolean;
}

export function RegulatoryDisclaimerBanner({
  variant = "calculation",
  className,
  forceShow = false,
}: RegulatoryDisclaimerBannerProps = {}) {
  const { t } = useI18n();
  const location = useLocation();

  const isAppRoute =
    location.pathname === "/app" || location.pathname.startsWith("/app/");

  const isExcluded =
    !isAppRoute ||
    EXCLUDED_APP_ROUTES.some(
      (route) => location.pathname === route || location.pathname.startsWith(`${route}/`),
    );

  if (!forceShow && isExcluded) return null;

  const disclaimerText = resolveDisclaimerText(t, variant);

  return (
    <div
      role="note"
      aria-label={disclaimerText}
      className={cn("border-t border-border/60 bg-muted/30 px-4 py-2 sm:px-6", className)}
    >
      <p className="mx-auto max-w-6xl text-center text-[11px] leading-relaxed text-muted-foreground">
        {disclaimerText}
      </p>
    </div>
  );
}

