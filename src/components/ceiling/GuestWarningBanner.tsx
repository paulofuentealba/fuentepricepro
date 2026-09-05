import { Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { startDemoMode } from "@/lib/demoMode";

/**
 * /app now requires auth or an active "See demo" session (see routes/app.tsx
 * beforeLoad) — so `!user` here only ever means demo mode. Copy reflects
 * that explicitly instead of the old generic "guest" framing.
 */
export function GuestWarningBanner() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locale, t } = useI18n();

  if (loading || user) return null;

  function handleReloadDemo() {
    startDemoMode();
    queryClient.invalidateQueries();
    toast.success(t.demoBanner.toastReloadSuccess);
  }

  return (
    <div className="w-full bg-warning/15 border-b border-warning/30 text-warning p-2 sm:p-3 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium z-40 relative">
      <div className="flex items-center gap-2 text-center sm:text-left">
        <Sparkles className="h-5 w-5 shrink-0" />
        <span>
          <strong>{t.demoBanner.message}</strong>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleReloadDemo}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold bg-warning/20 hover:bg-warning/30 text-warning transition-colors border border-warning/40"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.demoBanner.reloadDemo}
        </button>
        <Button
          variant="link"
          className="h-auto p-0 font-bold text-warning hover:text-warning/80 underline underline-offset-2"
          onClick={() => navigate({ to: "/auth", search: { returnTo: "/app" } })}
        >
          {t.demoBanner.cta}
        </Button>
      </div>
    </div>
  );
}
