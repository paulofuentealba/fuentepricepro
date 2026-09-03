import { Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";

/**
 * /app now requires auth or an active "See demo" session (see routes/app.tsx
 * beforeLoad) — so `!user` here only ever means demo mode. Copy reflects
 * that explicitly instead of the old generic "guest" framing.
 */
export function GuestWarningBanner() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  if (loading || user) return null;

  return (
    <div className="w-full bg-warning/15 border-b border-warning/30 text-warning p-2 sm:p-3 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium z-40 relative">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 shrink-0" />
        <span>
          <strong>{t.demoBanner.message}</strong>
        </span>
      </div>
      <Button
        variant="link"
        className="h-auto p-0 font-bold text-warning hover:text-warning/80 underline underline-offset-2"
        onClick={() => navigate({ to: "/auth", search: { returnTo: "/app" } })}
      >
        {t.demoBanner.cta}
      </Button>
    </div>
  );
}
