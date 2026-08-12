import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { hasConsentDecision, setCookieConsent } from "@/lib/cookieConsent";

/**
 * Cookie/LGPD consent banner. Unifies the "Banner LGPD" and "Banner de
 * Cookies" SSOT items into a single non-blocking footer banner.
 *
 * - Essential cookies are always active and are not part of this choice.
 * - Analytics cookies are opt-in; the user's decision gates
 *   `hasAnalyticsConsent()` (see `src/lib/cookieConsent.ts`), which future
 *   analytics bootstrap code (e.g. PostHog) should check before running.
 * - Not a modal: it never blocks interaction with the rest of the app.
 */
export function CookieConsentBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasConsentDecision());
  }, []);

  if (!visible) return null;

  const handleChoice = (analytics: boolean) => {
    setCookieConsent(analytics);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label={t.cookieBanner.message}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t.cookieBanner.message}{" "}
          <Link to="/privacy" className="font-medium text-primary hover:underline">
            {t.cookieBanner.privacyLinkLabel}
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => handleChoice(false)}>
            {t.cookieBanner.reject}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => handleChoice(true)}>
            {t.cookieBanner.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
