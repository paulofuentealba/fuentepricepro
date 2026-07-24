import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { useAuthModal } from "@/lib/auth-modal";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";

export function GuestWarningBanner() {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { t } = useI18n();

  if (user) return null;

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 p-2 sm:p-3 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium z-40 relative">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 shrink-0" />
        <span>
          <strong>{t.guestBanner.messagePart1}</strong> {t.guestBanner.messagePart2}
        </span>
      </div>
      <Button
        variant="link"
        className="h-auto p-0 font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 underline underline-offset-2"
        onClick={() => openAuthModal()}
      >
        {t.guestBanner.cta}
      </Button>
    </div>
  );
}
